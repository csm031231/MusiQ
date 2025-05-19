from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import provide_session
from core.models import User, user_favorite_artist
from User.user_router import get_current_user
from Artist.dto import ArtistCommentCreate, ArtistCommentOut, SpotifyArtistOut
from Artist.crud import (
    get_artist_by_id, save_artist_from_spotify, get_artist_info_from_spotify,
    check_artist_favorite, create_artist_comment, get_artist_comments,
    search_artists_from_spotify, get_user_favorite_artist_ids
)
from typing import List, Optional

router = APIRouter(
    prefix="/artists",
    tags=["artists"]
)

# 아티스트 정보 조회
@router.get("/{artist_id}", response_model=SpotifyArtistOut)
async def get_artist_info(
    artist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    try:
        # Spotify API에서 아티스트 정보 가져오기
        spotify_data = await get_artist_info_from_spotify(artist_id)
        
        # 관심 아티스트 여부 확인
        is_favorite = await check_artist_favorite(db, current_user.id, artist_id)
        
        # 로컬 DB에 아티스트 정보 저장 또는 업데이트
        artist = await get_artist_by_id(db, artist_id)
        
        if not artist:
            # 새 아티스트 정보 저장
            await save_artist_from_spotify(db, spotify_data)
        
        return SpotifyArtistOut.from_spotify_response(spotify_data, is_favorite)
    
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to get artist information: {str(e)}"
        )

# 아티스트에 대한 댓글 생성
@router.post("/{artist_id}/comments", response_model=ArtistCommentOut)
async def create_comment(
    artist_id: str,
    comment: ArtistCommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    # 아티스트가 존재하는지 확인
    artist = await get_artist_by_id(db, artist_id)
    
    if not artist:
        # Spotify API로 아티스트 정보 가져와서 저장
        try:
            spotify_data = await get_artist_info_from_spotify(artist_id)
            artist = await save_artist_from_spotify(db, spotify_data)
        
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"Failed to get artist information: {str(e)}"
            )
    
    # 댓글 생성
    new_comment = await create_artist_comment(db, artist_id, current_user.id, comment.content)
    
    # 사용자 이름 포함하여 반환
    return {
        "id": new_comment.id,
        "artist_id": new_comment.artist_id,
        "user_id": new_comment.user_id,
        "content": new_comment.content,
        "created_at": new_comment.created_at,
        "username": current_user.username
    }

# 특정 아티스트의 댓글 조회
@router.get("/{artist_id}/comments", response_model=List[ArtistCommentOut])
async def get_comments(
    artist_id: str,
    db: AsyncSession = Depends(provide_session)
):
    # 특정 아티스트의 댓글과 작성자 정보 함께 조회
    comments_data = await get_artist_comments(db, artist_id)
    
    # 결과 가공
    comments = []
    for comment, username in comments_data:
        comment_dict = {
            "id": comment.id,
            "artist_id": comment.artist_id,
            "user_id": comment.user_id,
            "content": comment.content,
            "created_at": comment.created_at,
            "username": username
        }
        comments.append(comment_dict)
    
    return comments

# 아티스트 검색
@router.get("/search/{query}", response_model=List[SpotifyArtistOut])
async def search_artists(
    query: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session),
    limit: int = 10
):
    try:
        # Spotify API로 아티스트 검색
        artists_data = await search_artists_from_spotify(query, limit)
        
        # 사용자의 관심 아티스트 목록 가져오기
        favorite_artist_ids = await get_user_favorite_artist_ids(db, current_user.id)
        
        # 검색 결과 가공
        artists = []
        for item in artists_data:
            is_favorite = item["id"] in favorite_artist_ids
            artists.append(SpotifyArtistOut.from_spotify_response(item, is_favorite))
        
        return artists
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search artists: {str(e)}"
        )
    
# 로그인 없이 접근 가능한 아티스트 검색
@router.get("/public-search/{query}", response_model=List[SpotifyArtistOut])
async def public_search_artists(
    query: str,
    limit: int = 10
):
    try:
        # Spotify API로 아티스트 검색
        artists_data = await search_artists_from_spotify(query, limit)

        # 결과 가공 (is_favorite 없이 반환)
        artists = [SpotifyArtistOut.from_spotify_response(item) for item in artists_data]
        return artists

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search artists: {str(e)}"
        )
