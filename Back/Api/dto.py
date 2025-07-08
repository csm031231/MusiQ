from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# 차트 응답 관련 DTO
class ArtistInfo(BaseModel):
    name: str
    mbid: Optional[str] = None
    url: Optional[str] = None

class ChartTrack(BaseModel):
    rank: int
    title: str
    playcount: str
    listeners: str
    mbid: Optional[str] = None
    url: str
    song_id: Optional[int] = None
    artist: ArtistInfo
    image_small: Optional[str] = None
    image_source: Optional[str] = None

class ChartResponse(BaseModel):
    tracks: List[ChartTrack]
    total_count: int
    timestamp: str

# 검색 응답 관련 DTO
class SearchAlbum(BaseModel):
    id: str
    name: str
    artists: List[str]
    release_date: Optional[str] = None
    total_tracks: Optional[int] = None
    image: Optional[str] = None
    url: str

class SearchTrack(BaseModel):
    id: str
    name: str
    artists: List[str]
    album: Optional[str] = None
    duration_ms: Optional[int] = None
    preview_url: Optional[str] = None
    image: Optional[str] = None
    url: str
    song_id: Optional[int] = None

class SearchArtist(BaseModel):
    id: str
    name: str
    genres: Optional[List[str]] = None
    followers: Optional[int] = None
    image: Optional[str] = None
    url: str

class SearchResponse(BaseModel):
    albums: List[SearchAlbum]
    tracks: List[SearchTrack]
    artists: List[SearchArtist]

# DB 저장용 내부 DTO
class TrackDataForDB(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    duration_ms: Optional[int] = None
    preview_url: Optional[str] = None
    image_small: Optional[str] = None
    image: Optional[str] = None
    spotify_id: Optional[str] = None
    playcount: Optional[str] = None
    listeners: Optional[str] = None
    url: Optional[str] = None
    artist_image: Optional[str] = None
    artist_spotify_id: Optional[str] = None
    artist_lastfm_id: Optional[str] = None