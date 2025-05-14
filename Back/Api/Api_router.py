import requests
import json
from fastapi import APIRouter, HTTPException
from flask import Flask, render_template
from core.config import get_config
import urllib.parse
import base64
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/api",
    tags=["api"]
)

token_info = {
    "access_token": None,
    "expires_at": None
}

config = get_config()

@router.get("chartPage")
async def getTop100():

    URL = 'http://ws.audioscrobbler.com/2.0/'

    params = {
        'method': 'chart.gettoptracks',
        'api_key': config.LastfmAPIKEY,
        'format': 'json',
        'limit': 100
    }

    response = requests.get(URL, params=params)

    response = requests.get(URL, params=params)
    if response.status_code == 200:
        data = response.json()
        tracks = data['tracks']['track']
        track_list = []
        
        for i, track in enumerate(tracks, start=1):
            # 작은 이미지 (size="small")만 추출
            small_image = next(
                (img.get('#text') for img in track.get('image', []) if img.get('size') == 'small'),
                None
            )
            
            track_info = {
                'rank': i,
                'title': track.get('name'),
                'playcount': track.get('playcount'),
                'listeners': track.get('listeners'),
                'mbid': track.get('mbid'),
                'url': track.get('url'),
                'artist': {
                    'name': track.get('artist', {}).get('name'),
                    'mbid': track.get('artist', {}).get('mbid'),
                    'url': track.get('artist', {}).get('url')
                },
                'image_small': small_image
            }
            track_list.append(track_info)
            
        # 프론트엔드로 JSON 직접 반환
        return track_list
    else:
        # 에러 발생 시 에러 메시지 반환
        return {"error": f"Status code: {response.status_code}, Message: {response.text}"}

def get_spotify_token():
    global token_info

    CLIENT_ID = config.SpotifyAPIKEY
    CLIENT_SECRET = config.SpotifySecretKey

    
    if token_info["access_token"] is None or token_info["expires_at"] is None or datetime.now() >= token_info["expires_at"]:
        # 인증 정보 인코딩 - 이 부분 수정
        auth_bytes = f"{CLIENT_ID}:{CLIENT_SECRET}".encode('ascii')
        auth_base64 = base64.b64encode(auth_bytes).decode('ascii')
        
        # 토큰 요청
        auth_url = 'https://accounts.spotify.com/api/token'
        headers = {
            'Authorization': f'Basic {auth_base64}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        data = {'grant_type': 'client_credentials'}
        
        response = requests.post(auth_url, headers=headers, data=data)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, 
                                detail=f"Failed to get Spotify token: {response.text}")
        
        # 응답에서 토큰 정보 추출
        token_data = response.json()
        token_info["access_token"] = token_data["access_token"]
        # 만료 시간 설정 (보통 3600초, 1시간)
        expires_in = token_data.get("expires_in", 3600)
        token_info["expires_at"] = datetime.now() + timedelta(seconds=expires_in - 300)  # 5분 여유 두기
    
    return token_info["access_token"]

@router.post("/searchPage")
async def search_result(query: str):
    URL = 'https://api.spotify.com/v1/search'
    
    # 매 요청마다 유효한 토큰 가져오기
    try:
        access_token = get_spotify_token()
    except Exception as e:
        return f"Failed to get access token: {str(e)}"
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    # API 요청 파라미터 설정
    params = {
        'q': query,  # urllib.parse.quote()는 requests가 자동으로 처리
        'type': 'album,track,artist',
        'limit': 10,
    }
    
    # API 호출
    response = requests.get(URL, headers=headers, params=params)
    
    # 응답이 성공적인 경우
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
                # 'available_markets': album.get('available_markets')  # 필요하면 이 줄을 주석 해제
            }
            albums.append(album_summary)

        # 트랙 처리
        raw_tracks = data.get('tracks', {}).get('items', [])
        tracks = []
        for track in raw_tracks:
            track_summary = {
                'id': track.get('id'),
                'name': track.get('name'),
                'artists': [artist.get('name') for artist in track.get('artists', [])],
                'album': track.get('album', {}).get('name'),
                'duration_ms': track.get('duration_ms'),
                'preview_url': track.get('preview_url'),
                'url': track.get('external_urls', {}).get('spotify')
                # 'available_markets': track.get('available_markets')  # 필요 시 주석 해제
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

