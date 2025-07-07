from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# 사용자 스키마
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    # nickname을 선택사항으로 변경하고, 기본값을 username으로 설정하도록 백엔드에서 처리
    nickname: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    nickname: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserResponse(UserBase):
    id: int
    nickname: Optional[str]
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# 로그인 스키마 - 이메일로 변경
class UserLogin(BaseModel):
    email: EmailStr  # username에서 email로 변경
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# 관심 아티스트 스키마
class FavoriteArtistAdd(BaseModel):
    artist_id: str

class FavoriteArtist(BaseModel):
    id: str
    name: str
    image_url: Optional[str]

    class Config:
        from_attributes = True