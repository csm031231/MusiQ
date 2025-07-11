from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import provide_session
from core.models import User, Playlist, PlaylistSong, Song, UserLikedSong, Artist, Album
from User.user_router import get_current_user
from Playlist.dto import (
    PlaylistCreate, PlaylistResponse, PlaylistUpdate, 
    PlaylistSongAdd, PlaylistSongResponse, AlbumAddToPlaylist
)
from typing import List, Optional, Dict, Any
from sqlalchemy.future import select
from sqlalchemy import and_, delete, func
from pydantic import BaseModel
import traceback
import logging
from datetime import datetime
import httpx #모듈 깔았음
import os

# 로거 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/playlists",
    tags=["playlists"]
)

# Spotify API 관련 함수들
async def get_spotify_access_token() -> str:
    """Spotify API 액세스 토큰 가져오기"""
    try:
        client_id = os.getenv("SPOTIFY_CLIENT_ID")
        client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        
        if not client_id or not client_secret:
            raise ValueError("Spotify 클라이언트 정보가 설정되지 않았습니다")
        
        auth_url = "https://accounts.spotify.com/api/token"
        auth_data = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(auth_url, data=auth_data)
            
            if response.status_code != 200:
                raise HTTPException(500, "Spotify 토큰 획득 실패")
            
            token_data = response.json()
            return token_data.get("access_token")
            
    except Exception as e:
        logger.error(f"Spotify 토큰 오류: {str(e)}")
        raise HTTPException(500, f"Spotify API 인증 실패: {str(e)}")

async def get_album_tracks(album_id: str) -> List[Dict]:
    """Spotify API에서 앨범의 트랙 목록을 가져오는 함수"""
    try:
        spotify_token = await get_spotify_access_token()
        
        headers = {
            "Authorization": f"Bearer {spotify_token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            # 앨범 정보 가져오기
            album_response = await client.get(
                f"https://api.spotify.com/v1/albums/{album_id}",
                headers=headers
            )
            
            if album_response.status_code != 200:
                logger.error(f"Spotify 앨범 조회 오류: {album_response.status_code}")
                return []
            
            album_data = album_response.json()
            album_name = album_data.get('name', 'Unknown Album')
            album_cover = album_data.get('images', [{}])[0].get('url') if album_data.get('images') else None
            
            # 트랙 목록 가져오기
            tracks_response = await client.get(
                f"https://api.spotify.com/v1/albums/{album_id}/tracks",
                headers=headers,
                params={"limit": 50}
            )
            
            if tracks_response.status_code != 200:
                logger.error(f"Spotify 트랙 조회 오류: {tracks_response.status_code}")
                return []
            
            tracks_data = tracks_response.json()
            tracks = []
            
            for track in tracks_data.get('items', []):
                track_info = {
                    'spotify_id': track.get('id'),
                    'title': track.get('name'),
                    'duration_ms': track.get('duration_ms'),
                    'preview_url': track.get('preview_url'),
                    'track_number': track.get('track_number'),
                    'album_name': album_name,
                    'album_cover': album_cover,
                    'artists': [artist.get('name') for artist in track.get('artists', [])]
                }
                tracks.append(track_info)
            
            return tracks
            
    except Exception as e:
        logger.error(f"앨범 트랙 조회 오류: {str(e)}")
        return []

async def save_track_to_db(db: AsyncSession, track_data: Dict, source: str = "spotify") -> Optional[int]:
    """트랙 정보를 데이터베이스에 저장하고 song_id 반환"""
    try:
        # 이미 존재하는 노래인지 확인 (Spotify ID로)
        if track_data.get('spotify_id'):
            existing_song = await db.execute(
                select(Song).where(Song.spotify_id == track_data['spotify_id'])
            )
            existing = existing_song.scalars().first()
            if existing:
                return existing.id
        
        # 아티스트 처리
        artist_id = None
        if track_data.get('artists') and len(track_data['artists']) > 0:
            artist_name = track_data['artists'][0]  # 첫 번째 아티스트 사용
            
            # 아티스트 존재 확인
            artist_result = await db.execute(
                select(Artist).where(Artist.name == artist_name)
            )
            artist = artist_result.scalars().first()
            
            if not artist:
                # 새 아티스트 생성
                new_artist = Artist(
                    name=artist_name,
                    spotify_id=None,  # 필요시 별도로 아티스트 정보 조회
                    image_url=None
                )
                db.add(new_artist)
                await db.flush()  # ID 생성을 위해 flush
                artist_id = new_artist.id
            else:
                artist_id = artist.id
        
        # 앨범 처리
        album_id = None
        if track_data.get('album_name'):
            album_result = await db.execute(
                select(Album).where(Album.title == track_data['album_name'])
            )
            album = album_result.scalars().first()
            
            if not album:
                # 새 앨범 생성
                new_album = Album(
                    title=track_data['album_name'],
                    cover_url=track_data.get('album_cover'),
                    artist_id=artist_id,
                    spotify_id=None,  # 필요시 별도로 앨범 정보 조회
                    release_date=None
                )
                db.add(new_album)
                await db.flush()
                album_id = new_album.id
            else:
                album_id = album.id
        
        # 노래 생성
        new_song = Song(
            title=track_data.get('title', 'Unknown Title'),
            duration_ms=track_data.get('duration_ms'),
            preview_url=track_data.get('preview_url'),
            spotify_id=track_data.get('spotify_id'),
            artist_id=artist_id,
            album_id=album_id
        )
        
        db.add(new_song)
        await db.flush()  # ID 생성을 위해 flush
        
        return new_song.id
        
    except Exception as e:
        logger.error(f"트랙 저장 오류: {str(e)}")
        return None

# 플레이리스트 생성
@router.post("/", response_model=PlaylistResponse, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    playlist_data: PlaylistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """새 플레이리스트 생성"""
    try:
        logger.info(f"사용자 {current_user.id}가 플레이리스트 생성 시도: {playlist_data.title}")
        
        new_playlist = Playlist(
            title=playlist_data.title,
            description=playlist_data.description,
            is_public=playlist_data.is_public,
            user_id=current_user.id
        )
        
        db.add(new_playlist)
        await db.commit()
        await db.refresh(new_playlist)
        
        logger.info(f"플레이리스트 생성 완료: {new_playlist.id}")
        return new_playlist
        
    except Exception as e:
        await db.rollback()
        logger.error(f"플레이리스트 생성 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"플레이리스트 생성 중 오류가 발생했습니다: {str(e)}"
        )

# 사용자의 플레이리스트 목록 조회
@router.get("/my-playlists", response_model=List[PlaylistResponse])
async def get_my_playlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """현재 사용자의 플레이리스트 목록 조회"""
    try:
        logger.info(f"사용자 {current_user.id}의 플레이리스트 목록 조회")
        
        result = await db.execute(
            select(Playlist)
            .where(Playlist.user_id == current_user.id)
            .order_by(Playlist.created_at.desc())
        )
        
        playlists = result.scalars().all()
        logger.info(f"플레이리스트 {len(playlists)}개 조회됨")
        return playlists
        
    except Exception as e:
        logger.error(f"플레이리스트 목록 조회 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"플레이리스트 목록 조회 중 오류가 발생했습니다: {str(e)}"
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
        logger.info(f"플레이리스트 {playlist_id} 조회")
        
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
            logger.warning(f"플레이리스트 {playlist_id} 찾을 수 없음")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to access it"
            )
        
        return playlist
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"플레이리스트 조회 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"플레이리스트 조회 중 오류가 발생했습니다: {str(e)}"
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
        logger.info(f"플레이리스트 {playlist_id} 업데이트 시도")
        
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
            logger.warning(f"업데이트할 플레이리스트 {playlist_id} 찾을 수 없음")
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
        
        # updated_at 필드 수동 업데이트
        playlist.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(playlist)
        
        logger.info(f"플레이리스트 {playlist_id} 업데이트 완료")
        return playlist
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"플레이리스트 업데이트 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"플레이리스트 수정 중 오류가 발생했습니다: {str(e)}"
        )

# 플레이리스트의 노래 목록 조회
@router.get("/{playlist_id}/songs")
async def get_playlist_songs(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트의 노래 목록 조회"""
    try:
        logger.info(f"플레이리스트 {playlist_id} 노래 목록 조회 시작")
        
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
            logger.warning(f"플레이리스트 {playlist_id} 찾을 수 없음")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to access it"
            )
        
        # 2. 플레이리스트 노래 목록 조회
        playlist_songs_result = await db.execute(
            select(PlaylistSong)
            .where(PlaylistSong.playlist_id == playlist_id)
            .order_by(PlaylistSong.position.asc())
        )
        
        playlist_songs = playlist_songs_result.scalars().all()
        logger.info(f"플레이리스트에 {len(playlist_songs)}개 노래 발견")
        
        if not playlist_songs:
            return {
                "playlist_id": playlist_id,
                "playlist_title": playlist.title,
                "total_songs": 0,
                "all_songs": []
            }
        
        # 3. 노래 정보 조회 (안전한 JOIN)
        song_ids = [ps.song_id for ps in playlist_songs]
        
        try:
            songs_result = await db.execute(
                select(Song, Artist, Album)
                .outerjoin(Artist, Song.artist_id == Artist.id)
                .outerjoin(Album, Song.album_id == Album.id)
                .where(Song.id.in_(song_ids))
            )
            
            songs_data = {}
            for row in songs_result.all():
                song, artist, album = row
                songs_data[song.id] = (song, artist, album)
            
        except Exception as query_error:
            logger.error(f"노래 정보 조회 중 오류: {str(query_error)}")
            # 기본 노래 정보만 조회
            songs_result = await db.execute(
                select(Song).where(Song.id.in_(song_ids))
            )
            songs_data = {song.id: (song, None, None) for song in songs_result.scalars().all()}
        
        # 4. 좋아요 정보 조회
        try:
            liked_songs_result = await db.execute(
                select(UserLikedSong.song_id)
                .where(
                    and_(
                        UserLikedSong.user_id == current_user.id,
                        UserLikedSong.song_id.in_(song_ids)
                    )
                )
            )
            liked_song_ids = {row[0] for row in liked_songs_result.all()}
        except Exception as like_error:
            logger.error(f"좋아요 정보 조회 중 오류: {str(like_error)}")
            liked_song_ids = set()
        
        # 5. 결과 구성
        all_songs = []
        for playlist_song in playlist_songs:
            song_data = songs_data.get(playlist_song.song_id)
            if not song_data:
                logger.warning(f"노래 ID {playlist_song.song_id} 데이터 없음")
                continue
                
            song, artist, album = song_data
            
            # 안전한 데이터 구성
            song_info = {
                "id": song.id,
                "title": song.title or "Unknown Title",
                "duration_ms": song.duration_ms,
                "preview_url": song.preview_url,
                "spotify_id": getattr(song, 'spotify_id', None),
                "position": playlist_song.position,
                "added_at": playlist_song.added_at.isoformat() if playlist_song.added_at else None,
                "is_liked": song.id in liked_song_ids,
                "artist": {
                    "id": artist.id if artist else None,
                    "name": artist.name if artist else "Unknown Artist",
                    "image_url": getattr(artist, 'image_url', None) if artist else None
                } if artist else {
                    "id": None,
                    "name": "Unknown Artist",
                    "image_url": None
                },
                "album": {
                    "id": album.id if album else None,
                    "title": album.title if album else None,
                    "cover_url": getattr(album, 'cover_url', None) if album else None
                } if album else None
            }
            
            all_songs.append(song_info)
        
        logger.info(f"플레이리스트 {playlist_id} 노래 목록 조회 완료: {len(all_songs)}개")
        
        return {
            "playlist_id": playlist_id,
            "playlist_title": playlist.title,
            "total_songs": len(all_songs),
            "all_songs": all_songs
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"플레이리스트 노래 조회 오류: {str(e)}")
        traceback.print_exc()
        
        # 오류 발생 시 기본 응답
        try:
            playlist_result = await db.execute(
                select(Playlist).where(Playlist.id == playlist_id)
            )
            playlist = playlist_result.scalars().first()
            playlist_title = playlist.title if playlist else "Unknown Playlist"
        except:
            playlist_title = "Unknown Playlist"
        
        return {
            "playlist_id": playlist_id,
            "playlist_title": playlist_title,
            "total_songs": 0,
            "all_songs": [],
            "error": str(e)
        }

# 플레이리스트에 단일 노래 추가
@router.post("/{playlist_id}/songs")
async def add_song_to_playlist(
    playlist_id: int,
    song_data: PlaylistSongAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트에 단일 노래 추가 - 간단 버전"""
    
    print(f"\n=== 단일 노래 추가 시작 ===")
    print(f"playlist_id: {playlist_id}")
    print(f"song_id: {song_data.song_id}")
    print(f"user_id: {current_user.id}")
    
    try:
        # 1. 기본 검증
        if not song_data.song_id or song_data.song_id <= 0:
            raise HTTPException(400, "유효하지 않은 song_id입니다")
        
        # 2. 플레이리스트 권한 확인
        playlist_result = await db.execute(
            select(Playlist).where(
                and_(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
            )
        )
        playlist = playlist_result.scalars().first()
        if not playlist:
            raise HTTPException(404, "플레이리스트를 찾을 수 없거나 권한이 없습니다")
        
        # 3. 노래 존재 확인
        song_result = await db.execute(select(Song).where(Song.id == song_data.song_id))
        song = song_result.scalars().first()
        if not song:
            raise HTTPException(404, "노래를 찾을 수 없습니다")
        
        # 4. 중복 확인
        existing_result = await db.execute(
            select(PlaylistSong).where(
                and_(
                    PlaylistSong.playlist_id == playlist_id,
                    PlaylistSong.song_id == song_data.song_id
                )
            )
        )
        if existing_result.scalars().first():
            raise HTTPException(400, "이미 플레이리스트에 있는 노래입니다")
        
        # 5. position 계산
        max_position_result = await db.execute(
            select(func.coalesce(func.max(PlaylistSong.position), 0))
            .where(PlaylistSong.playlist_id == playlist_id)
        )
        max_position = max_position_result.scalar() or 0
        new_position = max_position + 1
        
        # 6. 노래 추가 - 앨범 그룹 필드는 기본값으로 설정
        new_playlist_song = PlaylistSong(
            playlist_id=playlist_id,
            song_id=song_data.song_id,
            position=new_position,
            added_at=datetime.utcnow(),
            # 앨범 그룹 관련 필드들은 기본값(None/False)으로 설정
            album_group_id=None,
            album_group_name=None,
            is_album_group=False
        )
        
        db.add(new_playlist_song)
        await db.commit()
        
        print(f"✅ 노래 추가 성공: song_id={song_data.song_id}, position={new_position}")
        
        return {
            "success": True,
            "message": "플레이리스트에 노래가 추가되었습니다",
            "song_id": song_data.song_id,
            "position": new_position
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"❌ 예상치 못한 오류: {str(e)}")
        import traceback
        print(f"스택 트레이스: {traceback.format_exc()}")
        raise HTTPException(500, f"서버 오류: {str(e)}")
    
    print(f"=== 단일 노래 추가 완료 ===\n")

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
        logger.info(f"플레이리스트 {playlist_id}에서 노래 {song_id} 제거 시도")
        
        # 플레이리스트 권한 확인
        playlist_result = await db.execute(
            select(Playlist).where(
                and_(
                    Playlist.id == playlist_id,
                    Playlist.user_id == current_user.id
                )
            )
        )
        
        playlist = playlist_result.scalars().first()
        if not playlist:
            logger.warning(f"플레이리스트 {playlist_id} 권한 없음")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to modify it"
            )
        
        # 노래 제거
        delete_result = await db.execute(
            delete(PlaylistSong).where(
                and_(
                    PlaylistSong.playlist_id == playlist_id,
                    PlaylistSong.song_id == song_id
                )
            )
        )
        
        await db.commit()
        
        if delete_result.rowcount == 0:
            logger.warning(f"플레이리스트 {playlist_id}에서 노래 {song_id} 찾을 수 없음")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Song not found in playlist"
            )
        
        logger.info(f"노래 제거 성공: {song_id} from 플레이리스트 {playlist_id}")
        
        return {
            "success": True,
            "message": "Song removed from playlist successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"노래 제거 중 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"노래 삭제 중 오류가 발생했습니다: {str(e)}"
        )

# 노래 좋아요 추가/삭제 (수정된 부분)
@router.post("/like-song/{song_id}")
async def toggle_like_song(
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """노래 좋아요 토글"""
    try:
        logger.info(f"노래 {song_id} 좋아요 토글 시도")
        
        # 노래 존재 확인
        song_result = await db.execute(
            select(Song).where(Song.id == song_id)
        )
        
        song = song_result.scalars().first()
        if not song:
            logger.warning(f"노래 {song_id} 찾을 수 없음")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Song not found"
            )
        
        # 좋아요 상태 확인
        liked_result = await db.execute(
            select(UserLikedSong).where(
                and_(
                    UserLikedSong.user_id == current_user.id,
                    UserLikedSong.song_id == song_id
                )
            )
        )
        
        liked_song = liked_result.scalars().first()
        
        if liked_song:
            # 좋아요 취소 (수정된 부분)
            await db.execute(
                delete(UserLikedSong).where(
                    and_(
                        UserLikedSong.user_id == current_user.id,
                        UserLikedSong.song_id == song_id
                    )
                )
            )
            await db.commit()
            logger.info(f"노래 {song_id} 좋아요 취소")
            return {
                "success": True,
                "is_liked": False,
                "message": "Song unliked successfully"
            }
        else:
            # 좋아요 추가
            new_liked_song = UserLikedSong(
                user_id=current_user.id,
                song_id=song_id,
                liked_at=datetime.utcnow()
            )
            db.add(new_liked_song)
            await db.commit()
            logger.info(f"노래 {song_id} 좋아요 추가")
            return {
                "success": True,
                "is_liked": True,
                "message": "Song liked successfully"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"좋아요 토글 중 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"좋아요 처리 중 오류가 발생했습니다: {str(e)}"
        )

# 좋아요한 노래 목록 조회
@router.get("/liked-songs")
async def get_liked_songs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """사용자가 좋아요한 노래 목록 조회"""
    try:
        logger.info(f"사용자 {current_user.id}의 좋아요 노래 목록 조회")
        
        result = await db.execute(
            select(UserLikedSong, Song, Artist, Album)
            .join(Song, UserLikedSong.song_id == Song.id)
            .outerjoin(Artist, Song.artist_id == Artist.id)
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
        
        logger.info(f"좋아요 노래 {len(liked_songs)}개 조회 완료")
        
        return {
            "total_liked_songs": len(liked_songs),
            "liked_songs": liked_songs
        }
        
    except Exception as e:
        logger.error(f"좋아요 목록 조회 중 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"좋아요한 노래 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

# 플레이리스트 삭제 (수정된 부분)
@router.delete("/{playlist_id}")
async def delete_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트 삭제"""
    try:
        logger.info(f"플레이리스트 {playlist_id} 삭제 시도")
        
        # 1. 플레이리스트 존재 및 권한 확인
        playlist_result = await db.execute(
            select(Playlist).where(
                and_(
                    Playlist.id == playlist_id,
                    Playlist.user_id == current_user.id
                )
            )
        )
        
        playlist = playlist_result.scalars().first()
        if not playlist:
            logger.warning(f"플레이리스트 {playlist_id} 찾을 수 없음 또는 권한 없음")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found or you don't have permission to delete it"
            )
        
        playlist_title = playlist.title
        
        # 2. 관련 노래들 먼저 삭제
        delete_songs_result = await db.execute(
            delete(PlaylistSong).where(PlaylistSong.playlist_id == playlist_id)
        )
        deleted_songs_count = delete_songs_result.rowcount
        
        # 3. 플레이리스트 삭제 (수정된 부분 - delete 쿼리 사용)
        await db.execute(
            delete(Playlist).where(
                and_(
                    Playlist.id == playlist_id,
                    Playlist.user_id == current_user.id
                )
            )
        )
        
        # 4. 커밋
        await db.commit()
        
        logger.info(f"플레이리스트 삭제 완료: {playlist_title} (노래 {deleted_songs_count}개 함께 삭제)")
        
        return {
            "success": True,
            "message": f"플레이리스트 '{playlist_title}'가 삭제되었습니다.",
            "deleted_songs_count": deleted_songs_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"플레이리스트 삭제 중 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"플레이리스트 삭제 중 오류가 발생했습니다: {str(e)}"
        )
        
# playlist_router.py - 앨범 추가용 별도 엔드포인트
@router.post("/{playlist_id}/add-album")
async def add_album_to_playlist(
    playlist_id: int,
    album_data: AlbumAddToPlaylist,  # DTO에 album_id 필드 있어야 함
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트에 앨범 전체 추가 - 별도 엔드포인트"""
    
    print(f"\n=== 앨범 추가 시작 ===")
    print(f"playlist_id: {playlist_id}")
    print(f"album_id: {album_data.album_id}")
    
    try:
        # 1. 플레이리스트 권한 확인
        playlist_result = await db.execute(
            select(Playlist).where(
                and_(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
            )
        )
        playlist = playlist_result.scalars().first()
        if not playlist:
            raise HTTPException(404, "플레이리스트를 찾을 수 없거나 권한이 없습니다")
        
        # 2. 앨범 트랙들 가져오기
        tracks = await get_album_tracks(album_data.album_id)  # Spotify API 호출
        
        if not tracks:
            raise HTTPException(404, "앨범 트랙을 찾을 수 없습니다")
        
        # 3. 그룹 ID 생성
        album_group_id = f"album_{album_data.album_id}_{int(datetime.utcnow().timestamp())}"
        album_name = tracks[0].get('album_name', 'Unknown Album') if tracks else 'Unknown Album'
        
        added_count = 0
        skipped_count = 0
        
        # 4. 현재 최대 position 계산
        max_position_result = await db.execute(
            select(func.coalesce(func.max(PlaylistSong.position), 0))
            .where(PlaylistSong.playlist_id == playlist_id)
        )
        current_max_position = max_position_result.scalar() or 0
        
        # 5. 각 트랙을 처리
        for i, track in enumerate(tracks):
            try:
                # 트랙을 DB에 저장
                song_id = await save_track_to_db(db, track, "spotify")
                
                if song_id:
                    # 중복 확인
                    existing = await db.execute(
                        select(PlaylistSong).where(
                            and_(
                                PlaylistSong.playlist_id == playlist_id,
                                PlaylistSong.song_id == song_id
                            )
                        )
                    )
                    
                    if not existing.scalars().first():
                        # 앨범 그룹으로 추가
                        new_position = current_max_position + i + 1
                        playlist_song = PlaylistSong(
                            playlist_id=playlist_id,
                            song_id=song_id,
                            position=new_position,
                            added_at=datetime.utcnow(),
                            album_group_id=album_group_id,
                            album_group_name=album_name,
                            is_album_group=True
                        )
                        
                        db.add(playlist_song)
                        added_count += 1
                        logger.info(f"트랙 추가됨: {track.get('title')} (position: {new_position})")
                    else:
                        skipped_count += 1
                        logger.info(f"중복 트랙 건너뜀: {track.get('title')}")
                else:
                    logger.warning(f"트랙 저장 실패: {track.get('title')}")
                    skipped_count += 1
                    
            except Exception as track_error:
                logger.error(f"트랙 처리 중 오류: {track.get('title')} - {str(track_error)}")
                skipped_count += 1
                continue
        
        # 6. 커밋
        await db.commit()
        
        logger.info(f"앨범 추가 완료: {added_count}개 추가, {skipped_count}개 건너뜀")
        
        return {
            "success": True,
            "message": f"앨범 '{album_name}'이 플레이리스트에 추가되었습니다",
            "added_count": added_count,
            "skipped_count": skipped_count,
            "album_group_id": album_group_id,
            "album_name": album_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"앨범 추가 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(500, f"앨범 추가 중 오류가 발생했습니다: {str(e)}")
    
    print(f"=== 앨범 추가 완료 ===\n")

# 플레이리스트 노래 순서 변경
@router.put("/{playlist_id}/songs/{song_id}/position")
async def update_song_position(
    playlist_id: int,
    song_id: int,
    new_position: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """플레이리스트 내 노래 순서 변경"""
    try:
        logger.info(f"노래 {song_id} 위치 변경: {new_position}")
        
        # 플레이리스트 권한 확인
        playlist_result = await db.execute(
            select(Playlist).where(
                and_(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
            )
        )
        if not playlist_result.scalars().first():
            raise HTTPException(404, "플레이리스트를 찾을 수 없거나 권한이 없습니다")
        
        # 현재 노래의 위치 확인
        current_song_result = await db.execute(
            select(PlaylistSong).where(
                and_(
                    PlaylistSong.playlist_id == playlist_id,
                    PlaylistSong.song_id == song_id
                )
            )
        )
        current_song = current_song_result.scalars().first()
        if not current_song:
            raise HTTPException(404, "플레이리스트에서 노래를 찾을 수 없습니다")
        
        old_position = current_song.position
        
        if old_position == new_position:
            return {"success": True, "message": "위치가 동일합니다"}
        
        # 다른 노래들의 위치 조정
        if old_position < new_position:
            # 아래로 이동: old_position+1 ~ new_position 사이의 노래들을 위로 이동
            await db.execute(
                select(PlaylistSong).where(
                    and_(
                        PlaylistSong.playlist_id == playlist_id,
                        PlaylistSong.position > old_position,
                        PlaylistSong.position <= new_position
                    )
                ).execution_options(synchronize_session="evaluate")
            )
            # 실제 업데이트
            await db.execute(
                PlaylistSong.__table__.update().where(
                    and_(
                        PlaylistSong.playlist_id == playlist_id,
                        PlaylistSong.position > old_position,
                        PlaylistSong.position <= new_position
                    )
                ).values(position=PlaylistSong.position - 1)
            )
        else:
            # 위로 이동: new_position ~ old_position-1 사이의 노래들을 아래로 이동
            await db.execute(
                PlaylistSong.__table__.update().where(
                    and_(
                        PlaylistSong.playlist_id == playlist_id,
                        PlaylistSong.position >= new_position,
                        PlaylistSong.position < old_position
                    )
                ).values(position=PlaylistSong.position + 1)
            )
        
        # 대상 노래의 위치 업데이트
        current_song.position = new_position
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"노래 위치가 {old_position}에서 {new_position}으로 변경되었습니다"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"위치 변경 오류: {str(e)}")
        raise HTTPException(500, f"위치 변경 중 오류가 발생했습니다: {str(e)}")