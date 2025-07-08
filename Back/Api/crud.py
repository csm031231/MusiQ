from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from core.models import Song, Artist, Album

async def save_track_to_db(db: AsyncSession, track_data: dict, source: str = "lastfm") -> Optional[int]:
    """트랙 정보를 DB에 저장하고 song_id 반환"""
    try:
        track_name = track_data.get('title') or track_data.get('name')
        
        # 아티스트 이름 추출
        if isinstance(track_data.get('artist'), dict):
            artist_name = track_data.get('artist', {}).get('name')
        elif isinstance(track_data.get('artist'), str):
            artist_name = track_data.get('artist')
        else:
            artist_name = None
        
        if not track_name or not artist_name:
            return None
        
        # 아티스트 ID 생성 (특수문자 처리)
        artist_id = f"{source}_{artist_name.lower().replace(' ', '_').replace('&', 'and').replace('/', '_')}"
        
        # 아티스트가 이미 있는지 확인
        result = await db.execute(select(Artist).where(Artist.id == artist_id))
        artist = result.scalars().first()
        
        if not artist:
            # 새 아티스트 생성
            artist = Artist(
                id=artist_id,
                name=artist_name,
                image_url=track_data.get('artist_image'),
                spotify_id=track_data.get('artist_spotify_id'),
                lastfm_id=track_data.get('artist_lastfm_id')
            )
            db.add(artist)
            await db.flush()
        
        # 앨범 처리
        album = None
        album_title = None
        
        if track_data.get('album'):
            if isinstance(track_data['album'], str):
                album_title = track_data['album']
            elif isinstance(track_data['album'], dict):
                album_title = track_data['album'].get('name')
                
        if album_title:
            result = await db.execute(
                select(Album).where(
                    Album.title == album_title,
                    Album.artist_id == artist_id
                )
            )
            album = result.scalars().first()
            
            if not album:
                album = Album(
                    title=album_title,
                    artist_id=artist_id,
                    cover_url=track_data.get('image_small') or track_data.get('image')
                )
                db.add(album)
                await db.flush()
        
        # 트랙이 이미 있는지 확인
        result = await db.execute(
            select(Song).where(
                Song.title == track_name,
                Song.artist_id == artist_id
            )
        )
        existing_song = result.scalars().first()
        
        if existing_song:
            return existing_song.id
        
        # 새 트랙 생성
        new_song = Song(
            title=track_name,
            duration_ms=track_data.get('duration_ms'),
            spotify_id=track_data.get('spotify_id') or track_data.get('id'),
            preview_url=track_data.get('preview_url'),
            artist_id=artist_id,
            album_id=album.id if album else None
        )
        
        db.add(new_song)
        await db.commit()
        await db.refresh(new_song)
        
        return new_song.id
        
    except Exception as e:
        print(f"Error saving track to DB: {str(e)}")
        await db.rollback()
        return None