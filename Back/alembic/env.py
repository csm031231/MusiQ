from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from core.database import Base
from core.models import *

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# URL을 비동기 연결로 수정하는 함수 추가
def get_url():
    # alembic.ini에서 URL 가져오기
    url = config.get_main_option("sqlalchemy.url")
    # PostgreSQL URL 변환: postgresql:// -> postgresql+asyncpg://
    if url.startswith('postgresql://'):
        url = url.replace('postgresql://', 'postgresql+psycopg2://')
    return url

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # 설정에서 가져온 후 수정된 URL을 사용
    configuration = config.get_section(config.config_ini_section, {})
    configuration['sqlalchemy.url'] = get_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()