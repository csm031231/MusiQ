from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from typing import List, Optional, Dict, Any, Tuple
from core.models import Artist, ArtistComment, User, user_favorite_artist
from Artist.dto import ArtistCommentCreate, SpotifyArtistOut
import requests
import asyncio
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
    try:
        access_token = get_spotify_access_token()
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        response = requests.get(f"{SPOTIFY_API_URL}/{artist_id}", headers=headers)
        
        if response.status_code != 200:
            raise Exception(f"Spotify API error: {response.status_code} - {response.text}")
        
        return response.json()
    except Exception as e:
        print(f"Error getting artist info from Spotify: {str(e)}")
        raise

async def get_popular_artists_from_spotify(limit: int = 20) -> List[Dict[str, Any]]:
    """Spotify API에서 인기 아티스트 가져오기 (개선된 버전)"""
    try:
        access_token = get_spotify_access_token()
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        # 더 다양하고 실제로 인기 있는 아티스트들 검색
        popular_queries = [
            # K-Pop
            "BTS", "BLACKPINK", "NewJeans", "IVE", "SEVENTEEN", "TWICE", "aespa", "IU",
            "ITZY", "Red Velvet", "ENHYPEN", "LE SSERAFIM", "(G)I-DLE", "NMIXX", "STRAY KIDS",
            
            # Global Pop
            "Taylor Swift", "Ed Sheeran", "Billie Eilish", "Ariana Grande", "The Weeknd",
            "Dua Lipa", "Justin Bieber", "Olivia Rodrigo", "Harry Styles", "Doja Cat",
            
            # Hip-Hop/R&B
            "Drake", "Bad Bunny", "Post Malone", "Travis Scott", "Kendrick Lamar"
        ]
        
        all_artists = []
        seen_artists = set()  # 중복 제거를 위한 set
        
        # 병렬 처리로 속도 향상
        semaphore = asyncio.Semaphore(5)  # 동시 요청 수 제한
        
        async def fetch_artist(query):
            async with semaphore:
                try:
                    params = {
                        "q": query,
                        "type": "artist",
                        "limit": 1
                    }
                    response = requests.get("https://api.spotify.com/v1/search", headers=headers, params=params)
                    
                    if response.status_code == 200:
                        artists_data = response.json()["artists"]["items"]
                        for artist in artists_data:
                            # 인기도 점수가 있고 중복이 아닌 경우만 추가
                            if artist["id"] not in seen_artists and artist.get("popularity", 0) > 0:
                                all_artists.append(artist)
                                seen_artists.add(artist["id"])
                                return True
                except Exception as e:
                    print(f"Failed to search {query}: {str(e)}")
                return False
        
        # 비동기 병렬 처리
        tasks = [fetch_artist(query) for query in popular_queries[:25]]  # 처음 25개만 처리
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # 인기도 순으로 정렬
        all_artists.sort(key=lambda x: x.get("popularity", 0), reverse=True)
        
        print(f"Found {len(all_artists)} popular artists")
        
        # 요청된 limit만큼 반환
        return all_artists[:limit]
        
    except Exception as e:
        print(f"Error getting popular artists from Spotify: {str(e)}")
        # 에러 발생 시 빈 리스트 대신 최소한의 데이터라도 반환
        return []

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
    try:
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
            raise Exception(f"Spotify API error: {response.status_code} - {response.text}")
        
        return response.json()["artists"]["items"]
    except Exception as e:
        print(f"Error searching artists from Spotify: {str(e)}")
        raise

async def get_user_favorite_artist_ids(db: AsyncSession, user_id: int) -> List[str]:
    """사용자의 관심 아티스트 ID 목록 조회 함수"""
    result = await db.execute(
        select(user_favorite_artist.c.artist_id).where(user_favorite_artist.c.user_id == user_id)
    )
    return [row[0] for row in result.all()]