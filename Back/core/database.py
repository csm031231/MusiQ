from typing import Optional
import ssl  # SSL 모듈 추가
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

Base = declarative_base()
DBSessionLocal: Optional[sessionmaker] = None
db_engine: Optional[Engine] = None
db_session: Optional[Session] = None

def init_db(config) -> None:
    global DBSessionLocal, db_engine, db_session
    postgres_endpoint = config.postgresql_endpoint
    postgres_port = config.postgresql_port
    postgres_table = config.postgresql_table
    postgres_user = config.postgresql_user
    postgres_password = config.postgresql_password
    
    # URL 생성 (asyncpg 드라이버 사용)
    db_url = (
        "postgresql+asyncpg://"
        + f"{postgres_user}:{postgres_password}"
        + f"@{postgres_endpoint}:{postgres_port}/{postgres_table}"
    )
    
    try:
        # SSL 인증서 검증 비활성화 설정
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # 비동기 엔진 생성에 SSL 설정 추가
        db_engine = create_async_engine(
            db_url,
            connect_args={"ssl": ssl_context}  # SSL 컨텍스트 추가
        )
        
        # 비동기 세션메이커 설정
        DBSessionLocal = sessionmaker(
            bind=db_engine,
            autoflush=False,
            expire_on_commit=False,
            class_=AsyncSession,
        )
        print("Database connection successful.")
    except Exception as e:
        print(f"Database connection failed. Reason: {str(e)}")
        print(f"Failed URL: {db_url}")

# provide_session 함수는 변경 없음
async def provide_session():
    if DBSessionLocal is None:
        raise ImportError("You need to call init_db before this function")
    
    # 비동기 세션 생성
    async_session = DBSessionLocal()
    
    try:
        yield async_session
    except Exception as e:
        await async_session.rollback()
        raise e
    else:
        await async_session.commit()
    finally:
        await async_session.close()