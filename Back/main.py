from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Api.Api_router import router as api_router
from User.user_router import router as user_router
from Artist.artist_router import router as artist_router
from Playlist.playlist_router import router as playlist_router

from core.database import init_db
from core.config import get_config

routers = []
routers.append(api_router)
routers.append(user_router)
routers.append(artist_router)
routers.append(playlist_router)


app = FastAPI(
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

for router in routers:
    app.include_router(router=router)
    

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 허용할 출처
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # 허용할 HTTP 메서드
    allow_headers=["*"],  # 허용할 헤더
)

init_db(config=get_config())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)