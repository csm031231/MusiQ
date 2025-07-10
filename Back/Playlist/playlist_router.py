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
        print(f"Error creating playlist: {str(e)}")
        traceback.print_exc()
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
        print(f"Error getting user playlists: {str(e)}")
        traceback.print_exc()
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
        print(f"Error getting playlist: {str(e)}")
        traceback.print_exc()
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
        
        # 업데이트할 필드만 변경
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
        print(f"Error updating playlist: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="플레이리스트 수정 중 오류가 발생했습니다."
        )

# 플레이리스트의 노래 목록 조회 (단순 버전)
@router.get("/{playlist_id}/songs")
async def get_playlist_songs(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트의 노래 목록 조회 - 최대한 단순화"""
    try:
        print(f"=== 플레이리스트 {playlist_id} 노래 목록 조회 시작 ===")
        
        # 1. 플레이리스트 존재 및 권한 확인
        playlist_result = await db.execute(
            select(Playlist).where(
                and_(
                    Playlist.id == playlist_id,
                    (Playlist.user_id == current_user.id) | (Playlist.is_public == True)
                )
            )
        )
        
        playlist = playlist_result.scalars().first()
        if not playlist:
            print(f"플레이리스트 {playlist_id} 찾을 수 없음")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to access it"
            )
        
        print(f"✓ 플레이리스트 확인: {playlist.title}")
        
        # 2. 플레이리스트 노래 목록만 먼저 조회
        playlist_songs_result = await db.execute(
            select(PlaylistSong)
            .where(PlaylistSong.playlist_id == playlist_id)
            .order_by(PlaylistSong.position.asc())
        )
        
        playlist_songs = playlist_songs_result.scalars().all()
        print(f"✓ 플레이리스트 노래 {len(playlist_songs)}개 찾음")
        
        if not playlist_songs:
            # 빈 플레이리스트인 경우
            return {
                "playlist_id": playlist_id,
                "playlist_title": playlist.title,
                "total_songs": 0,
                "all_songs": []
            }
        
        # 3. 각 노래 정보를 개별적으로 조회 (안전하게)
        all_songs = []
        
        for playlist_song in playlist_songs:
            try:
                # 노래 정보 조회
                song_result = await db.execute(
                    select(Song).where(Song.id == playlist_song.song_id)
                )
                song = song_result.scalars().first()
                
                if not song:
                    print(f"노래 ID {playlist_song.song_id} 찾을 수 없음, 건너뜀")
                    continue
                
                # 아티스트 정보 조회
                artist_result = await db.execute(
                    select(Artist).where(Artist.id == song.artist_id)
                )
                artist = artist_result.scalars().first()
                
                # 좋아요 여부 확인
                liked_result = await db.execute(
                    select(UserLikedSong).where(
                        and_(
                            UserLikedSong.user_id == current_user.id,
                            UserLikedSong.song_id == song.id
                        )
                    )
                )
                is_liked = liked_result.scalars().first() is not None
                
                # 안전한 데이터 구성
                song_info = {
                    "id": song.id,
                    "title": song.title or "Unknown Title",
                    "duration_ms": song.duration_ms,
                    "preview_url": song.preview_url,
                    "spotify_id": song.spotify_id,
                    "position": playlist_song.position,
                    "added_at": playlist_song.added_at.isoformat() if playlist_song.added_at else None,
                    "is_liked": is_liked,
                    "artist": {
                        "id": artist.id if artist else None,
                        "name": artist.name if artist else "Unknown Artist",
                        "image_url": artist.image_url if artist else None
                    },
                    "album": None  # 앨범 정보는 일단 제거
                }
                
                all_songs.append(song_info)
                
            except Exception as song_error:
                print(f"노래 {playlist_song.song_id} 처리 중 오류: {str(song_error)}")
                continue
        
        print(f"✓ 총 {len(all_songs)}개 노래 처리 완료")
        
        return {
            "playlist_id": playlist_id,
            "playlist_title": playlist.title,
            "total_songs": len(all_songs),
            "all_songs": all_songs
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"플레이리스트 노래 조회 오류: {str(e)}")
        print(f"오류 타입: {type(e)}")
        traceback.print_exc()
        
        # 오류 발생 시에도 빈 결과 반환 (서비스 중단 방지)
        return {
            "playlist_id": playlist_id,
            "playlist_title": "Unknown Playlist",
            "total_songs": 0,
            "all_songs": [],
            "error": str(e)
        }

# 플레이리스트에 단일 노래 추가 (단순 버전)
@router.post("/{playlist_id}/songs")
async def add_song_to_playlist(
    playlist_id: int,
    song_data: PlaylistSongAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트에 노래 추가 - 단순 버전"""
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
        
        # 이미 플레이리스트에 있는지 확인
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
        
        # 현재 플레이리스트의 마지막 position 찾기
        result = await db.execute(
            select(func.max(PlaylistSong.position))
            .where(PlaylistSong.playlist_id == playlist_id)
        )
        max_position = result.scalar() or 0
        
        # 플레이리스트에 노래 추가 (기본 필드만)
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
        print(f"Error adding song to playlist: {str(e)}")
        traceback.print_exc()
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
        print(f"Error removing song from playlist: {str(e)}")
        traceback.print_exc()
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
        
        # 이미 좋아요 했는지 확인
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
        print(f"Error toggling like song: {str(e)}")
        traceback.print_exc()
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
        
        # 결과 가공
        liked_songs = []
        for ls, song, artist, album in result.all():
            song_info = {
                "id": song.id,
                "title": song.title,
                "duration_ms": song.duration_ms,
                "preview_url": song.preview_url,
                "spotify_id": getattr(song, 'spotify_id', None),
                "added_at": ls.liked_at.isoformat() if ls.liked_at else None,
                "is_liked": True,  # 모두 좋아요한 노래
                "artist": {
                    "id": artist.id,
                    "name": artist.name,
                    "image_url": getattr(artist, 'image_url', None)
                },
                "album": {
                    "id": album.id,
                    "title": album.title,
                    "cover_url": getattr(album, 'cover_url', None)
                } if album else None
            }
            liked_songs.append(song_info)
        
        return {
            "total_liked_songs": len(liked_songs),
            "liked_songs": liked_songs
        }
        
    except Exception as e:
        print(f"Error getting liked songs: {str(e)}")
        traceback.print_exc()
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
    """플레이리스트 삭제 - 단순화"""
    try:
        print(f"=== 플레이리스트 {playlist_id} 삭제 시작 ===")
        
        # 1. 플레이리스트 존재 및 권한 확인
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
            print(f"플레이리스트 {playlist_id} 찾을 수 없음 또는 권한 없음")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to delete it"
            )
        
        playlist_title = playlist.title
        print(f"✓ 삭제할 플레이리스트: {playlist_title}")
        
        # 2. 플레이리스트 관련 노래들 먼저 삭제
        print("관련 노래들 삭제 중...")
        delete_songs_stmt = delete(PlaylistSong).where(
            PlaylistSong.playlist_id == playlist_id
        )
        songs_result = await db.execute(delete_songs_stmt)
        deleted_songs_count = songs_result.rowcount
        print(f"✓ {deleted_songs_count}개 노래 관계 삭제 완료")
        
        # 3. 플레이리스트 삭제
        print("플레이리스트 삭제 중...")
        await db.delete(playlist)
        
        # 4. 커밋
        await db.commit()
        print("✓ 삭제 완료")
        
        return {
            "success": True,
            "message": f"플레이리스트 '{playlist_title}'가 삭제되었습니다.",
            "deleted_songs_count": deleted_songs_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"플레이리스트 삭제 오류: {str(e)}")
        print(f"오류 타입: {type(e)}")
        traceback.print_exc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"플레이리스트 삭제 중 오류가 발생했습니다: {str(e)}"
        )