# Api/crud.py 수정사항

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from core.models import Song, Artist, Album
import requests
from core.config import get_config

config = get_config()

async def save_track_to_db(db: AsyncSession, track_data: dict, source: str = "lastfm") -> Optional[int]:
    """트랙 정보를 DB에 저장하고 song_id 반환 - 상세 정보 포함"""
    try:
        track_name = track_data.get('title') or track_data.get('name')
        
        # 아티스트 이름 추출
        if isinstance(track_data.get('artist'), dict):
            artist_name = track_data.get('artist', {}).get('name')
        elif isinstance(track_data.get('artist'), str):
            artist_name = track_data.get('artist')
        else:
            artist_name = None
        
        if not track_name or not artist_name:
            return None
        
        # Spotify에서 상세 정보 가져오기 (시간, 앨범 정보 등)
        spotify_data = await get_spotify_track_details(track_name, artist_name)
        
        # 아티스트 ID 생성 (특수문자 처리)
        artist_id = f"{source}_{artist_name.lower().replace(' ', '_').replace('&', 'and').replace('/', '_')}"
        
        # 아티스트가 이미 있는지 확인
        result = await db.execute(select(Artist).where(Artist.id == artist_id))
        artist = result.scalars().first()
        
        if not artist:
            # 새 아티스트 생성
            artist = Artist(
                id=artist_id,
                name=artist_name,
                image_url=track_data.get('artist_image'),
                spotify_id=spotify_data.get('artist_spotify_id') if spotify_data else None,
                lastfm_id=track_data.get('artist_lastfm_id')
            )
            db.add(artist)
            await db.flush()
        
        # 앨범 처리 - Spotify 데이터 우선 사용
        album = None
        album_title = None
        
        if spotify_data and spotify_data.get('album_name'):
            album_title = spotify_data['album_name']
        elif track_data.get('album'):
            if isinstance(track_data['album'], str):
                album_title = track_data['album']
            elif isinstance(track_data['album'], dict):
                album_title = track_data['album'].get('name')
                
        if album_title:
            result = await db.execute(
                select(Album).where(
                    Album.title == album_title,
                    Album.artist_id == artist_id
                )
            )
            album = result.scalars().first()
            
            if not album:
                album = Album(
                    title=album_title,
                    artist_id=artist_id,
                    cover_url=spotify_data.get('album_image') if spotify_data else (track_data.get('image_small') or track_data.get('image')),
                    spotify_id=spotify_data.get('album_spotify_id') if spotify_data else None
                )
                db.add(album)
                await db.flush()
        
        # 트랙이 이미 있는지 확인
        result = await db.execute(
            select(Song).where(
                Song.title == track_name,
                Song.artist_id == artist_id
            )
        )
        existing_song = result.scalars().first()
        
        if existing_song:
            # 기존 노래가 있으면 정보 업데이트 (시간 정보 등)
            if spotify_data and spotify_data.get('duration_ms') and not existing_song.duration_ms:
                existing_song.duration_ms = spotify_data['duration_ms']
            if spotify_data and spotify_data.get('preview_url') and not existing_song.preview_url:
                existing_song.preview_url = spotify_data['preview_url']
            if spotify_data and spotify_data.get('spotify_id') and not existing_song.spotify_id:
                existing_song.spotify_id = spotify_data['spotify_id']
            if album and not existing_song.album_id:
                existing_song.album_id = album.id
                
            await db.commit()
            return existing_song.id
        
        # 새 트랙 생성 - Spotify 데이터 포함
        duration_ms = None
        preview_url = None
        spotify_id = None
        
        if spotify_data:
            duration_ms = spotify_data.get('duration_ms')
            preview_url = spotify_data.get('preview_url')
            spotify_id = spotify_data.get('spotify_id')
        
        # 기존 데이터에서도 확인
        if not duration_ms:
            duration_ms = track_data.get('duration_ms')
        if not preview_url:
            preview_url = track_data.get('preview_url')
        if not spotify_id:
            spotify_id = track_data.get('spotify_id') or track_data.get('id')
        
        new_song = Song(
            title=track_name,
            duration_ms=duration_ms,
            spotify_id=spotify_id,
            preview_url=preview_url,
            artist_id=artist_id,
            album_id=album.id if album else None
        )
        
        db.add(new_song)
        await db.commit()
        await db.refresh(new_song)
        
        return new_song.id
        
    except Exception as e:
        print(f"Error saving track to DB: {str(e)}")
        await db.rollback()
        return None

async def get_spotify_track_details(track_name: str, artist_name: str) -> Optional[dict]:
    """Spotify에서 트랙 상세 정보 가져오기 (시간, 앨범 등)"""
    try:
        # Spotify API 토큰 가져오기
        from Api.spotify_service import get_spotify_token
        access_token = get_spotify_token()
        
        search_url = 'https://api.spotify.com/v1/search'
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        # 검색 쿼리
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
                
                return {
                    'spotify_id': track.get('id'),
                    'duration_ms': track.get('duration_ms'),
                    'preview_url': track.get('preview_url'),
                    'album_name': album.get('name'),
                    'album_spotify_id': album.get('id'),
                    'album_image': album.get('images', [{}])[0].get('url') if album.get('images') else None,
                    'artist_spotify_id': artists[0].get('id') if artists else None
                }
        
        return None
                        
    except Exception as e:
        print(f"Error fetching Spotify track details for {track_name} - {artist_name}: {str(e)}")
        return None