import requests
import json
import asyncio
import aiohttp
from fastapi import APIRouter, HTTPException
from flask import Flask, render_template
from core.config import get_config
import urllib.parse
import base64
from datetime import datetime, timedelta
from typing import List, Optional

router = APIRouter(
    prefix="/api",
    tags=["api"]
)

token_info = {
    "access_token": None,
    "expires_at": None
}

config = get_config()

# 이미지 캐시 (메모리 캐시)
image_cache = {}

@router.get("/chartPage")
async def getTop100():
    URL = 'http://ws.audioscrobbler.com/2.0/'

    params = {
        'method': 'chart.gettoptracks',
        'api_key': config.LastfmAPIKEY,
        'format': 'json',
        'limit': 100
    }

    response = requests.get(URL, params=params)

    if response.status_code == 200:
        data = response.json()
        tracks = data['tracks']['track']
        track_list = []
        
        # 기본 트랙 정보 먼저 구성
        for i, track in enumerate(tracks, start=1):
            # Last.fm의 작은 이미지 추출
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
                'image_small': small_image  # 일단 Last.fm 이미지로 설정
            }
            track_list.append(track_info)
        
        # 병렬로 Spotify 이미지 가져오기 (상위 20개만)
        await update_spotify_images_parallel(track_list[:20])
            
        return track_list
    else:
        return {"error": f"Status code: {response.status_code}, Message: {response.text}"}

async def update_spotify_images_parallel(track_list: List[dict], batch_size: int = 10):
    """
    병렬로 Spotify 이미지를 가져와서 track_list 업데이트
    """
    try:
        access_token = get_spotify_token()
    except Exception as e:
        print(f"Failed to get Spotify token: {str(e)}")
        return
    
    # 배치 단위로 처리
    for i in range(0, len(track_list), batch_size):
        batch = track_list[i:i + batch_size]
        tasks = []
        
        async with aiohttp.ClientSession() as session:
            for track in batch:
                task = fetch_spotify_image_async(
                    session, 
                    access_token,
                    track.get('title'),
                    track.get('artist', {}).get('name'),
                    track
                )
                tasks.append(task)
            
            # 배치 단위로 병렬 실행
            await asyncio.gather(*tasks, return_exceptions=True)

async def fetch_spotify_image_async(session: aiohttp.ClientSession, access_token: str, 
                                  track_name: str, artist_name: str, track_info: dict):
    """
    비동기로 Spotify 이미지를 가져오는 함수
    """
    if not track_name or not artist_name:
        return
    
    # 캐시 키 생성
    cache_key = f"{track_name}_{artist_name}".lower()
    
    # 캐시에서 먼저 확인
    if cache_key in image_cache:
        if image_cache[cache_key]:
            track_info['image_small'] = image_cache[cache_key]
        return
    
    try:
        search_url = 'https://api.spotify.com/v1/search'
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        # 검색 쿼리 최적화
        query = f'"{track_name}" "{artist_name}"'
        params = {
            'q': query,
            'type': 'track',
            'limit': 1,
        }
        
        async with session.get(search_url, headers=headers, params=params) as response:
            if response.status == 200:
                data = await response.json()
                tracks = data.get('tracks', {}).get('items', [])
                
                if tracks:
                    track = tracks[0]
                    album_images = track.get('album', {}).get('images', [])
                    
                    if album_images:
                        # 적절한 크기의 이미지 선택
                        image_url = None
                        for img in album_images:
                            if img.get('height') == 300:  # medium size
                                image_url = img.get('url')
                                break
                        
                        if not image_url:
                            image_url = album_images[0].get('url')
                        
                        # 캐시에 저장
                        image_cache[cache_key] = image_url
                        track_info['image_small'] = image_url
                        return
            
            # 실패한 경우 캐시에 None 저장 (재요청 방지)
            image_cache[cache_key] = None
                        
    except Exception as e:
        print(f"Error fetching Spotify image for {track_name}: {str(e)}")
        image_cache[cache_key] = None

def get_spotify_token():
    global token_info

    CLIENT_ID = config.SpotifyAPIKEY
    CLIENT_SECRET = config.SpotifySecretKey

    # 토큰 만료 시간을 더 여유있게 확인 (10분 여유)
    if (token_info["access_token"] is None or 
        token_info["expires_at"] is None or 
        datetime.now() >= token_info["expires_at"] - timedelta(minutes=10)):
        
        # 인증 정보 인코딩
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
        token_info["expires_at"] = datetime.now() + timedelta(seconds=expires_in)
    
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
        'q': query,
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

# 레거시 함수 (하위 호환성을 위해 유지)
async def getspotifyimage(track_name, artist_name):
    """
    기존 함수와의 호환성을 위해 유지
    """
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
        
        response = requests.get(search_url, headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            tracks = data.get('tracks', {}).get('items', [])
            
            if tracks:
                track = tracks[0]
                album_images = track.get('album', {}).get('images', [])
                
                if album_images:
                    for img in album_images:
                        if img.get('height') == 300:
                            return img.get('url')
                    return album_images[0].get('url')
            
        return None
        
    except Exception as e:
        print(f"Error fetching Spotify image: {str(e)}")
        return None