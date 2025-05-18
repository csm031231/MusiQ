import os
import requests
from dotenv import load_dotenv
from core.config import get_config

config = get_config()

def get_spotify_access_token():
    """
    Spotify API 토큰 발급 함수
    """
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
    
    if response.status_code == 200:
        access_token = response.json().get("access_token")
        return access_token
    else:
        raise Exception(f"Failed to get access token: {response.json()}")