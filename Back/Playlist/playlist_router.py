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
from datetime import datetime

# 로거 설정
logging.basicConfig(level=logging.INFO)
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
    """플레이리스트에 노래 추가 - 디버깅 강화"""
    
    # 모든 입력 데이터 로깅
    print(f"\n=== 플레이리스트 노래 추가 요청 ===")
    print(f"playlist_id: {playlist_id} (type: {type(playlist_id)})")
    print(f"song_data: {song_data}")
    print(f"song_data.song_id: {song_data.song_id} (type: {type(song_data.song_id)})")
    print(f"current_user.id: {current_user.id}")
    print(f"================================\n")
    
    try:
        # 0. 기본 검증
        print("🔍 Step 0: 기본 검증 시작")
        
        if not song_data:
            print("❌ song_data가 None입니다")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="노래 데이터가 없습니다."
            )
        
        if not hasattr(song_data, 'song_id') or song_data.song_id is None:
            print("❌ song_id가 없습니다")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="song_id가 필요합니다."
            )
        
        # song_id 타입 확인 및 변환
        try:
            songIdNum = int(song_data.song_id)
            print(f"✅ song_id 변환 성공: {songIdNum}")
        except (ValueError, TypeError) as e:
            print(f"❌ song_id 변환 실패: {song_data.song_id} -> {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"유효하지 않은 song_id입니다: {song_data.song_id}"
            )
        
        if songIdNum <= 0:
            print(f"❌ song_id가 0 이하입니다: {songIdNum}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="song_id는 양수여야 합니다."
            )
        
        print("✅ Step 0 완료: 기본 검증 통과")
        
        # 1. 플레이리스트 권한 확인
        print("🔍 Step 1: 플레이리스트 권한 확인 시작")
        
        try:
            playlist_result = await db.execute(
                select(Playlist).where(
                    and_(
                        Playlist.id == playlist_id,
                        Playlist.user_id == current_user.id
                    )
                )
            )
            playlist = playlist_result.scalars().first()
            
            print(f"📝 플레이리스트 쿼리 결과: {playlist}")
            
            if not playlist:
                print(f"❌ 플레이리스트 {playlist_id} 찾을 수 없음 또는 권한 없음")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="해당 플레이리스트가 없거나 수정 권한이 없습니다."
                )
            
            print(f"✅ Step 1 완료: 플레이리스트 확인됨 - {playlist.title}")
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Step 1 DB 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"플레이리스트 확인 중 DB 오류: {str(e)}"
            )

        # 2. 노래 존재 확인
        print("🔍 Step 2: 노래 존재 확인 시작")
        
        try:
            song_result = await db.execute(
                select(Song).where(Song.id == songIdNum)
            )
            song = song_result.scalars().first()
            
            print(f"📝 노래 쿼리 결과: {song}")
            
            if not song:
                print(f"❌ 노래 {songIdNum} 찾을 수 없음")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"해당 노래(song_id: {songIdNum})를 찾을 수 없습니다."
                )
            
            print(f"✅ Step 2 완료: 노래 확인됨 - {song.title}")
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Step 2 DB 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"노래 확인 중 DB 오류: {str(e)}"
            )

        # 3. 중복 확인
        print("🔍 Step 3: 중복 확인 시작")
        
        try:
            existing_result = await db.execute(
                select(PlaylistSong).where(
                    and_(
                        PlaylistSong.playlist_id == playlist_id,
                        PlaylistSong.song_id == songIdNum
                    )
                )
            )
            existing_song = existing_result.scalars().first()
            
            print(f"📝 중복 확인 결과: {existing_song}")
            
            if existing_song:
                print(f"⚠️ 이미 존재하는 노래입니다")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이미 이 플레이리스트에 추가된 노래입니다."
                )
            
            print("✅ Step 3 완료: 중복 없음")
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Step 3 DB 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"중복 확인 중 DB 오류: {str(e)}"
            )

        # 4. position 계산
        print("🔍 Step 4: position 계산 시작")
        
        try:
            max_position_result = await db.execute(
                select(func.coalesce(func.max(PlaylistSong.position), 0))
                .where(PlaylistSong.playlist_id == playlist_id)
            )
            max_position = max_position_result.scalar() or 0
            new_position = max_position + 1
            
            print(f"📝 최대 position: {max_position}, 새 position: {new_position}")
            print("✅ Step 4 완료: position 계산됨")
            
        except Exception as e:
            print(f"❌ Step 4 DB 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Position 계산 중 DB 오류: {str(e)}"
            )

        # 5. 노래 추가
        print("🔍 Step 5: 노래 추가 시작")
        
        try:
            new_playlist_song = PlaylistSong(
                playlist_id=playlist_id,
                song_id=songIdNum,
                position=new_position,
                added_at=datetime.utcnow()
            )
            
            print(f"📝 새 PlaylistSong 객체: {new_playlist_song}")
            
            db.add(new_playlist_song)
            print("📝 DB에 추가됨, 커밋 시도...")
            
            await db.commit()
            print("✅ Step 5 완료: 커밋 성공")
            
        except Exception as e:
            print(f"❌ Step 5 DB 오류: {str(e)}")
            print(f"❌ 상세 에러 타입: {type(e)}")
            import traceback
            print(f"❌ 상세 스택 트레이스:\n{traceback.format_exc()}")
            
            await db.rollback()
            
            # 구체적인 에러 메시지 제공
            error_str = str(e).lower()
            if "foreign key" in error_str or "constraint" in error_str:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"데이터 무결성 오류: {str(e)}"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"노래 추가 중 DB 오류: {str(e)}"
                )

        print(f"🎉 모든 단계 완료! playlist_id={playlist_id}, song_id={songIdNum}, position={new_position}")

        return {
            "success": True,
            "message": "플레이리스트에 노래가 추가되었습니다.",
            "song_id": songIdNum,
            "position": new_position
        }

    except HTTPException:
        # HTTPException은 그대로 다시 발생
        raise
    except Exception as e:
        # 예상치 못한 에러
        print(f"💥 예상치 못한 전체 오류: {str(e)}")
        print(f"💥 에러 타입: {type(e)}")
        import traceback
        print(f"💥 전체 스택 트레이스:\n{traceback.format_exc()}")
        
        await db.rollback()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"예상치 못한 서버 오류: {str(e)}"
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