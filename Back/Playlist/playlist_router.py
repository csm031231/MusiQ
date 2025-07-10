from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import provide_session
from core.models import User, Playlist, PlaylistSong, Song, UserLikedSong, Artist, Album
from User.user_router import get_current_user
from Playlist.dto import (
    PlaylistCreate, PlaylistResponse, PlaylistUpdate, 
    PlaylistSongAdd, PlaylistSongResponse, AlbumAddToPlaylist
)
from typing import List
from sqlalchemy.future import select
from sqlalchemy import and_, delete, func
from pydantic import BaseModel

router = APIRouter(
    prefix="/playlists",
    tags=["playlists"]
)

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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Song already in playlist"
        )
    
    # 현재 플레이리스트의 마지막 position 찾기
    result = await db.execute(
        select(func.max(PlaylistSong.position))
        .where(PlaylistSong.playlist_id == playlist_id)
    )
    max_position = result.scalar() or 0
    
    # 플레이리스트에 노래 추가
    new_playlist_song = PlaylistSong(
        playlist_id=playlist_id,
        song_id=song_data.song_id,
        position=max_position + 1
    )
    
    db.add(new_playlist_song)
    await db.commit()
    
    return {"message": "Song added to playlist successfully"}

# 플레이리스트에 앨범 전체 추가 (그룹으로)
@router.post("/{playlist_id}/add-album")
async def add_album_to_playlist(
    playlist_id: int,
    album_data: AlbumAddToPlaylist,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """
    앨범 전체를 플레이리스트에 그룹으로 추가
    """
    try:
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
        
        # 앨범 트랙 목록 가져오기 (Api_router의 get_album_tracks 사용)
        from Api.Api_router import get_album_tracks as fetch_album_tracks
        album_tracks_response = await fetch_album_tracks(album_data.album_id, db)
        
        if "error" in album_tracks_response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=album_tracks_response["error"]
            )
        
        tracks = album_tracks_response.get('tracks', [])
        album_info = album_tracks_response.get('album', {})
        
        if not tracks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No tracks found in album"
            )
        
        # 현재 플레이리스트의 마지막 position 찾기
        result = await db.execute(
            select(func.max(PlaylistSong.position))
            .where(PlaylistSong.playlist_id == playlist_id)
        )
        max_position = result.scalar() or 0
        
        # 앨범 그룹 정보 생성
        from datetime import datetime
        album_group_id = f"album_{album_data.album_id}_{int(datetime.now().timestamp())}"
        
        added_songs = []
        success_count = 0
        skip_count = 0
        
        # 트랙을 순서대로 추가 (트랙 번호 순)
        sorted_tracks = sorted(tracks, key=lambda t: (t.get('disc_number', 1), t.get('track_number', 0)))
        
        for track in sorted_tracks:
            try:
                song_id = track.get('song_id')
                if not song_id:
                    continue
                
                # 이미 플레이리스트에 있는지 확인
                existing_result = await db.execute(
                    select(PlaylistSong).where(
                        and_(
                            PlaylistSong.playlist_id == playlist_id,
                            PlaylistSong.song_id == song_id
                        )
                    )
                )
                
                if existing_result.scalars().first():
                    skip_count += 1
                    continue
                
                # 플레이리스트에 추가
                max_position += 1
                new_playlist_song = PlaylistSong(
                    playlist_id=playlist_id,
                    song_id=song_id,
                    position=max_position,
                    album_group_id=album_group_id,  # 앨범 그룹 ID 추가
                    album_group_name=album_info.get('name'),  # 앨범 그룹 이름 추가
                    is_album_group=True  # 앨범 그룹 여부
                )
                
                db.add(new_playlist_song)
                added_songs.append({
                    'song_id': song_id,
                    'name': track.get('name'),
                    'position': max_position,
                    'track_number': track.get('track_number')
                })
                success_count += 1
                
            except Exception as e:
                print(f"트랙 {track.get('name')} 추가 실패: {str(e)}")
                continue
        
        await db.commit()
        
        return {
            "success": True,
            "album": album_info,
            "album_group_id": album_group_id,
            "added_count": success_count,
            "skipped_count": skip_count,
            "total_tracks": len(tracks),
            "added_songs": added_songs,
            "message": f"앨범 '{album_info.get('name')}'의 {success_count}곡이 그룹으로 추가되었습니다."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error in add_album_to_playlist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"앨범 추가 중 오류가 발생했습니다: {str(e)}"
        )

# 플레이리스트의 노래 목록 조회 (앨범 그룹 정보 포함)
@router.get("/{playlist_id}/songs")
async def get_playlist_songs(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """
    플레이리스트의 노래 목록 조회 (앨범 그룹 정보 포함)
    """
    try:
        # 플레이리스트 존재 및 권한 확인
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
        
        # 플레이리스트 노래 목록 조회 (그룹 정보 포함)
        result = await db.execute(
            select(PlaylistSong, Song, Artist, Album)
            .join(Song, PlaylistSong.song_id == Song.id)
            .join(Artist, Song.artist_id == Artist.id)
            .outerjoin(Album, Song.album_id == Album.id)
            .where(PlaylistSong.playlist_id == playlist_id)
            .order_by(PlaylistSong.position)
        )
        
        songs_data = result.all()
        
        # 그룹화된 노래 목록 생성
        grouped_songs = {}
        individual_songs = []
        all_songs = []
        
        for playlist_song, song, artist, album in songs_data:
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
            
            song_info = {
                "id": song.id,
                "title": song.title,
                "duration_ms": song.duration_ms,
                "preview_url": song.preview_url,
                "spotify_id": song.spotify_id,
                "position": playlist_song.position,
                "added_at": playlist_song.added_at.isoformat() if playlist_song.added_at else None,
                "is_liked": is_liked,
                "artist": {
                    "id": artist.id,
                    "name": artist.name,
                    "image_url": artist.image_url
                },
                "album": {
                    "id": album.id if album else None,
                    "title": album.title if album else None,
                    "cover_url": album.cover_url if album else None
                } if album else None,
                # 앨범 그룹 정보
                "album_group_id": playlist_song.album_group_id,
                "album_group_name": playlist_song.album_group_name,
                "is_album_group": playlist_song.is_album_group or bool(playlist_song.album_group_id)
            }
            
            # 모든 노래 목록에 추가 (기존 호환성)
            all_songs.append(song_info)
            
            # 앨범 그룹이 있는 경우 그룹화
            if playlist_song.album_group_id:
                group_id = playlist_song.album_group_id
                if group_id not in grouped_songs:
                    grouped_songs[group_id] = {
                        "group_id": group_id,
                        "group_name": playlist_song.album_group_name,
                        "group_type": "album",
                        "songs": [],
                        "total_songs": 0,
                        "total_duration": 0
                    }
                
                grouped_songs[group_id]["songs"].append(song_info)
                grouped_songs[group_id]["total_songs"] += 1
                if song.duration_ms:
                    grouped_songs[group_id]["total_duration"] += song.duration_ms
            else:
                individual_songs.append(song_info)
        
        # 최종 응답 구성
        response_data = {
            "playlist_id": playlist_id,
            "total_songs": len(songs_data),
            "album_groups": list(grouped_songs.values()),
            "individual_songs": individual_songs,
            "all_songs": all_songs  # 기존 호환성을 위해 유지
        }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting playlist songs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="플레이리스트 조회 중 오류가 발생했습니다."
        )

# 앨범 그룹 전체 삭제
@router.delete("/{playlist_id}/album-group/{group_id}")
async def remove_album_group(
    playlist_id: int,
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """
    플레이리스트에서 앨범 그룹 전체 삭제
    """
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
        
        # 해당 그룹의 모든 노래 조회
        result = await db.execute(
            select(PlaylistSong)
            .where(
                and_(
                    PlaylistSong.playlist_id == playlist_id,
                    PlaylistSong.album_group_id == group_id
                )
            )
        )
        
        songs_to_delete = result.scalars().all()
        
        if not songs_to_delete:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Album group not found in playlist"
            )
        
        # 그룹 정보 저장
        group_name = songs_to_delete[0].album_group_name
        deleted_count = len(songs_to_delete)
        
        # 삭제 실행
        for song in songs_to_delete:
            await db.delete(song)
        
        await db.commit()
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "group_name": group_name,
            "message": f"앨범 '{group_name}'의 {deleted_count}곡이 삭제되었습니다."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error removing album group: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="앨범 그룹 삭제 중 오류가 발생했습니다."
        )

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
