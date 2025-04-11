from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from User.user_router import router as user_router
from Api.Api_router import router as api_router
from Rating.rating_router import router as rating_router
from fevorites.fevorites_router import router as fevorites_router
from Region.Region_router import router as Region_router
from core.database import init_db
from core.config import get_config

routers = []
routers.append(user_router)
routers.append(Region_router)
routers.append(api_router)
routers.append(rating_router)
routers.append(fevorites_router)


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