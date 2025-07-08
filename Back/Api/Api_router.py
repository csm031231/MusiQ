import requests
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from core.config import get_config
from core.database import provide_session
from Api.spotify_service import get_spotify_token, get_spotify_image
from Api.crud import save_track_to_db
from Api.dto import ChartResponse, SearchResponse

router = APIRouter(
    prefix="/api",
    tags=["api"]
)

config = get_config()

@router.get("/chartPage")
async def getTop100(db: AsyncSession = Depends(provide_session)):
    """
    Last.fm 차트 100곡 가져오기 + Spotify 이미지 포함
    """
    URL = 'http://ws.audioscrobbler.com/2.0/'

    params = {
        'method': 'chart.gettoptracks',
        'api_key': config.LastfmAPIKEY,
        'format': 'json',
        'limit': 100
    }

    try:
        # 1. Last.fm 차트 데이터 가져오기
        response = requests.get(URL, params=params, timeout=10)
        
        if response.status_code != 200:
            return {"error": f"Status code: {response.status_code}, Message: {response.text}"}
        
        data = response.json()
        tracks = data['tracks']['track']
        track_list = []
        
        print(f"Last.fm 차트 {len(tracks)}곡 가져오기 완료, Spotify 이미지 검색 시작...")
        
        # 2. 각 트랙에 대해 Spotify 이미지 가져오기
        for i, track in enumerate(tracks, start=1):
            track_name = track.get('name')
            artist_name = track.get('artist', {}).get('name')
            
            # Spotify 이미지 가져오기 (무조건 Spotify만 사용)
            spotify_image = None
            if track_name and artist_name:
                spotify_image = get_spotify_image(track_name, artist_name)
                if spotify_image:
                    print(f"✓ {i}/100 - {track_name} (Spotify 이미지 찾음)")
                else:
                    print(f"✗ {i}/100 - {track_name} (Spotify 이미지 없음)")
            
            # 추가: DB에 저장할 트랙 데이터 준비 (좋아요/플레이리스트 기능용)
            track_data_for_db = {
                'title': track_name,
                'artist': artist_name,
                'image_small': spotify_image,
                'playcount': track.get('playcount'),
                'listeners': track.get('listeners'),
                'url': track.get('url')
            }
            
            # 추가: DB에 저장하여 song_id 생성
            song_id = await save_track_to_db(db, track_data_for_db, "lastfm")
            
            track_info = {
                'rank': i,
                'title': track_name,
                'playcount': track.get('playcount'),
                'listeners': track.get('listeners'),
                'mbid': track.get('mbid'),
                'url': track.get('url'),
                'song_id': song_id,  # 추가: 좋아요/플레이리스트 기능을 위한 DB song_id
                'artist': {
                    'name': artist_name,
                    'mbid': track.get('artist', {}).get('mbid'),
                    'url': track.get('artist', {}).get('url')
                },
                'image_small': spotify_image,
                'image_source': 'spotify' if spotify_image else None
            }
            track_list.append(track_info)
        
        print(f"차트 데이터 처리 완료: {len(track_list)}곡")
        
        return {
            "tracks": track_list,
            "total_count": len(track_list),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Error in getTop100: {str(e)}")
        return {"error": f"Failed to fetch chart data: {str(e)}"}

@router.post("/searchPage")
async def search_result(query: str, db: AsyncSession = Depends(provide_session)):
    URL = 'https://api.spotify.com/v1/search'
    
    try:
        access_token = get_spotify_token()
    except Exception as e:
        return f"Failed to get access token: {str(e)}"
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    params = {
        'q': query,
        'type': 'album,track,artist',
        'limit': 10,
    }
    
    response = requests.get(URL, headers=headers, params=params)
    
    if response.status_code == 200:
        data = response.json()

        # 앨범 처리
        raw_albums = data.get('albums', {}).get('items', [])
        albums = []
        for album in raw_albums:
            album_summary = {
                'id': album.get('id'),
                'name': album.get('name'),
                'artists': [artist.get('name') for artist in album.get('artists', [])],
                'release_date': album.get('release_date'),
                'total_tracks': album.get('total_tracks'),
                'image': album.get('images', [{}])[0].get('url'),
                'url': album.get('external_urls', {}).get('spotify')
            }
            albums.append(album_summary)

        # 트랙 처리 (앨범 이미지 추가)
        raw_tracks = data.get('tracks', {}).get('items', [])
        tracks = []
        for track in raw_tracks:
            # 트랙의 앨범 이미지 가져오기
            album_images = track.get('album', {}).get('images', [])
            track_image = None
            if album_images:
                # 중간 크기 이미지 우선 선택 (300x300)
                for img in album_images:
                    if img.get('height') == 300:
                        track_image = img.get('url')
                        break
                # 중간 크기가 없으면 첫 번째 이미지 사용
                if not track_image:
                    track_image = album_images[0].get('url')
            
            # 추가: DB에 저장할 트랙 데이터 준비 (좋아요/플레이리스트 기능용)
            track_data_for_db = {
                'title': track.get('name'),
                'artist': track.get('artists', [{}])[0].get('name') if track.get('artists') else None,
                'album': track.get('album', {}).get('name'),
                'duration_ms': track.get('duration_ms'),
                'preview_url': track.get('preview_url'),
                'image_small': track_image,
                'spotify_id': track.get('id')
            }
            
            # 추가: DB에 저장하여 song_id 생성
            song_id = await save_track_to_db(db, track_data_for_db, "spotify")
            
            track_summary = {
                'id': track.get('id'),
                'name': track.get('name'),
                'artists': [artist.get('name') for artist in track.get('artists', [])],
                'album': track.get('album', {}).get('name'),
                'duration_ms': track.get('duration_ms'),
                'preview_url': track.get('preview_url'),
                'image': track_image,  # 앨범 이미지 추가
                'url': track.get('external_urls', {}).get('spotify'),
                'song_id': song_id  # 추가: 좋아요/플레이리스트 기능을 위한 DB song_id
            }
            tracks.append(track_summary)

        # 아티스트 처리
        raw_artists = data.get('artists', {}).get('items', [])
        artists = []
        for artist in raw_artists:
            artist_summary = {
                'id': artist.get('id'),
                'name': artist.get('name'),
                'genres': artist.get('genres'),
                'followers': artist.get('followers', {}).get('total'),
                'image': artist.get('images', [{}])[0].get('url'),
                'url': artist.get('external_urls', {}).get('spotify')
            }
            artists.append(artist_summary)

        search_Info = {
            'albums': albums,
            'tracks': tracks,
            'artists': artists
        }
        return search_Info

    else:
        error_message = f"Error: {response.status_code}, {response.text}"
        return error_message