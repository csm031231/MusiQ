from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import provide_session
from core.dependencies import create_jwt, verify_jwt
from core.models import User
from User.dto import (
    UserCreate, UserResponse, UserUpdate, PasswordChange, 
    Token, FavoriteArtist, FavoriteArtistAdd, UserLogin
)
from User.crud import (
    get_user_by_id, get_user_by_username, get_user_by_email,
    create_user, update_user, change_password, hash_password, verify_password,
    get_favorite_artists, add_favorite_artist, remove_favorite_artist, check_favorite_artist
)
from typing import List
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

# 현재 사용자 확인 의존성
async def get_current_user(db: AsyncSession = Depends(provide_session), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_jwt(token)
    if payload is None:
        raise credentials_exception
    
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = await get_user_by_id(db, int(user_id))
    if user is None:
        raise credentials_exception
    
    return user

# 회원가입
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: AsyncSession = Depends(provide_session)):
    # 이메일 중복 확인
    if await get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 사용자명 중복 확인
    if await get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # 사용자 생성
    return await create_user(db, user_data)

# 로그인 - 이메일로 변경
@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(provide_session)):
    # 이메일로 사용자 조회
    user = await get_user_by_email(db, user_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 비밀번호 확인
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 토큰 생성
    access_token = create_jwt(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

# 마이페이지 - 내 정보 확인
@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# 마이페이지 - 회원정보 수정
@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_data: UserUpdate, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    # 업데이트할 데이터 수집
    update_data = {}
    if user_data.username:
        # 사용자명 중복 확인
        existing_user = await get_user_by_username(db, user_data.username)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        update_data["username"] = user_data.username
    
    if user_data.email:
        # 이메일 중복 확인
        existing_user = await get_user_by_email(db, user_data.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        update_data["email"] = user_data.email
    
    if user_data.nickname:
        update_data["nickname"] = user_data.nickname
    
    # 사용자 업데이트
    return await update_user(db, current_user, update_data)

# 마이페이지 - 비밀번호 변경
@router.put("/me/password")
async def update_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    # 현재 비밀번호 확인
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # 새 비밀번호 설정
    await change_password(db, current_user, password_data.new_password)
    
    return {"message": "Password changed successfully"}

# 마이페이지 - 관심 아티스트 목록 조회
@router.get("/me/favorite-artists", response_model=List[FavoriteArtist])
async def get_my_favorite_artists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    return await get_favorite_artists(db, current_user.id)

# 마이페이지 - 관심 아티스트 추가
@router.post("/me/favorite-artists")
async def add_to_favorite_artists(
    artist_data: FavoriteArtistAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    from Artist.crud import get_artist_by_id
    
    # 아티스트가 존재하는지 확인
    artist = await get_artist_by_id(db, artist_data.artist_id)
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    # 이미 관심 아티스트로 등록되어 있는지 확인
    if await check_favorite_artist(db, current_user.id, artist_data.artist_id):
        return {"message": "Artist already in favorites"}
    
    # 관심 아티스트 추가
    await add_favorite_artist(db, current_user.id, artist_data.artist_id)
    
    return {"message": "Artist added to favorites"}

# 마이페이지 - 관심 아티스트 삭제
@router.delete("/me/favorite-artists/{artist_id}")
async def remove_from_favorite_artists(
    artist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    # 관심 아티스트 삭제
    removed = await remove_favorite_artist(db, current_user.id, artist_id)
    
    if not removed:
        raise HTTPException(status_code=404, detail="Artist not in favorites")
    
    return {"message": "Artist removed from favorites"}

# User/user_router.py에 추가할 코드 (기존 코드 마지막에 추가)

# 사용자의 좋아요 아티스트 ID 목록만 반환 (가벼운 API)
@router.get("/favorite-artists", response_model=List[str])
async def get_user_favorite_artist_ids_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(provide_session)
):
    """사용자의 좋아요 아티스트 ID 목록 조회"""
    try:
        from Artist.crud import get_user_favorite_artist_ids
        favorite_artist_ids = await get_user_favorite_artist_ids(db, current_user.id)
        return favorite_artist_ids
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get favorite artist IDs: {str(e)}"
        )