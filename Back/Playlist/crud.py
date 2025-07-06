from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, delete
from typing import List, Optional, Dict, Any
from core.models import Playlist, PlaylistSong, Song, UserLikedSong, Artist, Album
from Playlist.dto import PlaylistCreate, PlaylistUpdate

# 플레이리스트 생성
async def create_playlist(db: AsyncSession, playlist_data: dict, user_id: int) -> Playlist:
    """플레이리스트 생성 함수"""
    new_playlist = Playlist(
        title=playlist_data["title"],
        description=playlist_data.get("description"),
        is_public=playlist_data.get("is_public", True),
        user_id=user_id
    )
    
    db.add(new_playlist)
    await db.commit()
    await db.refresh(new_playlist)
    
    return new_playlist

# 사용자의 플레이리스트 목록 조회
async def get_user_playlists(db: AsyncSession, user_id: int) -> List[Playlist]:
    """사용자의 플레이리스트 목록 조회 함수"""
    result = await db.execute(
        select(Playlist).where(Playlist.user_id == user_id)
    )
    
    return result.scalars().all()

# 특정 플레이리스트 조회
async def get_playlist_by_id(db: AsyncSession, playlist_id: int, user_id: int) -> Optional[Playlist]:
    """플레이리스트 ID로 조회 함수"""
    result = await db.execute(
        select(Playlist).where(
            and_(
                Playlist.id == playlist_id,
                (Playlist.user_id == user_id) | (Playlist.is_public == True)
            )
        )
    )
    
    return result.scalars().first()

# 노래 조회
async def get_song_by_id(db: AsyncSession, song_id: int) -> Optional[Song]:
    """노래 ID로 조회 함수"""
    result = await db.execute(
        select(Song).where(Song.id == song_id)
    )
    
    return result.scalars().first()

# 플레이리스트에 노래 추가 여부 확인
async def check_song_in_playlist(db: AsyncSession, playlist_id: int, song_id: int) -> bool:
    """플레이리스트에 노래가 있는지 확인 함수"""
    result = await db.execute(
        select(PlaylistSong).where(
            and_(
                PlaylistSong.playlist_id == playlist_id,
                PlaylistSong.song_id == song_id
            )
        )
    )
    
    return result.scalars().first() is not None

# 노래 좋아요 여부 확인
async def check_song_liked(db: AsyncSession, user_id: int, song_id: int) -> Optional[UserLikedSong]:
    """노래 좋아요 여부 확인 함수"""
    result = await db.execute(
        select(UserLikedSong).where(
            and_(
                UserLikedSong.user_id == user_id,
                UserLikedSong.song_id == song_id
            )
        )
    )
    
    return result.scalars().first()

