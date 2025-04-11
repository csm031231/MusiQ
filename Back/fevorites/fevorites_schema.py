from pydantic import BaseModel

class fevoritesDTO(BaseModel):
    contentId: int
    contentTypeId: int
    user_id: str