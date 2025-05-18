from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# 플레이리스트 생성 DTO
class PlaylistCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = True

# 플레이리스트 업데이트 DTO
class PlaylistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

# 플레이리스트 응답 DTO
class PlaylistResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime]
    user_id: int

    class Config:
        from_attributes = True

# 플레이리스트에 노래 추가 DTO
class PlaylistSongAdd(BaseModel):
    song_id: int

# 플레이리스트 노래 응답 DTO
class PlaylistSongResponse(BaseModel):
    id: int
    title: str
    duration_ms: Optional[int]
    preview_url: Optional[str]
    added_at: datetime
    is_liked: bool
    artist: Dict[str, Any]
    album: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True