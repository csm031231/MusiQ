from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import provide_session
from core.models import User, Playlist, PlaylistSong, Song, UserLikedSong, Artist, Album
from User.user_router import get_current_user
from Playlist.dto import (
    PlaylistCreate, PlaylistResponse, PlaylistUpdate, 
    PlaylistSongAdd, PlaylistSongResponse
)
from typing import List
from sqlalchemy.future import select
from sqlalchemy import and_, delete

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

# 사용자의 플레이리스트 목록 조회
@router.get("/my-playlists", response_model=List[PlaylistResponse])
async def get_my_playlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    result = await db.execute(
        select(Playlist).where(Playlist.user_id == current_user.id)
    )
    
    return result.scalars().all()

# 특정 플레이리스트 조회
@router.get("/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
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

# 플레이리스트 정보 업데이트
@router.put("/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
    playlist_id: int,
    playlist_data: PlaylistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
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

# 플레이리스트에 노래 추가
@router.post("/{playlist_id}/songs", status_code=status.HTTP_201_CREATED)
async def add_song_to_playlist(
    playlist_id: int,
    song_data: PlaylistSongAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    # 플레이리스트 존재 및 권한 확인
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
    
    # 이미 추가되었는지 확인
    result = await db.execute(
        select(PlaylistSong).where(
            and_(
                PlaylistSong.playlist_id == playlist_id,
                PlaylistSong.song_id == song_data.song_id
            )
        )
    )
    
    if result.scalars().first():
        return {"message": "Song already in playlist"}
    
    # 플레이리스트에 노래 추가
    new_playlist_song = PlaylistSong(
        playlist_id=playlist_id,
        song_id=song_data.song_id
    )
    
    db.add(new_playlist_song)
    await db.commit()
    
    return {"message": "Song added to playlist successfully"}

# 플레이리스트의 노래 목록 조회
@router.get("/{playlist_id}/songs", response_model=List[PlaylistSongResponse])
async def get_playlist_songs(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    # 플레이리스트 접근 권한 확인
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
    
    # 플레이리스트의 노래 목록 조회 (노래, 아티스트, 앨범 정보 포함)
    result = await db.execute(
        select(
            PlaylistSong, Song, Artist, Album
        ).join(
            Song, PlaylistSong.song_id == Song.id
        ).join(
            Artist, Song.artist_id == Artist.id
        ).outerjoin(
            Album, Song.album_id == Album.id
        ).where(
            PlaylistSong.playlist_id == playlist_id
        )
    )
    
    # 결과 가공
    playlist_songs = []
    for ps, song, artist, album in result.all():
        # 사용자가 좋아요 했는지 확인
        liked_result = await db.execute(
            select(UserLikedSong).where(
                and_(
                    UserLikedSong.user_id == current_user.id,
                    UserLikedSong.song_id == song.id
                )
            )
        )
        is_liked = liked_result.scalars().first() is not None
        
        song_info = {
            "id": song.id,
            "title": song.title,
            "duration_ms": song.duration_ms,
            "preview_url": song.preview_url,
            "added_at": ps.added_at,
            "is_liked": is_liked,
            "artist": {
                "id": artist.id,
                "name": artist.name,
                "image_url": artist.image_url
            },
            "album": None if not album else {
                "id": album.id,
                "title": album.title,
                "cover_url": album.cover_url
            }
        }
        playlist_songs.append(song_info)
    
    return playlist_songs

# 플레이리스트에서 노래 삭제
@router.delete("/{playlist_id}/songs/{song_id}")
async def remove_song_from_playlist(
    playlist_id: int,
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
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
    
    return {"message": "Song removed from playlist successfully"}

# 노래 좋아요 추가/삭제
@router.post("/like-song/{song_id}")
async def toggle_like_song(
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
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
        stmt = delete(UserLikedSong).where(
            and_(
                UserLikedSong.user_id == current_user.id,
                UserLikedSong.song_id == song_id
            )
        )
        await db.execute(stmt)
        await db.commit()
        return {"message": "Song unliked successfully"}
    else:
        # 좋아요 추가
        new_liked_song = UserLikedSong(
            user_id=current_user.id,
            song_id=song_id
        )
        db.add(new_liked_song)
        await db.commit()
        return {"message": "Song liked successfully"}

# 좋아요한 노래 목록 조회
@router.get("/liked-songs", response_model=List[PlaylistSongResponse])
async def get_liked_songs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    result = await db.execute(
        select(
            UserLikedSong, Song, Artist, Album
        ).join(
            Song, UserLikedSong.song_id == Song.id
        ).join(
            Artist, Song.artist_id == Artist.id
        ).outerjoin(
            Album, Song.album_id == Album.id
        ).where(
            UserLikedSong.user_id == current_user.id
        ).order_by(
            UserLikedSong.liked_at.desc()
        )
    )
    
    # 결과 가공
    liked_songs = []
    for ls, song, artist, album in result.all():
        song_info = {
            "id": song.id,
            "title": song.title,
            "duration_ms": song.duration_ms,
            "preview_url": song.preview_url,
            "added_at": ls.liked_at,
            "is_liked": True,  # 모두 좋아요한 노래
            "artist": {
                "id": artist.id,
                "name": artist.name,
                "image_url": artist.image_url
            },
            "album": None if not album else {
                "id": album.id,
                "title": album.title,
                "cover_url": album.cover_url
            }
        }
        liked_songs.append(song_info)
    
    return liked_songs


# 플레이리스트 삭제
@router.delete("/{playlist_id}")
async def delete_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    # 플레이리스트 존재 및 권한 확인
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
    
    # 플레이리스트 관련 데이터 삭제 (관련 노래들도 함께 삭제)
    # 1. 플레이리스트-노래 관계 삭제
    stmt = delete(PlaylistSong).where(PlaylistSong.playlist_id == playlist_id)
    await db.execute(stmt)
    
    # 2. 플레이리스트 삭제
    await db.delete(playlist)
    await db.commit()
    
    return {"message": "Playlist deleted successfully"}