// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Sparkles, 
  Music, 
  User, 
  Play, 
  Heart, 
  Users, 
  Clock,
  Plus,
  Library
} from 'lucide-react';
import axios from 'axios';
import '../styles/Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  // API 클라이언트 설정
  const apiClient = axios.create({
    baseURL: 'http://54.180.116.4:8000',
    headers: { 'Content-Type': 'application/json' }
  });

  // 토큰 추가 인터셉터
  apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // 로그인 상태 확인 및 플레이리스트 로드
  useEffect(() => {
    const checkLoginAndLoadPlaylists = async () => {
      const token = localStorage.getItem('accessToken');
      setIsLoggedIn(!!token);
      
      if (token) {
        try {
          setPlaylistsLoading(true);
          const response = await apiClient.get('/playlists/my-playlists');
          setPlaylists(response.data || response || []);
        } catch (error) {
          console.error('플레이리스트 로드 실패:', error);
          setPlaylists([]);
        } finally {
          setPlaylistsLoading(false);
        }
      } else {
        setPlaylistsLoading(false);
        setPlaylists([]);
      }
    };

    checkLoginAndLoadPlaylists();

    // 로그인 상태 변경 이벤트 리스닝
    const handleLoginStatusChange = () => {
      checkLoginAndLoadPlaylists();
    };

    window.addEventListener('login-status-change', handleLoginStatusChange);
    window.addEventListener('playlist-updated', checkLoginAndLoadPlaylists);

    return () => {
      window.removeEventListener('login-status-change', handleLoginStatusChange);
      window.removeEventListener('playlist-updated', checkLoginAndLoadPlaylists);
    };
  }, []);

  // 플레이리스트 생성 모달 열기 - 사이드바 모달을 통해 사용자 입력 받기
  const handleCreatePlaylist = () => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    // 사이드바에게 모달 열기 요청 (빈 데이터로 전송하여 사용자가 직접 입력하도록)
    window.dispatchEvent(new CustomEvent('create-playlist-request', {
      detail: null // 빈 데이터로 전송하여 모달에서 사용자가 직접 입력
    }));
  };

  // 더미 데이터들
  const dailyMusic = [
    {
      id: 1,
      title: "Blinding Lights",
      artist: "The Weeknd",
      plays: "1.2M",
      isNew: false,
      color: "#ff6b6b"
    },
    {
      id: 2,
      title: "Good 4 U",
      artist: "Olivia Rodrigo",
      plays: "980K",
      isNew: true,
      color: "#4ecdc4"
    },
    {
      id: 3,
      title: "Stay",
      artist: "The Kid LAROI",
      plays: "756K",
      isNew: false,
      color: "#45b7d1"
    },
    {
      id: 4,
      title: "Industry Baby",
      artist: "Lil Nas X",
      plays: "643K",
      isNew: true,
      color: "#96ceb4"
    }
  ];

  const newReleases = [
    {
      id: 1,
      title: "Anti-Hero",
      artist: "Taylor Swift",
      album: "Midnights",
      isNew: true,
      color: "#ffeaa7"
    },
    {
      id: 2,
      title: "Unholy",
      artist: "Sam Smith",
      album: "Gloria",
      isNew: true,
      color: "#fd79a8"
    },
    {
      id: 3,
      title: "As It Was",
      artist: "Harry Styles",
      album: "Harry's House",
      isNew: false,
      color: "#fdcb6e"
    }
  ];

  const artists = [
    {
      id: 1,
      name: "Taylor Swift",
      genre: "Pop",
      followers: "89.2M",
      isVerified: true,
      initial: "T",
      color: "#e17055"
    },
    {
      id: 2,
      name: "Drake",
      genre: "Hip Hop",
      followers: "67.8M",
      isVerified: true,
      initial: "D",
      color: "#74b9ff"
    },
    {
      id: 3,
      name: "BTS",
      genre: "K-Pop",
      followers: "54.3M",
      isVerified: true,
      initial: "B",
      color: "#a29bfe"
    },
    {
      id: 4,
      name: "Ariana Grande",
      genre: "Pop",
      followers: "51.7M",
      isVerified: true,
      initial: "A",
      color: "#fd79a8"
    }
  ];

  return (
    <div className="home-page">
      <div className="home-grid">
        {/* 오늘의 추천 음악 */}
        <section className="grid-section daily-section">
          <div className="section-header">
            <div className="section-icon" style={{ background: 'rgba(255, 107, 107, 0.1)' }}>
              <TrendingUp size={20} color="#ff6b6b" />
            </div>
            <div className="section-title-group">
              <h2 className="section-title">오늘의 추천</h2>
              <p className="section-subtitle">당신을 위한 특별한 선곡</p>
            </div>
            <button className="shuffle-btn" style={{ background: '#ff6b6b' }}>
              <Play size={12} />
              셔플
            </button>
          </div>
          <div className="section-content">
            {dailyMusic.map(music => (
              <div key={music.id} className="music-item">
                <div 
                  className="music-thumbnail" 
                  style={{ background: `linear-gradient(45deg, ${music.color}, ${music.color}90)` }}
                >
                  <button 
                    className="play-btn"
                    style={{ background: 'rgba(255, 255, 255, 0.9)', color: music.color }}
                  >
                    <Play size={12} />
                  </button>
                </div>
                <div className="music-info">
                  <h3 className="music-title">{music.title}</h3>
                  <p className="music-artist">{music.artist}</p>
                  <div className="music-stats">
                    <span>{music.plays} 재생</span>
                    {music.isNew && <span className="new-badge">NEW</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 신곡 & 인기곡 */}
        <section className="grid-section new-section">
          <div className="section-header">
            <div className="section-icon" style={{ background: 'rgba(78, 205, 196, 0.1)' }}>
              <Sparkles size={20} color="#4ecdc4" />
            </div>
            <div className="section-title-group">
              <h2 className="section-title">신곡 & 인기곡</h2>
              <p className="section-subtitle">최신 트렌드를 만나보세요</p>
            </div>
            <Link to="/chart" className="view-all-btn" style={{ color: '#4ecdc4', borderColor: '#4ecdc4' }}>
              차트 보기
            </Link>
          </div>
          <div className="section-content">
            {newReleases.map(music => (
              <div key={music.id} className="music-item">
                <div 
                  className="music-thumbnail" 
                  style={{ background: `linear-gradient(45deg, ${music.color}, ${music.color}90)` }}
                >
                  <button 
                    className="play-btn"
                    style={{ background: 'rgba(255, 255, 255, 0.9)', color: music.color }}
                  >
                    <Play size={12} />
                  </button>
                </div>
                <div className="music-info">
                  <h3 className="music-title">{music.title}</h3>
                  <p className="music-artist">{music.artist}</p>
                  <div className="music-stats">
                    <span>{music.album}</span>
                    {music.isNew && <span className="new-badge">NEW</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 내 플레이리스트 */}
        <section className="grid-section playlist-section">
          <div className="section-header">
            <div className="section-icon" style={{ background: 'rgba(168, 230, 207, 0.1)' }}>
              <Library size={20} color="#a8e6cf" />
            </div>
            <div className="section-title-group">
              <h2 className="section-title">내 플레이리스트</h2>
              <p className="section-subtitle">나만의 음악 컬렉션</p>
            </div>
            {isLoggedIn ? (
              <button 
                className="create-btn" 
                style={{ background: '#a8e6cf' }}
                onClick={handleCreatePlaylist}
              >
                <Plus size={12} />
                만들기
              </button>
            ) : (
              <Link to="/login" className="view-all-btn" style={{ color: '#a8e6cf', borderColor: '#a8e6cf' }}>
                로그인
              </Link>
            )}
          </div>
          <div className="section-content">
            {!isLoggedIn ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: '#6b7280',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Music size={40} color="#d1d5db" />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>로그인하여 플레이리스트를 만들어보세요</p>
              </div>
            ) : playlistsLoading ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: '#6b7280' 
              }}>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>플레이리스트를 불러오는 중...</p>
              </div>
            ) : playlists.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: '#6b7280',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <Music size={40} color="#d1d5db" />
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: '600' }}>
                    플레이리스트를 만들어보세요
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
                    좋아하는 음악들을 모아서 나만의 플레이리스트를 만들어보세요
                  </p>
                </div>
                <button 
                  className="create-btn" 
                  style={{ background: '#a8e6cf', marginTop: '8px' }}
                  onClick={handleCreatePlaylist}
                >
                  <Plus size={12} />
                  첫 플레이리스트 만들기
                </button>
              </div>
            ) : (
              <>
                {playlists.slice(0, 4).map((playlist, index) => (
                  <div 
                    key={playlist.id} 
                    className="playlist-item"
                    onClick={() => navigate(`/playlists/${playlist.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div 
                      className="playlist-thumbnail" 
                      style={{ 
                        background: `linear-gradient(45deg, #a8e6cf, #a8e6cf90)`,
                        color: 'white'
                      }}
                    >
                      <Music size={20} />
                    </div>
                    <div className="playlist-info">
                      <h3 className="playlist-title">{playlist.title}</h3>
                      <p className="playlist-description">
                        {playlist.description || '사용자 플레이리스트'}
                      </p>
                      <div className="playlist-stats">
                        <span>0곡</span>
                        <span>•</span>
                        <span>방금 전</span>
                      </div>
                    </div>
                  </div>
                ))}
                {playlists.length > 4 && (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <Link 
                      to="/playlists" 
                      className="view-all-btn" 
                      style={{ 
                        color: '#a8e6cf', 
                        borderColor: '#a8e6cf',
                        textDecoration: 'none',
                        display: 'inline-block'
                      }}
                    >
                      모든 플레이리스트 보기 ({playlists.length})
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* 추천 아티스트 */}
        <section className="grid-section home-artist-section">
          <div className="section-header">
            <div className="section-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <User size={20} color="#8b5cf6" />
            </div>
            <div className="section-title-group">
              <h2 className="section-title">추천 아티스트</h2>
              <p className="section-subtitle">새로운 아티스트를 발견해보세요</p>
            </div>
            <Link to="/artist" className="view-all-btn" style={{ color: '#8b5cf6', borderColor: '#8b5cf6' }}>
              더보기
            </Link>
          </div>
          <div className="section-content">
            {artists.map(artist => (
              <div key={artist.id} className="home-artist-item">
                <div className="home-artist-avatar" style={{ background: `linear-gradient(45deg, ${artist.color}, ${artist.color}90)` }}>
                  <span className="home-artist-initial" style={{ color: 'white' }}>
                    {artist.initial}
                  </span>
                  {artist.isVerified && (
                    <div className="verified-badge" style={{ background: '#1da1f2' }}>
                      ✓
                    </div>
                  )}
                </div>
                <div className="home-artist-info">
                  <h3 className="home-artist-name">{artist.name}</h3>
                  <p className="home-artist-genre">{artist.genre}</p>
                  <div className="home-artist-stats">
                    <Users size={10} />
                    <span>{artist.followers} 팔로워</span>
                  </div>
                </div>
                <button className="follow-btn" style={{ background: '#8b5cf6' }}>
                  팔로우
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;