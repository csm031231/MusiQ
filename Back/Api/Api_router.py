import requests
import json
import base64
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from core.config import get_config
from typing import List, Optional, Dict

router = APIRouter(
    prefix="/api",
    tags=["api"]
)

# 토큰 정보 저장
token_info = {
    "access_token": None,
    "expires_at": None
}

config = get_config()

def get_spotify_token():
    """Spotify API 토큰 가져오기"""
    global token_info

    CLIENT_ID = config.SpotifyAPIKEY
    CLIENT_SECRET = config.SpotifySecretKey

    # 토큰이 없거나 만료 예정인 경우 새로 발급
    if (token_info["access_token"] is None or 
        token_info["expires_at"] is None or 
        datetime.now() >= token_info["expires_at"] - timedelta(minutes=10)):
        
        try:
            auth_bytes = f"{CLIENT_ID}:{CLIENT_SECRET}".encode('ascii')
            auth_base64 = base64.b64encode(auth_bytes).decode('ascii')
            
            auth_url = 'https://accounts.spotify.com/api/token'
            headers = {
                'Authorization': f'Basic {auth_base64}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            data = {'grant_type': 'client_credentials'}
            
            response = requests.post(auth_url, headers=headers, data=data, timeout=10)
            
            if response.status_code != 200:
                raise Exception(f"Failed to get Spotify token: {response.text}")
            
            token_data = response.json()
            token_info["access_token"] = token_data["access_token"]
            expires_in = token_data.get("expires_in", 3600)
            token_info["expires_at"] = datetime.now() + timedelta(seconds=expires_in)
            
            print("Successfully obtained Spotify token")
            
        except Exception as e:
            print(f"Error getting Spotify token: {str(e)}")
            raise Exception(f"Failed to get Spotify token: {str(e)}")
    
    return token_info["access_token"]

def get_spotify_image(track_name: str, artist_name: str) -> Optional[str]:
    """Spotify에서 트랙 이미지 가져오기"""
    try:
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
                album_images = track.get('album', {}).get('images', [])
                
                if album_images:
                    # 300x300 크기 우선 선택, 없으면 첫 번째 이미지
                    for img in album_images:
                        if img.get('height') == 300:
                            return img.get('url')
                    
                    return album_images[0].get('url')
        
        return None
                        
    except Exception as e:
        print(f"Error fetching Spotify image for {track_name} - {artist_name}: {str(e)}")
        return None

@router.get("/chartPage")
async def getTop100():
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
            
            track_info = {
                'rank': i,
                'title': track_name,
                'playcount': track.get('playcount'),
                'listeners': track.get('listeners'),
                'mbid': track.get('mbid'),
                'url': track.get('url'),
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
async def search_result(query: str):
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
            
            track_summary = {
                'id': track.get('id'),
                'name': track.get('name'),
                'artists': [artist.get('name') for artist in track.get('artists', [])],
                'album': track.get('album', {}).get('name'),
                'duration_ms': track.get('duration_ms'),
                'preview_url': track.get('preview_url'),
                'image': track_image,  # 앨범 이미지 추가
                'url': track.get('external_urls', {}).get('spotify')
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