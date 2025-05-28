// src/pages/Home.jsx
import React, { useState } from 'react';
import { Play, Heart, Clock, TrendingUp, Music, Users, Star, Shuffle } from 'lucide-react';
import '../styles/Home.css';

const Home = () => {
  const [playingId, setPlayingId] = useState(null);
  
  // 홈 페이지 4개 섹션 데이터
  const homeData = {
    // 1. 오늘의 추천 (좌상단)
    dailyRecommendations: {
      title: '오늘의 추천',
      subtitle: '당신을 위한 맞춤 음악',
      icon: <Star className="section-icon" size={24} />,
      color: '#ff6b6b',
      items: [
        { id: 1, title: '잔잔한 아침', artist: '로피 비트', plays: '2.1M', duration: '3:24' },
        { id: 2, title: '활기찬 오후', artist: '팝 아티스트', plays: '1.8M', duration: '3:45' },
        { id: 3, title: '감성적인 저녁', artist: '인디 밴드', plays: '3.2M', duration: '4:12' },
        { id: 4, title: '편안한 밤', artist: '재즈 트리오', plays: '1.5M', duration: '5:08' }
      ]
    },
    
    // 2. 최신 음악 (우상단)
    newReleases: {
      title: '최신 음악',
      subtitle: '따끈따끈한 신곡',
      icon: <TrendingUp className="section-icon" size={24} />,
      color: '#4ecdc4',
      items: [
        { id: 5, title: '신나는 여름', artist: '써머 보이즈', plays: '500K', duration: '3:15', isNew: true },
        { id: 6, title: '꿈꾸는 밤', artist: '드림 걸스', plays: '750K', duration: '4:02', isNew: true },
        { id: 7, title: '도시의 새벽', artist: '어반 사운드', plays: '1.2M', duration: '3:33', isNew: true },
        { id: 8, title: '여행의 끝', artist: '트래블 뮤직', plays: '380K', duration: '4:45', isNew: true }
      ]
    },
    
    // 3. 인기 플레이리스트 (좌하단)
    popularPlaylists: {
      title: '인기 플레이리스트',
      subtitle: '모두가 듣는 플레이리스트',
      icon: <Users className="section-icon" size={24} />,
      color: '#a8e6cf',
      items: [
        { id: 9, title: '워킹 아웃', description: '운동할 때 듣기 좋은 신나는 음악', tracks: 25, followers: '12.5K' },
        { id: 10, title: '집중 스터디', description: '공부할 때 집중력을 높여주는 BGM', tracks: 18, followers: '8.7K' },
        { id: 11, title: '드라이브', description: '야간 드라이브용 감성 플레이리스트', tracks: 32, followers: '15.2K' },
        { id: 12, title: '카페 음악', description: '여유로운 카페에서 듣는 음악', tracks: 28, followers: '9.8K' }
      ]
    },
    
    // 4. 추천 아티스트 (우하단)
    featuredArtists: {
      title: '추천 아티스트',
      subtitle: '주목할 만한 아티스트들',
      icon: <Users className="section-icon" size={24} />,
      color: '#8b5cf6',
      items: [
        { id: 13, name: 'BTS (방탄소년단)', genre: 'K-Pop, Hip-Hop', followers: '5.2M', albums: 9, isVerified: true, initial: 'B' },
        { id: 14, name: 'NewJeans', genre: 'K-Pop, R&B', followers: '1.9M', albums: 3, isVerified: true, initial: 'N' },
        { id: 15, name: 'AKMU (악뮤)', genre: 'Indie, Folk', followers: '1.2M', albums: 7, isVerified: true, initial: 'A' },
        { id: 16, name: 'IU (아이유)', genre: 'K-Pop, Ballad', followers: '2.8M', albums: 15, isVerified: true, initial: 'I' }
      ]
    }
  };

  // 재생 버튼 클릭 핸들러
  const handlePlay = (itemId) => {
    setPlayingId(playingId === itemId ? null : itemId);
  };

  // 음악 아이템 렌더링 (일반 음악용)
  const renderMusicItem = (item, sectionColor) => (
    <div key={item.id} className="music-item">
      <div className="music-thumbnail" style={{ backgroundColor: `${sectionColor}20` }}>
        <button 
          className="play-btn"
          onClick={() => handlePlay(item.id)}
          style={{ backgroundColor: sectionColor }}
        >
          <Play size={12} fill="white" />
        </button>
      </div>
      <div className="music-info">
        <h5 className="music-title">{item.title}</h5>
        <p className="music-artist">{item.artist}</p>
        <div className="music-stats">
          <span className="plays">{item.plays}</span>
          <span className="duration">{item.duration}</span>
          {item.isNew && <span className="new-badge">NEW</span>}
        </div>
      </div>
    </div>
  );

  // 플레이리스트 아이템 렌더링
  const renderPlaylistItem = (item, sectionColor) => (
    <div key={item.id} className="playlist-item">
      <div className="playlist-thumbnail" style={{ backgroundColor: `${sectionColor}20` }}>
        <Music size={16} style={{ color: sectionColor }} />
      </div>
      <div className="playlist-info">
        <h5 className="playlist-title">{item.title}</h5>
        <p className="playlist-description">{item.description}</p>
        <div className="playlist-stats">
          <span className="track-count">{item.tracks}곡</span>
          <span className="followers">{item.followers} 팔로워</span>
        </div>
      </div>
    </div>
  );

  // 아티스트 아이템 렌더링
  const renderArtistItem = (item, sectionColor) => (
    <div key={item.id} className="home-artist-item">
      <div className="home-artist-avatar" style={{ backgroundColor: `${sectionColor}20` }}>
        <div className="home-artist-initial" style={{ color: sectionColor }}>
          {item.initial || item.name.charAt(0)}
        </div>
        {item.isVerified && (
          <div className="verified-badge" style={{ backgroundColor: sectionColor }}>
            ✓
          </div>
        )}
      </div>
      <div className="home-artist-info">
        <h5 className="home-artist-name">{item.name}</h5>
        <p className="home-artist-genre">{item.genre}</p>
        <div className="home-artist-stats">
          <span className="followers">{item.followers} 팔로워</span>
          <span className="albums">{item.albums} 앨범</span>
        </div>
      </div>
      <button 
        className="follow-btn"
        style={{ backgroundColor: sectionColor }}
      >
        팔로우
      </button>
    </div>
  );

  return (
    <div className="home-page">
      <div className="home-grid">
        {/* 1. 오늘의 추천 */}
        <div className="grid-section daily-section">
          <div className="section-header" style={{ color: homeData.dailyRecommendations.color }}>
            {homeData.dailyRecommendations.icon}
            <div className="section-title-group">
              <h3 className="section-title">{homeData.dailyRecommendations.title}</h3>
              <p className="section-subtitle">{homeData.dailyRecommendations.subtitle}</p>
            </div>
            <button className="shuffle-btn" style={{ backgroundColor: homeData.dailyRecommendations.color }}>
              <Shuffle size={16} />
            </button>
          </div>
          <div className="section-content">
            {homeData.dailyRecommendations.items.map(item => 
              renderMusicItem(item, homeData.dailyRecommendations.color)
            )}
          </div>
        </div>

        {/* 2. 최신 음악 */}
        <div className="grid-section new-section">
          <div className="section-header" style={{ color: homeData.newReleases.color }}>
            {homeData.newReleases.icon}
            <div className="section-title-group">
              <h3 className="section-title">{homeData.newReleases.title}</h3>
              <p className="section-subtitle">{homeData.newReleases.subtitle}</p>
            </div>
            <button className="view-all-btn" style={{ color: homeData.newReleases.color }}>
              전체보기
            </button>
          </div>
          <div className="section-content">
            {homeData.newReleases.items.map(item => 
              renderMusicItem(item, homeData.newReleases.color)
            )}
          </div>
        </div>

        {/* 3. 인기 플레이리스트 */}
        <div className="grid-section playlist-section">
          <div className="section-header" style={{ color: homeData.popularPlaylists.color }}>
            {homeData.popularPlaylists.icon}
            <div className="section-title-group">
              <h3 className="section-title">{homeData.popularPlaylists.title}</h3>
              <p className="section-subtitle">{homeData.popularPlaylists.subtitle}</p>
            </div>
            <button className="create-btn" style={{ backgroundColor: homeData.popularPlaylists.color }}>
              만들기
            </button>
          </div>
          <div className="section-content">
            {homeData.popularPlaylists.items.map(item => 
              renderPlaylistItem(item, homeData.popularPlaylists.color)
            )}
          </div>
        </div>

        {/* 4. 추천 아티스트 */}
        <div className="grid-section home-artist-section">
          <div className="section-header" style={{ color: homeData.featuredArtists.color }}>
            {homeData.featuredArtists.icon}
            <div className="section-title-group">
              <h3 className="section-title">{homeData.featuredArtists.title}</h3>
              <p className="section-subtitle">{homeData.featuredArtists.subtitle}</p>
            </div>
            <button className="discover-btn" style={{ backgroundColor: homeData.featuredArtists.color }}>
              발견하기
            </button>
          </div>
          <div className="section-content">
            {homeData.featuredArtists.items.map(item => 
              renderArtistItem(item, homeData.featuredArtists.color)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;