from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, delete
from typing import List, Optional, Dict, Any
from core.models import User, Artist, user_favorite_artist
from User.dto import UserCreate, UserUpdate, FavoriteArtist
from passlib.context import CryptContext

# 비밀번호 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """비밀번호 해싱 함수"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증 함수"""
    return pwd_context.verify(plain_password, hashed_password)

async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """사용자 ID로 조회 함수"""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalars().first()

async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    """사용자명으로 조회 함수"""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalars().first()

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """이메일로 조회 함수"""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()

async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """사용자 생성 함수"""
    hashed_password = hash_password(user_data.password)
    
    # nickname이 없으면 username을 기본값으로 사용
    nickname = user_data.nickname if user_data.nickname else user_data.username
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        nickname=nickname
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

async def update_user(db: AsyncSession, user: User, update_data: Dict[str, Any]) -> User:
    """사용자 정보 업데이트 함수"""
    for key, value in update_data.items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user

async def change_password(db: AsyncSession, user: User, new_password: str) -> bool:
    """비밀번호 변경 함수"""
    user.hashed_password = hash_password(new_password)
    await db.commit()
    return True

async def get_favorite_artists(db: AsyncSession, user_id: int) -> List[Artist]:
    """관심 아티스트 목록 조회 함수"""
    result = await db.execute(
        select(Artist).join(
            user_favorite_artist,
            and_(
                user_favorite_artist.c.artist_id == Artist.id,
                user_favorite_artist.c.user_id == user_id
            )
        )
    )
    return result.scalars().all()

async def add_favorite_artist(db: AsyncSession, user_id: int, artist_id: str) -> bool:
    """관심 아티스트 추가 함수"""
    stmt = user_favorite_artist.insert().values(
        user_id=user_id,
        artist_id=artist_id
    )
    await db.execute(stmt)
    await db.commit()
    return True

async def remove_favorite_artist(db: AsyncSession, user_id: int, artist_id: str) -> bool:
    """관심 아티스트 삭제 함수"""
    stmt = user_favorite_artist.delete().where(
        and_(
            user_favorite_artist.c.user_id == user_id,
            user_favorite_artist.c.artist_id == artist_id
        )
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0

async def check_favorite_artist(db: AsyncSession, user_id: int, artist_id: str) -> bool:
    """관심 아티스트 여부 확인 함수"""
    result = await db.execute(
        select(user_favorite_artist).where(
            and_(
                user_favorite_artist.c.user_id == user_id,
                user_favorite_artist.c.artist_id == artist_id
            )
        )
    )
    return result.first() is not None