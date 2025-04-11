from fastapi import APIRouter, Depends, HTTPException
from core.database import provide_session
from core.dependencies import verify_password, create_jwt, verify_jwt, hash_password
from User.user_crud import UserCRUD
from User.user_schema import UserDTO, LoginUserDTO, DeleteUserDTO, ChangeUserDTO
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
   prefix="/user",
   tags=["user"],
)

@router.post("/login")
async def login_user(lg_user: LoginUserDTO, db: AsyncSession = Depends(provide_session)):
    crud = UserCRUD(db)
    user = await crud.get_user_by_id(lg_user.id)

    if not user:
        raise HTTPException(status_code=404, detail="아이디 또는 비밀번호가 일치하지 않습니다.")

    if not verify_password(lg_user.pw, user.pw):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 일치하지 않습니다.")

    token_data = {"sub": user.id}
    token = create_jwt(token_data)
    
    return {"msg": "로그인 성공", "access_token": token}

@router.post("/register")
async def register_user(user: UserDTO, db: AsyncSession = Depends(provide_session)):
    crud = UserCRUD(db)

    if await crud.get_user_by_id(user.id):
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")

    if await crud.get_user_by_email(user.email):
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")

    await crud.create_user(user.username, user.email, user.id, user.pw)
    
    return {"msg": "회원가입 성공"}

@router.post("/current_user")
async def current_user_id(token: str):
    payload = verify_jwt(token)

    return payload

@router.post("/get_user_by_id")
async def getUser(id: str, db: AsyncSession = Depends(provide_session)):
    crud = UserCRUD(db)

    user = await crud.get_user_by_id(id)
    return user

@router.put("/update_user/{id}")
async def change_pw(user: ChangeUserDTO, db: AsyncSession = Depends(provide_session)):
    crud = UserCRUD(db)

    us = await crud.get_user_by_id(user.id)
    if not us:
        raise HTTPException(status_code=404, detail="user not found")


    if verify_password(user.pw, us.pw):
        await crud.change_pw(user.id, hash_password(user.new_pw))
        return {"msg" : "비밀번호 변경 성공"}
    else:
        return {"msg" : "비밀번호 불일치"}

@router.delete("/delete_Id/{id}")
async def delete_user(user: DeleteUserDTO,  db: AsyncSession = Depends(provide_session)):
    crud = UserCRUD(db)

    us = await crud.get_user_by_id(user.id)
    if not us:
        raise HTTPException(status_code=404, detail="user not found")
    
    await crud.delete_user(user.id)

    return {"message" : "회원탈퇴 되었습니다."}


