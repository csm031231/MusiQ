// src/pages/Playlists.jsx
import React from 'react';
import '../styles/Playlists.css';

const Playlists = () => {
  const playlists = [
    { id: 1, title: '아침을 여는 클래식', tracks: 15, duration: '1시간 23분' },
    { id: 2, title: '운동할 때 듣는 EDM', tracks: 20, duration: '1시간 48분' },
    { id: 3, title: '집중을 위한 로파이', tracks: 12, duration: '52분' },
    { id: 4, title: '드라이브 팝', tracks: 18, duration: '1시간 10분' },
    { id: 5, title: '감성 인디 음악', tracks: 14, duration: '58분' },
    { id: 6, title: '편안한 재즈', tracks: 10, duration: '45분' }
  ];

  return (
    <div className="playlists-page">
      <h2 className="page-title">추천 플레이리스트</h2>
      <div className="playlists-grid">
        {playlists.map(playlist => (
          <div key={playlist.id} className="playlist-card">
            <div className="playlist-image"></div>
            <div className="playlist-info">
              <h3 className="playlist-title">{playlist.title}</h3>
              <p className="playlist-details">
                {playlist.tracks}곡 • {playlist.duration}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Playlists;