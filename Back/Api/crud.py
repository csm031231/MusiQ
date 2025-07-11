# Api/crud.py 수정사항

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from core.models import Song, Artist, Album
import requests
from core.config import get_config

config = get_config()

async def save_track_to_db(db: AsyncSession, track_data: dict, source: str = "lastfm") -> Optional[int]:
    """트랙 정보를 DB에 저장하고 song_id 반환 - 강화된 버전"""
    
    # 세이브포인트 생성 (부분 롤백 가능)
    savepoint = await db.begin_nested()
    
    try:
        print(f"🎵 save_track_to_db 시작: {track_data}")
        
        # 1. 필수 데이터 검증
        track_name = track_data.get('title') or track_data.get('name')
        
        # 아티스트 이름 추출 (여러 형태 지원)
        artist_name = None
        if isinstance(track_data.get('artist'), dict):
            artist_name = track_data.get('artist', {}).get('name')
        elif isinstance(track_data.get('artist'), str):
            artist_name = track_data.get('artist')
        elif isinstance(track_data.get('artist'), list) and len(track_data.get('artist', [])) > 0:
            artist_name = track_data.get('artist')[0]
        
        # 필수 데이터 검증
        if not track_name or not isinstance(track_name, str) or len(track_name.strip()) == 0:
            print(f"❌ 유효하지 않은 track_name: {track_name}")
            await savepoint.rollback()
            return None
            
        if not artist_name or not isinstance(artist_name, str) or len(artist_name.strip()) == 0:
            print(f"❌ 유효하지 않은 artist_name: {artist_name}")
            await savepoint.rollback()
            return None
        
        # 데이터 정리
        track_name = track_name.strip()
        artist_name = artist_name.strip()
        
        print(f"✅ 유효한 데이터: '{track_name}' by '{artist_name}'")
        
        # 2. 아티스트 ID 생성 및 처리
        try:
            # 특수문자 처리를 더 안전하게
            safe_artist_name = (artist_name.lower()
                               .replace(' ', '_')
                               .replace('&', 'and')
                               .replace('/', '_')
                               .replace('(', '')
                               .replace(')', '')
                               .replace('[', '')
                               .replace(']', '')
                               .replace('"', '')
                               .replace("'", '')
                               .replace('.', '')
                               .replace(',', '')
                               .replace('!', '')
                               .replace('?', ''))
            
            artist_id = f"{source}_{safe_artist_name}"
            print(f"🎤 아티스트 ID 생성: {artist_id}")
            
            # 아티스트 확인/생성
            result = await db.execute(select(Artist).where(Artist.id == artist_id))
            artist = result.scalars().first()
            
            if not artist:
                print(f"🆕 새 아티스트 생성: {artist_name}")
                artist = Artist(
                    id=artist_id,
                    name=artist_name,
                    image_url=track_data.get('artist_image'),
                    spotify_id=None,  # 나중에 업데이트
                    lastfm_id=track_data.get('artist_lastfm_id')
                )
                db.add(artist)
                await db.flush()  # ID 즉시 생성
                print(f"✅ 아티스트 저장 완료: {artist_id}")
            else:
                print(f"♻️ 기존 아티스트 사용: {artist_name}")
                
        except Exception as artist_error:
            print(f"❌ 아티스트 처리 중 오류: {str(artist_error)}")
            await savepoint.rollback()
            return None
        
        # 3. 앨범 처리 (선택적)
        album = None
        try:
            album_title = None
            
            # 앨범명 추출
            if track_data.get('album'):
                if isinstance(track_data['album'], str):
                    album_title = track_data['album'].strip()
                elif isinstance(track_data['album'], dict):
                    album_title = track_data['album'].get('name', '').strip()
            
            if album_title and len(album_title) > 0:
                print(f"💿 앨범 처리: {album_title}")
                
                # 기존 앨범 확인
                result = await db.execute(
                    select(Album).where(
                        Album.title == album_title,
                        Album.artist_id == artist_id
                    )
                )
                album = result.scalars().first()
                
                if not album:
                    print(f"🆕 새 앨범 생성: {album_title}")
                    album = Album(
                        title=album_title,
                        artist_id=artist_id,
                        cover_url=track_data.get('image_small') or track_data.get('image'),
                        spotify_id=None  # 나중에 업데이트
                    )
                    db.add(album)
                    await db.flush()
                    print(f"✅ 앨범 저장 완료")
                else:
                    print(f"♻️ 기존 앨범 사용: {album_title}")
                    
        except Exception as album_error:
            print(f"⚠️ 앨범 처리 중 오류 (무시): {str(album_error)}")
            album = None  # 앨범은 선택적이므로 실패해도 계속 진행
        
        # 4. 트랙 확인/생성
        try:
            print(f"🔍 기존 트랙 확인: '{track_name}' by '{artist_id}'")
            
            # 기존 트랙 확인
            result = await db.execute(
                select(Song).where(
                    Song.title == track_name,
                    Song.artist_id == artist_id
                )
            )
            existing_song = result.scalars().first()
            
            if existing_song:
                print(f"♻️ 기존 트랙 발견: song_id={existing_song.id}")
                
                # 기존 트랙 정보 업데이트 (선택적)
                updated = False
                try:
                    if track_data.get('duration_ms') and not existing_song.duration_ms:
                        existing_song.duration_ms = track_data['duration_ms']
                        updated = True
                    if track_data.get('preview_url') and not existing_song.preview_url:
                        existing_song.preview_url = track_data['preview_url']
                        updated = True
                    if track_data.get('spotify_id') and not existing_song.spotify_id:
                        existing_song.spotify_id = track_data['spotify_id']
                        updated = True
                    if album and not existing_song.album_id:
                        existing_song.album_id = album.id
                        updated = True
                    
                    if updated:
                        await db.flush()
                        print(f"✅ 기존 트랙 업데이트 완료")
                        
                except Exception as update_error:
                    print(f"⚠️ 기존 트랙 업데이트 실패 (무시): {str(update_error)}")
                
                await savepoint.commit()
                return existing_song.id
            
            # 새 트랙 생성
            print(f"🆕 새 트랙 생성: '{track_name}'")
            
            new_song = Song(
                title=track_name,
                duration_ms=track_data.get('duration_ms'),
                spotify_id=track_data.get('spotify_id'),
                preview_url=track_data.get('preview_url'),
                artist_id=artist_id,
                album_id=album.id if album else None
            )
            
            db.add(new_song)
            await db.flush()  # ID 즉시 생성
            
            print(f"✅ 새 트랙 저장 완료: song_id={new_song.id}")
            
            await savepoint.commit()
            return new_song.id
            
        except Exception as song_error:
            print(f"❌ 트랙 처리 중 오류: {str(song_error)}")
            await savepoint.rollback()
            return None
        
    except Exception as e:
        print(f"❌ save_track_to_db 전체 오류: {str(e)}")
        import traceback
        print(f"📋 상세 오류 정보:\n{traceback.format_exc()}")
        await savepoint.rollback()
        return None

async def get_spotify_track_details(track_name: str, artist_name: str) -> Optional[dict]:
    """Spotify에서 트랙 상세 정보 가져오기 - 개선된 버전"""
    try:
        print(f"🎧 Spotify 상세 정보 요청: '{track_name}' by '{artist_name}'")
        
        # Spotify API 토큰 가져오기
        from Api.spotify_service import get_spotify_token
        access_token = get_spotify_token()
        
        search_url = 'https://api.spotify.com/v1/search'
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        # 검색 쿼리 (더 정확한 매칭을 위해)
        query = f'track:"{track_name}" artist:"{artist_name}"'
        params = {
            'q': query,
            'type': 'track',
            'limit': 1,
        }
        
        response = requests.get(search_url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            tracks = data.get('tracks', {}).get('items', [])
            
            if tracks:
                track = tracks[0]
                album = track.get('album', {})
                artists = track.get('artists', [])
                
                # 이미지 URL 추출
                album_images = album.get('images', [])
                album_image = None
                if album_images:
                    # 300x300 크기 우선, 없으면 첫 번째
                    for img in album_images:
                        if img.get('height') == 300:
                            album_image = img.get('url')
                            break
                    if not album_image and album_images:
                        album_image = album_images[0].get('url')
                
                result = {
                    'spotify_id': track.get('id'),
                    'duration_ms': track.get('duration_ms'),
                    'preview_url': track.get('preview_url'),
                    'album_name': album.get('name'),
                    'album_spotify_id': album.get('id'),
                    'album_image': album_image,
                    'artist_spotify_id': artists[0].get('id') if artists else None
                }
                
                print(f"✅ Spotify 상세 정보 획득: {result}")
                return result
        
        print(f"⚠️ Spotify에서 트랙을 찾을 수 없음")
        return None
                        
    except Exception as e:
        print(f"❌ Spotify 상세 정보 가져오기 실패: {str(e)}")
        return None