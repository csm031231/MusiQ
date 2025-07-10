import requests
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from core.config import get_config
from core.database import provide_session
from Api.spotify_service import get_spotify_token, get_spotify_image
from Api.crud import save_track_to_db
from typing import Optional
from Api.dto import ChartResponse, SearchResponse

router = APIRouter(
    prefix="/api",
    tags=["api"]
)

config = get_config()

@router.get("/chartPage")
async def getTop100(db: AsyncSession = Depends(provide_session)):
    """
    Last.fm 차트 100곡 가져오기 + Spotify 상세 정보 포함
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
        
        print(f"Last.fm 차트 {len(tracks)}곡 가져오기 완료, Spotify 상세 정보 검색 시작...")
        
        # 2. 각 트랙에 대해 Spotify 상세 정보 가져오기
        for i, track in enumerate(tracks, start=1):
            track_name = track.get('name')
            artist_name = track.get('artist', {}).get('name')
            
            # Spotify에서 상세 정보 가져오기 (이미지 + 시간 + 앨범 정보)
            spotify_details = get_spotify_track_details_sync(track_name, artist_name)
            
            spotify_image = None
            duration_ms = None
            preview_url = None
            album_name = None
            
            if spotify_details:
                spotify_image = spotify_details.get('album_image')
                duration_ms = spotify_details.get('duration_ms')
                preview_url = spotify_details.get('preview_url')
                album_name = spotify_details.get('album_name')
                print(f"✓ {i}/100 - {track_name} (Spotify 상세 정보 찾음)")
            else:
                print(f"✗ {i}/100 - {track_name} (Spotify 정보 없음)")
            
            # DB에 저장할 트랙 데이터 준비 (상세 정보 포함)
            track_data_for_db = {
                'title': track_name,
                'artist': artist_name,
                'album': album_name,  # 앨범 정보 추가
                'duration_ms': duration_ms,  # 재생 시간 추가
                'preview_url': preview_url,  # 미리듣기 URL 추가
                'image_small': spotify_image,
                'playcount': track.get('playcount'),
                'listeners': track.get('listeners'),
                'url': track.get('url')
            }
            
            # DB에 저장하여 song_id 생성
            song_id = await save_track_to_db(db, track_data_for_db, "lastfm")
            
            track_info = {
                'rank': i,
                'title': track_name,
                'playcount': track.get('playcount'),
                'listeners': track.get('listeners'),
                'mbid': track.get('mbid'),
                'url': track.get('url'),
                'song_id': song_id,
                'artist': {
                    'name': artist_name,
                    'mbid': track.get('artist', {}).get('mbid'),
                    'url': track.get('artist', {}).get('url')
                },
                'album': album_name,  # 앨범 정보 추가
                'duration_ms': duration_ms,  # 재생 시간 추가
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

def get_spotify_track_details_sync(track_name: str, artist_name: str) -> Optional[dict]:
    """Spotify에서 트랙 상세 정보 가져오기 (동기 버전)"""
    try:
        access_token = get_spotify_token()
        
        search_url = 'https://api.spotify.com/v1/search'
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
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
                
                # 중간 크기 이미지 우선 선택
                album_images = album.get('images', [])
                album_image = None
                if album_images:
                    for img in album_images:
                        if img.get('height') == 300:
                            album_image = img.get('url')
                            break
                    if not album_image:
                        album_image = album_images[0].get('url')
                
                return {
                    'spotify_id': track.get('id'),
                    'duration_ms': track.get('duration_ms'),
                    'preview_url': track.get('preview_url'),
                    'album_name': album.get('name'),
                    'album_image': album_image
                }
        
        return None
                        
    except Exception as e:
        print(f"Error fetching Spotify details for {track_name} - {artist_name}: {str(e)}")
        return None

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

# 🆕 새로 추가: 앨범 트랙 조회 API
@router.get("/album/{album_id}/tracks")
async def get_album_tracks(album_id: str, db: AsyncSession = Depends(provide_session)):
    """
    Spotify 앨범의 모든 트랙 가져오기 + DB 저장
    """
    try:
        access_token = get_spotify_token()
        
        # 1. Spotify에서 앨범 트랙 목록 가져오기
        tracks_url = f'https://api.spotify.com/v1/albums/{album_id}/tracks'
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        # 모든 트랙을 가져오기 위해 limit을 50으로 설정하고 필요시 페이징
        params = {
            'limit': 50,
            'offset': 0
        }
        
        all_tracks = []
        
        while True:
            response = requests.get(tracks_url, headers=headers, params=params, timeout=10)
            
            if response.status_code != 200:
                return {"error": f"Spotify API error: {response.status_code} - {response.text}"}
            
            data = response.json()
            tracks = data.get('items', [])
            all_tracks.extend(tracks)
            
            # 다음 페이지가 있는지 확인
            if not data.get('next'):
                break
                
            params['offset'] += 50
        
        print(f"앨범 {album_id}에서 총 {len(all_tracks)}개 트랙 발견")
        
        # 2. 앨범 정보도 가져오기 (그룹화를 위해)
        album_url = f'https://api.spotify.com/v1/albums/{album_id}'
        album_response = requests.get(album_url, headers=headers, timeout=10)
        
        album_info = {}
        if album_response.status_code == 200:
            album_data = album_response.json()
            album_info = {
                'id': album_data.get('id'),
                'name': album_data.get('name'),
                'artists': [artist.get('name') for artist in album_data.get('artists', [])],
                'release_date': album_data.get('release_date'),
                'total_tracks': album_data.get('total_tracks'),
                'image': album_data.get('images', [{}])[0].get('url') if album_data.get('images') else None
            }
        
        # 3. 각 트랙을 DB에 저장하고 song_id 생성
        track_list = []
        
        for i, track in enumerate(all_tracks, 1):
            track_name = track.get('name')
            artists = track.get('artists', [])
            artist_name = artists[0].get('name') if artists else None
            
            if not track_name or not artist_name:
                continue
            
            # 트랙 상세 정보 구성
            track_data_for_db = {
                'title': track_name,
                'artist': artist_name,
                'album': album_info.get('name'),
                'duration_ms': track.get('duration_ms'),
                'preview_url': track.get('preview_url'),
                'spotify_id': track.get('id'),
                'track_number': track.get('track_number'),  # 트랙 번호 추가
                'disc_number': track.get('disc_number', 1),  # 디스크 번호 추가
                'image_small': album_info.get('image')
            }
            
            # DB에 저장하여 song_id 생성
            song_id = await save_track_to_db(db, track_data_for_db, "spotify")
            
            if song_id:
                track_info = {
                    'spotify_id': track.get('id'),
                    'song_id': song_id,
                    'name': track_name,
                    'artists': [artist.get('name') for artist in artists],
                    'duration_ms': track.get('duration_ms'),
                    'preview_url': track.get('preview_url'),
                    'track_number': track.get('track_number'),
                    'disc_number': track.get('disc_number', 1),
                    'url': track.get('external_urls', {}).get('spotify'),
                    'album_info': album_info  # 앨범 정보 포함
                }
                track_list.append(track_info)
        
        print(f"DB 저장 완료: {len(track_list)}개 트랙")
        
        return {
            "album": album_info,
            "tracks": track_list,
            "total_tracks": len(track_list),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Error in get_album_tracks: {str(e)}")
        return {"error": f"Failed to fetch album tracks: {str(e)}"}