import requests
import base64
from datetime import datetime, timedelta
from typing import Optional
from core.config import get_config

config = get_config()

# 토큰 정보 저장
token_info = {
    "access_token": None,
    "expires_at": None
}

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