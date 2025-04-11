from pydantic import BaseModel

class UserDTO(BaseModel):
    id: str 
    pw: str  
    email: str  
    username: str 

class LoginUserDTO(BaseModel):
    id: str
    pw: str

class DeleteUserDTO(BaseModel):
    id: str

class ChangeUserDTO(BaseModel):
    id: str
    pw: str
    new_pw: str