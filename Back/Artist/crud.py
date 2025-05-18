from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from typing import List, Optional, Dict, Any, Tuple
from core.models import Artist, ArtistComment, User, user_favorite_artist
from Artist.dto import ArtistCommentCreate, SpotifyArtistOut
import requests
from Artist.auth import get_spotify_access_token

SPOTIFY_API_URL = "https://api.spotify.com/v1/artists"

async def get_artist_by_id(db: AsyncSession, artist_id: str) -> Optional[Artist]:
    """아티스트 ID로 조회 함수"""
    result = await db.execute(select(Artist).where(Artist.id == artist_id))
    return result.scalars().first()

async def save_artist_from_spotify(db: AsyncSession, spotify_data: dict) -> Artist:
    """Spotify API 데이터로 아티스트 저장 함수"""
    new_artist = Artist(
        id=spotify_data["id"],
        name=spotify_data["name"],
        image_url=spotify_data["images"][0]["url"] if spotify_data.get("images") else None,
        spotify_id=spotify_data["id"]
    )
    db.add(new_artist)
    await db.commit()
    await db.refresh(new_artist)
    return new_artist

async def get_artist_info_from_spotify(artist_id: str) -> Dict[str, Any]:
    """Spotify API에서 아티스트 정보 가져오기"""
    access_token = get_spotify_access_token()
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.get(f"{SPOTIFY_API_URL}/{artist_id}", headers=headers)
    
    if response.status_code != 200:
        raise Exception(f"Failed to get artist info: {response.status_code}")
    
    return response.json()

async def check_artist_favorite(db: AsyncSession, user_id: int, artist_id: str) -> bool:
    """아티스트 좋아요 여부 확인 함수"""
    result = await db.execute(
        select(user_favorite_artist).where(
            and_(
                user_favorite_artist.c.user_id == user_id,
                user_favorite_artist.c.artist_id == artist_id
            )
        )
    )
    return result.first() is not None

async def create_artist_comment(db: AsyncSession, artist_id: str, user_id: int, content: str) -> ArtistComment:
    """아티스트 댓글 생성 함수"""
    new_comment = ArtistComment(
        artist_id=artist_id,
        user_id=user_id,
        content=content
    )
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    return new_comment

async def get_artist_comments(db: AsyncSession, artist_id: str) -> List[Tuple[ArtistComment, str]]:
    """아티스트 댓글 목록 조회 함수"""
    result = await db.execute(
        select(ArtistComment, User.username)
        .join(User, ArtistComment.user_id == User.id)
        .where(ArtistComment.artist_id == artist_id)
        .order_by(ArtistComment.created_at.desc())
    )
    
    return result.all()

async def search_artists_from_spotify(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Spotify API로 아티스트 검색 함수"""
    access_token = get_spotify_access_token()
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    params = {
        "q": query,
        "type": "artist",
        "limit": limit
    }
    
    response = requests.get("https://api.spotify.com/v1/search", headers=headers, params=params)
    
    if response.status_code != 200:
        raise Exception(f"Failed to search artists: {response.status_code}")
    
    return response.json()["artists"]["items"]

async def get_user_favorite_artist_ids(db: AsyncSession, user_id: int) -> List[str]:
    """사용자의 관심 아티스트 ID 목록 조회 함수"""
    result = await db.execute(
        select(user_favorite_artist.c.artist_id).where(user_favorite_artist.c.user_id == user_id)
    )
    return [row[0] for row in result.all()]