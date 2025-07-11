from pydantic import BaseModel, validator
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
    
    @validator('song_id')
    def validate_song_id(cls, v):
        if v is None:
            raise ValueError('song_id는 필수입니다')
        
        # 문자열인 경우 숫자로 변환 시도
        if isinstance(v, str):
            try:
                v = int(v)
            except ValueError:
                raise ValueError(f'song_id는 숫자여야 합니다: {v}')
        
        if not isinstance(v, int):
            raise ValueError(f'song_id는 정수여야 합니다: {v}')
        
        if v <= 0:
            raise ValueError(f'song_id는 양수여야 합니다: {v}')
        
        return v

    class Config:
        # JSON 예시
        schema_extra = {
            "example": {
                "song_id": 123
            }
        }

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
        
# 앨범 추가를 위한 DTO
class AlbumAddToPlaylist(BaseModel):
    album_id: str