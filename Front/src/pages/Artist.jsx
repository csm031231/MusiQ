// src/pages/Artist.jsx
import React from 'react';
import '../styles/Artist.css';

const Artist = () => {
  // 인기 아티스트 데이터 (실제로는 API에서 받아올 것)
  const popularArtists = [
    { id: 1, name: '아이유', genre: '팝, 발라드', followers: '550만' },
    { id: 2, name: '방탄소년단', genre: 'K-Pop', followers: '780만' },
    { id: 3, name: '악동뮤지션', genre: '인디 팝', followers: '320만' },
    { id: 4, name: '에스파', genre: 'K-Pop', followers: '420만' },
    { id: 5, name: '트와이스', genre: 'K-Pop', followers: '560만' },
    { id: 6, name: '세븐틴', genre: 'K-Pop', followers: '490만' },
    { id: 7, name: '청하', genre: 'K-Pop, 댄스', followers: '310만' },
    { id: 8, name: '뉴진스', genre: 'K-Pop', followers: '380만' }
  ];

  return (
    <div className="artist-page">
      <h2 className="page-title">아티스트</h2>
      
      <div className="artist-section">
        <h3 className="section-title">인기 아티스트</h3>
        <div className="artists-grid">
          {popularArtists.map(artist => (
            <div key={artist.id} className="artist-card">
              <div className="artist-avatar"></div>
              <div className="artist-info">
                <h4 className="artist-name">{artist.name}</h4>
                <p className="artist-genre">{artist.genre}</p>
                <p className="artist-followers">팔로워 {artist.followers}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="artist-section">
        <h3 className="section-title">장르별 아티스트</h3>
        <div className="genre-tabs">
          <button className="genre-tab active">전체</button>
          <button className="genre-tab">K-Pop</button>
          <button className="genre-tab">인디</button>
          <button className="genre-tab">힙합</button>
          <button className="genre-tab">R&B</button>
          <button className="genre-tab">록/메탈</button>
        </div>
      </div>
    </div>
  );
};

export default Artist;