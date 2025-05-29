import requests
import json
import asyncio
import aiohttp
from fastapi import APIRouter, HTTPException, BackgroundTasks
from flask import Flask, render_template
from core.config import get_config
import urllib.parse
import base64
from datetime import datetime, timedelta
from typing import List, Optional, Dict

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
# 차트 데이터 캐시
chart_cache = {
    "data": None,
    "last_updated": None
}

@router.get("/chartPage")
async def getTop100(background_tasks: BackgroundTasks):
    """
    단계별 로딩: 
    1. Last.fm 데이터를 빠르게 반환
    2. 백그라운드에서 Spotify 이미지 업데이트
    """
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
        
        # Last.fm 데이터로 기본 구성 (빠른 응답)
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
                'image_small': small_image,
                'spotify_image_loaded': False  # Spotify 이미지 로딩 상태
            }
            track_list.append(track_info)
        
        # 차트 데이터 캐시에 저장
        chart_cache["data"] = track_list
        chart_cache["last_updated"] = datetime.now()
        
        # 백그라운드에서 Spotify 이미지 업데이트 시작
        background_tasks.add_task(update_spotify_images_background, track_list)
            
        return {
            "tracks": track_list,
            "spotify_loading": True,
            "total_count": len(track_list)
        }
    else:
        return {"error": f"Status code: {response.status_code}, Message: {response.text}"}

@router.get("/spotify-images")
async def get_spotify_images():
    """
    Spotify 이미지 업데이트 상태 확인 및 업데이트된 데이터 반환
    """
    if chart_cache["data"] is None:
        return {"error": "No chart data available"}
    
    # 업데이트된 이미지가 있는 트랙들만 반환
    updated_tracks = []
    for track in chart_cache["data"]:
        if track.get("spotify_image_loaded", False):
            updated_tracks.append({
                "rank": track["rank"],
                "image_small": track["image_small"],
                "spotify_image_loaded": True
            })
    
    return {
        "updated_tracks": updated_tracks,
        "completed": len(updated_tracks) == len(chart_cache["data"])
    }

@router.post("/update-single-image")
async def update_single_spotify_image(track_name: str, artist_name: str, rank: int):
    """
    개별 트랙의 Spotify 이미지 업데이트
    """
    try:
        access_token = get_spotify_token()
        spotify_image = await get_spotify_image_async(access_token, track_name, artist_name)
        
        if spotify_image and chart_cache["data"]:
            # 캐시 업데이트
            for track in chart_cache["data"]:
                if track["rank"] == rank:
                    track["image_small"] = spotify_image
                    track["spotify_image_loaded"] = True
                    break
        
        return {
            "rank": rank,
            "image_url": spotify_image,
            "success": spotify_image is not None
        }
    except Exception as e:
        return {"error": str(e), "rank": rank, "success": False}

async def update_spotify_images_background(track_list: List[dict]):
    """
    백그라운드에서 실행되는 Spotify 이미지 업데이트
    """
    try:
        access_token = get_spotify_token()
        
        # 배치 단위로 처리 (20개씩)
        batch_size = 20
        for i in range(0, len(track_list), batch_size):
            batch = track_list[i:i + batch_size]
            
            async with aiohttp.ClientSession() as session:
                tasks = []
                for track in batch:
                    task = update_track_spotify_image(
                        session, 
                        access_token,
                        track
                    )
                    tasks.append(task)
                
                # 배치 단위로 병렬 실행
                await asyncio.gather(*tasks, return_exceptions=True)
                
                # 배치 처리 후 잠깐 대기 (API 레이트 리밋 방지)
                await asyncio.sleep(0.1)
                
    except Exception as e:
        print(f"Background Spotify image update failed: {str(e)}")

async def update_track_spotify_image(session: aiohttp.ClientSession, access_token: str, track_info: dict):
    """
    개별 트랙의 Spotify 이미지 업데이트
    """
    track_name = track_info.get('title')
    artist_name = track_info.get('artist', {}).get('name')
    
    if not track_name or not artist_name:
        return
    
    # 캐시 키 생성
    cache_key = f"{track_name}_{artist_name}".lower()
    
    # 캐시에서 먼저 확인
    if cache_key in image_cache:
        if image_cache[cache_key]:
            track_info['image_small'] = image_cache[cache_key]
            track_info['spotify_image_loaded'] = True
        return
    
    try:
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
        
        async with session.get(search_url, headers=headers, params=params) as response:
            if response.status == 200:
                data = await response.json()
                tracks = data.get('tracks', {}).get('items', [])
                
                if tracks:
                    track = tracks[0]
                    album_images = track.get('album', {}).get('images', [])
                    
                    if album_images:
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
                        track_info['spotify_image_loaded'] = True
                        return
            
            # 실패한 경우 캐시에 None 저장
            image_cache[cache_key] = None
                        
    except Exception as e:
        print(f"Error fetching Spotify image for {track_name}: {str(e)}")
        image_cache[cache_key] = None

async def get_spotify_image_async(access_token: str, track_name: str, artist_name: str) -> Optional[str]:
    """
    단일 Spotify 이미지 비동기 조회
    """
    if not track_name or not artist_name:
        return None
    
    cache_key = f"{track_name}_{artist_name}".lower()
    
    if cache_key in image_cache:
        return image_cache[cache_key]
    
    try:
        async with aiohttp.ClientSession() as session:
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
            
            async with session.get(search_url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    tracks = data.get('tracks', {}).get('items', [])
                    
                    if tracks:
                        track = tracks[0]
                        album_images = track.get('album', {}).get('images', [])
                        
                        if album_images:
                            image_url = None
                            for img in album_images:
                                if img.get('height') == 300:
                                    image_url = img.get('url')
                                    break
                            
                            if not image_url:
                                image_url = album_images[0].get('url')
                            
                            image_cache[cache_key] = image_url
                            return image_url
                
                image_cache[cache_key] = None
                return None
                            
    except Exception as e:
        print(f"Error fetching Spotify image: {str(e)}")
        image_cache[cache_key] = None
        return None

def get_spotify_token():
    global token_info

    CLIENT_ID = config.SpotifyAPIKEY
    CLIENT_SECRET = config.SpotifySecretKey

    if (token_info["access_token"] is None or 
        token_info["expires_at"] is None or 
        datetime.now() >= token_info["expires_at"] - timedelta(minutes=10)):
        
        auth_bytes = f"{CLIENT_ID}:{CLIENT_SECRET}".encode('ascii')
        auth_base64 = base64.b64encode(auth_bytes).decode('ascii')
        
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
        
        token_data = response.json()
        token_info["access_token"] = token_data["access_token"]
        expires_in = token_data.get("expires_in", 3600)
        token_info["expires_at"] = datetime.now() + timedelta(seconds=expires_in)
    
    return token_info["access_token"]

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