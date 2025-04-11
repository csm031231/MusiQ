from sqlalchemy.ext.asyncio import AsyncSession
from core.models import FavoritesModel
from sqlalchemy.future import select

class fevoritesCRUD:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_fevorites(self,contentId: int, contentTypeId: int, user_id: str):
        new_rating = FavoritesModel(contentId=contentId, contentTypeId=contentTypeId, user_id=user_id)
        
        self._session.add(new_rating)
        await self._session.commit()

        return new_rating
    
    async def get_fevorites_by_id(self, user_id: int):
        result = await self._session.execute(select(FavoritesModel).filter(FavoritesModel.user_id == user_id))
        return result.scalars().all()
    