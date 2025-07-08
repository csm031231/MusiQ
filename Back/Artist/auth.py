import os
import requests
import time
from dotenv import load_dotenv
from core.config import get_config

config = get_config()

# 토큰 캐싱을 위한 전역 변수
_cached_token = None
_token_expires_at = 0

def get_spotify_access_token():
    """
    Spotify API 토큰 발급 함수 (캐싱 포함)
    """
    global _cached_token, _token_expires_at
    
    # 캐시된 토큰이 있고 만료되지 않았다면 재사용
    current_time = time.time()
    if _cached_token and current_time < _token_expires_at:
        return _cached_token
    
    try:
        url = "https://accounts.spotify.com/api/token"
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "grant_type": "client_credentials",
            "client_id": config.SpotifyAPIKEY,
            "client_secret": config.SpotifySecretKey
        }
        
        print(f"Requesting new Spotify token with client_id: {config.SpotifyAPIKEY[:8]}...")
        
        response = requests.post(url, headers=headers, data=data, timeout=10)
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("access_token")
            expires_in = token_data.get("expires_in", 3600)  # 기본 1시간
            
            # 토큰 캐싱 (만료 시간의 90%만 사용하여 안전 마진 확보)
            _cached_token = access_token
            _token_expires_at = current_time + (expires_in * 0.9)
            
            print("Spotify token obtained successfully")
            return access_token
        else:
            error_msg = f"Failed to get Spotify access token: {response.status_code} - {response.text}"
            print(error_msg)
            raise Exception(error_msg)
            
    except requests.exceptions.RequestException as e:
        error_msg = f"Network error when getting Spotify token: {str(e)}"
        print(error_msg)
        raise Exception(error_msg)
    except Exception as e:
        error_msg = f"Unexpected error when getting Spotify token: {str(e)}"
        print(error_msg)
        raise Exception(error_msg)

def test_spotify_connection():
    """
    Spotify API 연결 테스트 함수
    """
    try:
        token = get_spotify_access_token()
        
        # 간단한 API 호출로 연결 테스트
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get("https://api.spotify.com/v1/artists/4UXqAaa6dQYAk18Lv7PEgX", 
                              headers=headers, timeout=10)  # Fall Out Boy ID로 테스트
        
        if response.status_code == 200:
            artist_data = response.json()
            print(f"Spotify API connection test successful. Test artist: {artist_data['name']}")
            return True
        else:
            print(f"Spotify API test failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"Spotify connection test error: {str(e)}")
        return False