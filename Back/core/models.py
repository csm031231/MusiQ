from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
from datetime import datetime

# 사용자-아티스트 관심 테이블
user_favorite_artist = Table(
    'user_favorite_artist',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('artist_id', String, primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    nickname = Column(String(50), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # 관계 정의
    playlists = relationship("Playlist", back_populates="user")
    liked_songs = relationship("UserLikedSong", back_populates="user")
    favorite_artists = relationship("Artist", secondary=user_favorite_artist, back_populates="favorited_by")
    artist_comments = relationship("ArtistComment", back_populates="user")

class Artist(Base):
    __tablename__ = "artists"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    bio = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    spotify_id = Column(String(50), nullable=True, unique=True)
    lastfm_id = Column(String(50), nullable=True, unique=True)
    
    # 관계 정의
    songs = relationship("Song", back_populates="artist")
    albums = relationship("Album", back_populates="artist")
    favorited_by = relationship("User", secondary=user_favorite_artist, back_populates="favorite_artists")
    comments = relationship("ArtistComment", back_populates="artist")

class Album(Base):
    __tablename__ = "albums"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    release_date = Column(DateTime, nullable=True)
    cover_url = Column(String(255), nullable=True)
    spotify_id = Column(String(50), nullable=True, unique=True)
    artist_id = Column(String, ForeignKey("artists.id"), nullable=False)
    
    # 관계 정의
    artist = relationship("Artist", back_populates="albums")
    songs = relationship("Song", back_populates="album")

class Song(Base):
    __tablename__ = "songs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    duration_ms = Column(Integer, nullable=True)
    spotify_id = Column(String(50), nullable=True, unique=True)
    preview_url = Column(String(255), nullable=True)
    artist_id = Column(String, ForeignKey("artists.id"), nullable=False)
    album_id = Column(Integer, ForeignKey("albums.id"), nullable=True)
    
    # 관계 정의
    artist = relationship("Artist", back_populates="songs")
    album = relationship("Album", back_populates="songs")
    playlists = relationship("PlaylistSong", back_populates="song")
    liked_by = relationship("UserLikedSong", back_populates="song")

class Playlist(Base):
    __tablename__ = "playlists"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 관계 정의
    user = relationship("User", back_populates="playlists")
    songs = relationship("PlaylistSong", back_populates="playlist")

class PlaylistSong(Base):
    __tablename__ = "playlist_songs"
    
    playlist_id = Column(Integer, ForeignKey("playlists.id"), primary_key=True)
    song_id = Column(Integer, ForeignKey("songs.id"), primary_key=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    playlist = relationship("Playlist", back_populates="songs")
    song = relationship("Song", back_populates="playlists")

class UserLikedSong(Base):
    __tablename__ = "user_liked_songs"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    song_id = Column(Integer, ForeignKey("songs.id"), primary_key=True)
    liked_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    user = relationship("User", back_populates="liked_songs")
    song = relationship("Song", back_populates="liked_by")

class ArtistComment(Base):
    __tablename__ = "artist_comments"

    id = Column(Integer, primary_key=True, index=True)
    artist_id = Column(String, ForeignKey("artists.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="artist_comments")
    artist = relationship("Artist", back_populates="comments")