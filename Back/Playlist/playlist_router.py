from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import provide_session
from core.models import User, Playlist, PlaylistSong, Song, UserLikedSong, Artist, Album
from User.user_router import get_current_user
from Playlist.dto import (
    PlaylistCreate, PlaylistResponse, PlaylistUpdate, 
    PlaylistSongAdd, PlaylistSongResponse, AlbumAddToPlaylist
)
from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy import and_, delete, func
from pydantic import BaseModel
import traceback
import logging

# 로거 설정
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/playlists",
    tags=["playlists"]
)

# 플레이리스트의 노래 목록 조회 (최소한의 안전한 버전)
@router.get("/{playlist_id}/songs")
async def get_playlist_songs(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트의 노래 목록 조회 - 안전한 최소 버전"""
    try:
        logger.info(f"Getting songs for playlist {playlist_id}, user {current_user.id}")
        
        # 플레이리스트 존재 및 권한 확인
        playlist_query = select(Playlist).where(
            and_(
                Playlist.id == playlist_id,
                (Playlist.user_id == current_user.id) | (Playlist.is_public == True)
            )
        )
        
        result = await db.execute(playlist_query)
        playlist = result.scalars().first()
        
        if not playlist:
            logger.warning(f"Playlist {playlist_id} not found or no permission for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to access it"
            )
        
        logger.info(f"Playlist found: {playlist.title}")
        
        # 가장 기본적인 플레이리스트 노래 조회 (JOIN 최소화)
        songs_query = select(PlaylistSong).where(
            PlaylistSong.playlist_id == playlist_id
        ).order_by(PlaylistSong.position.asc())
        
        result = await db.execute(songs_query)
        playlist_songs = result.scalars().all()
        
        logger.info(f"Found {len(playlist_songs)} songs in playlist")
        
        all_songs = []
        
        for playlist_song in playlist_songs:
            try:
                # 각 노래 정보를 개별적으로 조회 (안전하게)
                song_query = select(Song).where(Song.id == playlist_song.song_id)
                song_result = await db.execute(song_query)
                song = song_result.scalars().first()
                
                if not song:
                    logger.warning(f"Song {playlist_song.song_id} not found, skipping")
                    continue
                
                # 아티스트 정보 조회
                artist_query = select(Artist).where(Artist.id == song.artist_id)
                artist_result = await db.execute(artist_query)
                artist = artist_result.scalars().first()
                
                # 앨범 정보 조회 (선택적)
                album = None
                if song.album_id:
                    album_query = select(Album).where(Album.id == song.album_id)
                    album_result = await db.execute(album_query)
                    album = album_result.scalars().first()
                
                # 좋아요 여부 확인
                liked_query = select(UserLikedSong).where(
                    and_(
                        UserLikedSong.user_id == current_user.id,
                        UserLikedSong.song_id == song.id
                    )
                )
                liked_result = await db.execute(liked_query)
                is_liked = liked_result.scalars().first() is not None
                
                # 안전한 데이터 구성
                song_info = {
                    "id": song.id,
                    "title": song.title,
                    "duration_ms": getattr(song, 'duration_ms', None),
                    "preview_url": getattr(song, 'preview_url', None),
                    "spotify_id": getattr(song, 'spotify_id', None),
                    "position": playlist_song.position,
                    "added_at": playlist_song.added_at.isoformat() if hasattr(playlist_song, 'added_at') and playlist_song.added_at else None,
                    "is_liked": is_liked,
                    "artist": {
                        "id": artist.id if artist else None,
                        "name": artist.name if artist else "Unknown Artist",
                        "image_url": getattr(artist, 'image_url', None) if artist else None
                    },
                    "album": {
                        "id": album.id if album else None,
                        "title": album.title if album else None,
                        "cover_url": getattr(album, 'cover_url', None) if album else None
                    } if album else None
                }
                
                all_songs.append(song_info)
                
            except Exception as song_error:
                logger.error(f"Error processing song {playlist_song.song_id}: {str(song_error)}")
                # 개별 노래 에러는 무시하고 계속 진행
                continue
        
        response_data = {
            "playlist_id": playlist_id,
            "playlist_title": playlist.title,
            "total_songs": len(all_songs),
            "all_songs": all_songs
        }
        
        logger.info(f"Successfully returning {len(all_songs)} songs for playlist {playlist_id}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Critical error in get_playlist_songs: {str(e)}")
        logger.error(traceback.format_exc())
        
        # 완전 실패 시 빈 데이터 반환 (서비스 유지)
        return {
            "playlist_id": playlist_id,
            "playlist_title": "Unknown",
            "total_songs": 0,
            "all_songs": [],
            "error": str(e)
        }

# 플레이리스트 생성
@router.post("/", response_model=PlaylistResponse, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    playlist_data: PlaylistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """새 플레이리스트 생성"""
    try:
        new_playlist = Playlist(
            title=playlist_data.title,
            description=playlist_data.description,
            is_public=playlist_data.is_public,
            user_id=current_user.id
        )
        
        db.add(new_playlist)
        await db.commit()
        await db.refresh(new_playlist)
        
        return new_playlist
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating playlist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="플레이리스트 생성 중 오류가 발생했습니다."
        )

# 사용자의 플레이리스트 목록 조회
@router.get("/my-playlists", response_model=List[PlaylistResponse])
async def get_my_playlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """현재 사용자의 플레이리스트 목록 조회"""
    try:
        result = await db.execute(
            select(Playlist)
            .where(Playlist.user_id == current_user.id)
            .order_by(Playlist.created_at.desc())
        )
        
        return result.scalars().all()
    except Exception as e:
        logger.error(f"Error getting user playlists: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="플레이리스트 목록 조회 중 오류가 발생했습니다."
        )

# 특정 플레이리스트 조회
@router.get("/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트 정보 조회"""
    try:
        result = await db.execute(
            select(Playlist).where(
                and_(
                    Playlist.id == playlist_id,
                    (Playlist.user_id == current_user.id) | (Playlist.is_public == True)
                )
            )
        )
        
        playlist = result.scalars().first()
        if not playlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to access it"
            )
        
        return playlist
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting playlist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="플레이리스트 조회 중 오류가 발생했습니다."
        )

# 플레이리스트 정보 업데이트
@router.put("/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
    playlist_id: int,
    playlist_data: PlaylistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트 정보 수정"""
    try:
        result = await db.execute(
            select(Playlist).where(
                and_(
                    Playlist.id == playlist_id,
                    Playlist.user_id == current_user.id
                )
            )
        )
        
        playlist = result.scalars().first()
        if not playlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to modify it"
            )
        
        if playlist_data.title is not None:
            playlist.title = playlist_data.title
        
        if playlist_data.description is not None:
            playlist.description = playlist_data.description
        
        if playlist_data.is_public is not None:
            playlist.is_public = playlist_data.is_public
        
        await db.commit()
        await db.refresh(playlist)
        
        return playlist
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating playlist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="플레이리스트 수정 중 오류가 발생했습니다."
        )

# 플레이리스트에 단일 노래 추가
@router.post("/{playlist_id}/songs")
async def add_song_to_playlist(
    playlist_id: int,
    song_data: PlaylistSongAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트에 노래 추가"""
    try:
        # 플레이리스트 권한 확인
        result = await db.execute(
            select(Playlist).where(
                and_(
                    Playlist.id == playlist_id,
                    Playlist.user_id == current_user.id
                )
            )
        )
        
        playlist = result.scalars().first()
        if not playlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to modify it"
            )
        
        # 노래 존재 확인
        result = await db.execute(
            select(Song).where(Song.id == song_data.song_id)
        )
        
        song = result.scalars().first()
        if not song:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Song not found"
            )
        
        # 중복 확인
        result = await db.execute(
            select(PlaylistSong).where(
                and_(
                    PlaylistSong.playlist_id == playlist_id,
                    PlaylistSong.song_id == song_data.song_id
                )
            )
        )
        
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Song already exists in playlist"
            )
        
        # position 계산
        result = await db.execute(
            select(func.max(PlaylistSong.position))
            .where(PlaylistSong.playlist_id == playlist_id)
        )
        max_position = result.scalar() or 0
        
        # 노래 추가
        new_playlist_song = PlaylistSong(
            playlist_id=playlist_id,
            song_id=song_data.song_id,
            position=max_position + 1
        )
        
        db.add(new_playlist_song)
        await db.commit()
        
        return {
            "success": True,
            "message": "Song added to playlist successfully",
            "song_id": song_data.song_id,
            "position": max_position + 1
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error adding song to playlist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="노래 추가 중 오류가 발생했습니다."
        )

# 플레이리스트에서 노래 삭제
@router.delete("/{playlist_id}/songs/{song_id}")
async def remove_song_from_playlist(
    playlist_id: int,
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트에서 노래 제거"""
    try:
        # 플레이리스트 권한 확인
        result = await db.execute(
            select(Playlist).where(
                and_(
                    Playlist.id == playlist_id,
                    Playlist.user_id == current_user.id
                )
            )
        )
        
        playlist = result.scalars().first()
        if not playlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to modify it"
            )
        
        # 노래 삭제
        stmt = delete(PlaylistSong).where(
            and_(
                PlaylistSong.playlist_id == playlist_id,
                PlaylistSong.song_id == song_id
            )
        )
        
        result = await db.execute(stmt)
        await db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Song not found in playlist"
            )
        
        return {
            "success": True,
            "message": "Song removed from playlist successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error removing song from playlist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="노래 삭제 중 오류가 발생했습니다."
        )

# 노래 좋아요 추가/삭제
@router.post("/like-song/{song_id}")
async def toggle_like_song(
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """노래 좋아요 토글"""
    try:
        # 노래 존재 확인
        result = await db.execute(
            select(Song).where(Song.id == song_id)
        )
        
        song = result.scalars().first()
        if not song:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Song not found"
            )
        
        # 좋아요 상태 확인
        result = await db.execute(
            select(UserLikedSong).where(
                and_(
                    UserLikedSong.user_id == current_user.id,
                    UserLikedSong.song_id == song_id
                )
            )
        )
        
        liked_song = result.scalars().first()
        
        if liked_song:
            # 좋아요 취소
            await db.delete(liked_song)
            await db.commit()
            return {
                "success": True,
                "is_liked": False,
                "message": "Song unliked successfully"
            }
        else:
            # 좋아요 추가
            new_liked_song = UserLikedSong(
                user_id=current_user.id,
                song_id=song_id
            )
            db.add(new_liked_song)
            await db.commit()
            return {
                "success": True,
                "is_liked": True,
                "message": "Song liked successfully"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error toggling like song: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="좋아요 처리 중 오류가 발생했습니다."
        )

# 좋아요한 노래 목록 조회
@router.get("/liked-songs")
async def get_liked_songs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """사용자가 좋아요한 노래 목록 조회"""
    try:
        result = await db.execute(
            select(UserLikedSong, Song, Artist, Album)
            .join(Song, UserLikedSong.song_id == Song.id)
            .join(Artist, Song.artist_id == Artist.id)
            .outerjoin(Album, Song.album_id == Album.id)
            .where(UserLikedSong.user_id == current_user.id)
            .order_by(UserLikedSong.liked_at.desc())
        )
        
        liked_songs = []
        for ls, song, artist, album in result.all():
            song_info = {
                "id": song.id,
                "title": song.title,
                "duration_ms": getattr(song, 'duration_ms', None),
                "preview_url": getattr(song, 'preview_url', None),
                "spotify_id": getattr(song, 'spotify_id', None),
                "added_at": ls.liked_at.isoformat() if hasattr(ls, 'liked_at') and ls.liked_at else None,
                "is_liked": True,
                "artist": {
                    "id": artist.id if artist else None,
                    "name": artist.name if artist else "Unknown Artist",
                    "image_url": getattr(artist, 'image_url', None) if artist else None
                },
                "album": {
                    "id": album.id if album else None,
                    "title": album.title if album else None,
                    "cover_url": getattr(album, 'cover_url', None) if album else None
                } if album else None
            }
            liked_songs.append(song_info)
        
        return {
            "total_liked_songs": len(liked_songs),
            "liked_songs": liked_songs
        }
        
    except Exception as e:
        logger.error(f"Error getting liked songs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="좋아요한 노래 목록 조회 중 오류가 발생했습니다."
        )

# 플레이리스트 삭제
@router.delete("/{playlist_id}")
async def delete_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트 삭제"""
    try:
        # 플레이리스트 확인
        result = await db.execute(
            select(Playlist).where(
                and_(
                    Playlist.id == playlist_id,
                    Playlist.user_id == current_user.id
                )
            )
        )
        
        playlist = result.scalars().first()
        if not playlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to delete it"
            )
        
        playlist_title = playlist.title
        
        # 관련 데이터 삭제
        stmt = delete(PlaylistSong).where(PlaylistSong.playlist_id == playlist_id)
        await db.execute(stmt)
        
        await db.delete(playlist)
        await db.commit()
        
        return {
            "success": True,
            "message": f"플레이리스트 '{playlist_title}'가 삭제되었습니다."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting playlist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="플레이리스트 삭제 중 오류가 발생했습니다."
        )