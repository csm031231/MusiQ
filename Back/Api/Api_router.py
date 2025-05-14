import requests
import json
from fastapi import APIRouter
from flask import Flask, render_template
from core.config import get_config
import urllib.parse

router = APIRouter(
    prefix="/api",
    tags=["api"]
)

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


@router.post("/searchPage")
async def search_result( query: str):
    URL = 'https://api.spotify.com/v1/search'
    
    # API 키 가져오기 (config에서 가져오거나 환경 변수 사용)
    ACCESS_TOKEN = config.SpotifyAPIKEY
    
    headers = {
        'Authorization': f'Bearer {ACCESS_TOKEN}'
    }
    
    # API 요청 파라미터 설정
    params = {
        'q': urllib.parse.quote(query),  # 검색어
        'type': 'album,track,artist',  # 검색할 항목
        'limit': 20,  # 최대 결과 개수
    }
    
    # API 호출
    response = requests.get(URL, headers=headers, params=params)
    
    # 응답이 성공적인 경우
    if response.status_code == 200:
        data = response.json()
        albums = data.get('albums', {}).get('items', [])
        tracks = data.get('tracks', {}).get('items', [])
        artists = data.get('artists', {}).get('items', [])

        search_Info = {
            'albums': albums,
            'tracks': tracks,
            'artists': artists
        }
        return search_Info

    else:
        error_message = f"Error: {response.status_code}, {response.text}"
        return error_message

