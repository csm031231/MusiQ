from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_
from core.database import provide_session
from core.models import User, user_favorite_artist
from User.user_router import get_current_user
from Artist.dto import ArtistCommentCreate, ArtistCommentOut, SpotifyArtistOut
from Artist.crud import (
    get_artist_by_id, save_artist_from_spotify, get_artist_info_from_spotify,
    check_artist_favorite, create_artist_comment, get_artist_comments,
    search_artists_from_spotify, get_user_favorite_artist_ids,
    get_popular_artists_from_spotify
)
from typing import List, Optional

router = APIRouter(
    prefix="/artists",
    tags=["artists"]
)

# 인기 아티스트 조회 (로그인 불필요)
@router.get("/popular", response_model=List[SpotifyArtistOut])
async def get_popular_artists(limit: int = 20):
    """인기 아티스트 목록 조회"""
    try:
        artists_data = await get_popular_artists_from_spotify(limit)
        artists = [SpotifyArtistOut.from_spotify_response(item) for item in artists_data]
        return artists
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get popular artists: {str(e)}"
        )

# 인기 아티스트 조회 (로그인한 사용자용 - 좋아요 상태 포함)
@router.get("/popular/authenticated", response_model=List[SpotifyArtistOut])
async def get_popular_artists_authenticated(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session),
    limit: int = 20
):
    """인기 아티스트 목록 조회 (좋아요 상태 포함)"""
    try:
        # 인기 아티스트 데이터 가져오기
        artists_data = await get_popular_artists_from_spotify(limit)
        
        # 사용자의 좋아요 아티스트 목록 가져오기
        favorite_artist_ids = await get_user_favorite_artist_ids(db, current_user.id)
        
        # 좋아요 상태 포함하여 결과 가공
        artists = []
        for item in artists_data:
            is_favorite = item["id"] in favorite_artist_ids
            artists.append(SpotifyArtistOut.from_spotify_response(item, is_favorite))
        
        return artists
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get popular artists: {str(e)}"
        )

# 아티스트 좋아요 토글
@router.post("/{artist_id}/favorite")
async def toggle_artist_favorite(
    artist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """아티스트 좋아요 토글"""
    try:
        # 아티스트가 존재하는지 확인하고 없으면 추가
        artist = await get_artist_by_id(db, artist_id)
        if not artist:
            spotify_data = await get_artist_info_from_spotify(artist_id)
            await save_artist_from_spotify(db, spotify_data)
        
        # 현재 좋아요 상태 확인
        is_favorite = await check_artist_favorite(db, current_user.id, artist_id)
        
        if is_favorite:
            # 좋아요 제거
            await db.execute(
                user_favorite_artist.delete().where(
                    and_(
                        user_favorite_artist.c.user_id == current_user.id,
                        user_favorite_artist.c.artist_id == artist_id
                    )
                )
            )
            await db.commit()
            return {"message": "Removed from favorites", "is_favorite": False}
        else:
            # 좋아요 추가
            await db.execute(
                user_favorite_artist.insert().values(
                    user_id=current_user.id,
                    artist_id=artist_id
                )
            )
            await db.commit()
            return {"message": "Added to favorites", "is_favorite": True}
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to toggle favorite: {str(e)}"
        )

# 사용자의 좋아요 아티스트 목록 조회
@router.get("/favorites", response_model=List[SpotifyArtistOut])
async def get_user_favorite_artists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """사용자의 좋아요 아티스트 목록 조회"""
    try:
        # 사용자의 좋아요 아티스트 ID 목록 가져오기
        favorite_artist_ids = await get_user_favorite_artist_ids(db, current_user.id)
        
        # 각 아티스트의 상세 정보 가져오기
        favorite_artists = []
        for artist_id in favorite_artist_ids:
            try:
                # 먼저 로컬 DB에서 확인
                artist = await get_artist_by_id(db, artist_id)
                
                # Spotify API에서 최신 정보 가져오기
                spotify_data = await get_artist_info_from_spotify(artist_id)
                
                # 로컬 DB에 없으면 저장
                if not artist:
                    await save_artist_from_spotify(db, spotify_data)
                
                artist_data = SpotifyArtistOut.from_spotify_response(spotify_data, True)
                favorite_artists.append(artist_data)
                
            except Exception as e:
                print(f"Failed to fetch artist {artist_id}: {str(e)}")
                continue
        
        return favorite_artists
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get favorite artists: {str(e)}"
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