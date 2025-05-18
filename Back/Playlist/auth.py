import os
import requests
from dotenv import load_dotenv
from core.config import get_config

config = get_config()

def get_song_preview_url(song_id: int, spotify_id: str = None):
    """
    노래 미리듣기 URL 가져오기 함수
    """
    if not spotify_id:
        return None
    
    # Spotify API 토큰 발급
    url = "https://accounts.spotify.com/api/token"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "grant_type": "client_credentials",
        "client_id": config.SpotifyAPIKEY,
        "client_secret": config.SpotifySecretKey
    }
    
    response = requests.post(url, headers=headers, data=data)
    
    if response.status_code != 200:
        return None
    
    access_token = response.json().get("access_token")
    
    # 노래 정보 가져오기
    track_url = f"https://api.spotify.com/v1/tracks/{spotify_id}"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(track_url, headers=headers)
    
    if response.status_code != 200:
        return None
    
    return response.json().get("preview_url")