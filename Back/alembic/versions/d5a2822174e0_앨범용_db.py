"""앨범용 db

Revision ID: d5a2822174e0
Revises: c2ddc27f40ac
Create Date: 2025-07-10 15:27:07.130455

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5a2822174e0'
down_revision: Union[str, None] = 'c2ddc27f40ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. 기존 데이터가 있는 경우를 위해 nullable=True로 id 컬럼 추가
    op.add_column('playlist_songs', sa.Column('id', sa.Integer(), nullable=True))
    
    # 2. 기존 데이터에 id 값 설정 (ROW_NUMBER() 사용)
    op.execute("""
        UPDATE playlist_songs 
        SET id = sub.row_number 
        FROM (
            SELECT playlist_id, song_id, position,
                   ROW_NUMBER() OVER (ORDER BY playlist_id, position, song_id) as row_number
            FROM playlist_songs
        ) sub
        WHERE playlist_songs.playlist_id = sub.playlist_id 
          AND playlist_songs.song_id = sub.song_id 
          AND playlist_songs.position = sub.position
    """)
    
    # 3. id 컬럼을 NOT NULL로 변경
    op.alter_column('playlist_songs', 'id', nullable=False)
    
    # 4. primary key 제약조건 제거 (기존 복합 키가 있다면)
    try:
        op.drop_constraint('playlist_songs_pkey', 'playlist_songs', type_='primary')
    except:
        pass  # 기존 primary key가 없으면 무시
    
    # 5. id 컬럼을 primary key로 설정
    op.create_primary_key('playlist_songs_pkey', 'playlist_songs', ['id'])
    
    # 6. 앨범 그룹 관련 컬럼들 추가
    op.add_column('playlist_songs', sa.Column('album_group_id', sa.String(255), nullable=True))
    op.add_column('playlist_songs', sa.Column('album_group_name', sa.String(255), nullable=True))
    op.add_column('playlist_songs', sa.Column('is_album_group', sa.Boolean(), nullable=True, default=False))
    
    # 7. 인덱스 추가
    op.create_index('idx_playlist_songs_album_group', 'playlist_songs', ['playlist_id', 'album_group_id'])
    op.create_index('idx_playlist_songs_album_group_id', 'playlist_songs', ['album_group_id'])


def downgrade() -> None:
    # 인덱스 삭제
    op.drop_index('idx_playlist_songs_album_group_id', table_name='playlist_songs')
    op.drop_index('idx_playlist_songs_album_group', table_name='playlist_songs')
    
    # 앨범 그룹 컬럼 삭제
    op.drop_column('playlist_songs', 'is_album_group')
    op.drop_column('playlist_songs', 'album_group_name')
    op.drop_column('playlist_songs', 'album_group_id')
    
    # primary key 제거
    op.drop_constraint('playlist_songs_pkey', 'playlist_songs', type_='primary')
    
    # 복합 primary key 재생성 (원래 구조로 복원)
    op.create_primary_key('playlist_songs_pkey', 'playlist_songs', ['playlist_id', 'song_id'])
    
    # id 컬럼 삭제
    op.drop_column('playlist_songs', 'id')