from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ArtistCommentCreate(BaseModel):
    content: str

class ArtistCommentOut(BaseModel):
    id: int
    artist_id: str
    user_id: int
    content: str
    created_at: datetime
    username: str  # 댓글 작성자 이름 추가

    class Config:
        from_attributes = True

# Spotify 아티스트 응답 DTO
class SpotifyArtistOut(BaseModel):
    id: str
    name: str
    genres: List[str]
    image_url: Optional[str]
    popularity: int
    followers: int
    is_favorite: bool = False  # 현재 사용자가 관심 있는 아티스트인지 여부

    @classmethod
    def from_spotify_response(cls, data: dict, is_favorite: bool = False):
        return cls(
            id=data["id"],
            name=data["name"],
            genres=data.get("genres", []),
            image_url=data["images"][0]["url"] if data.get("images") else None,
            popularity=data.get("popularity", 0),
            followers=data.get("followers", {}).get("total", 0),
            is_favorite=is_favorite
        )