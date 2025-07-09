// src/pages/Chart.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Play, Heart, Plus, X, Music, Check } from 'lucide-react';
import axios from 'axios';
import '../styles/Chart.css';

const Chart = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 새로 추가된 상태들
  const [likedSongs, setLikedSongs] = useState(new Set()); // 좋아요한 노래 ID들
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // 중복 요청 방지를 위한 ref
  const isRequestingRef = useRef(false);

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

  // 차트 데이터 가져오기 (기존 함수 유지)
  const fetchChartData = async (force = false) => {
    if (!force && isRequestingRef.current) {
      console.log('이미 요청 중이므로 중복 요청을 방지합니다.');
      return;
    }

    try {
      isRequestingRef.current = true;
      setIsLoading(true);
      setError('');
      
      console.log('차트 데이터 요청 중...');
      
      const response = await axios.get('http://54.180.116.4:8000/api/chartPage', {
        timeout: 100000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('차트 데이터 받기 성공:', response.data);
      
      if (response.data.tracks) {
        setChartData(response.data.tracks);
      } else {
        setChartData([]);
      }
      
    } catch (err) {
      console.error('차트 데이터 받기 실패:', err);
      const errorMessage = err.code === 'ECONNABORTED'
        ? '요청 시간이 초과되었습니다. 서버에서 이미지를 처리하는 중입니다.'
        : err.response?.status === 404 
        ? '차트 API 엔드포인트를 찾을 수 없습니다.'
        : '차트 데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
    } finally {
      isRequestingRef.current = false;
      setIsLoading(false);
    }
  };

  // 좋아요 토글 함수
  const handleLikeToggle = async (songId) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await apiClient.post(`/playlists/like-song/${songId}`);
      console.log('좋아요 토글 성공:', response.data);
      
      // 좋아요 상태 업데이트
      setLikedSongs(prev => {
        const newSet = new Set(prev);
        if (newSet.has(songId)) {
          newSet.delete(songId);
        } else {
          newSet.add(songId);
        }
        return newSet;
      });
      
    } catch (error) {
      console.error('좋아요 토글 실패:', error);
      if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
      } else {
        alert('좋아요 처리 중 오류가 발생했습니다.');
      }
    }
  };

  // 플레이리스트 모달 열기
  const handleAddToPlaylist = (song) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }

    setSelectedSong(song);
    setShowPlaylistModal(true);
    fetchPlaylists();
  };

  // 플레이리스트 목록 가져오기
  const fetchPlaylists = async () => {
    try {
      const response = await apiClient.get('/playlists/my-playlists');
      setPlaylists(response.data || response);
    } catch (error) {
      console.error('플레이리스트 목록 조회 실패:', error);
      setPlaylists([]);
    }
  };

  // 새 플레이리스트 생성
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const response = await apiClient.post('/playlists/', {
        title: newPlaylistName.trim(),
        description: `${selectedSong?.title}에서 생성됨`
      });
      
      console.log('플레이리스트 생성 성공:', response.data);
      setNewPlaylistName('');
      setShowCreateForm(false);
      await fetchPlaylists(); // 목록 새로고침
      
      // 생성된 플레이리스트에 바로 노래 추가
      if (response.data?.id) {
        await addSongToPlaylist(response.data.id);
      }
      
    } catch (error) {
      console.error('플레이리스트 생성 실패:', error);
      alert('플레이리스트 생성 중 오류가 발생했습니다.');
    }
  };

  // 플레이리스트에 노래 추가
  const addSongToPlaylist = async (playlistId) => {
    // 백엔드에서 song_id를 제공하므로 이를 사용
    if (!selectedSong?.song_id) {
      alert('노래 정보를 찾을 수 없습니다.');
      return;
    }
  
    try {
      const response = await apiClient.post(`/playlists/${playlistId}/songs`, {
        song_id: selectedSong.song_id // Chart API에서 제공하는 song_id 사용
      });
      
      console.log('노래 추가 성공:', response.data);
      alert('플레이리스트에 추가되었습니다!');
      setShowPlaylistModal(false);
      
    } catch (error) {
      console.error('노래 추가 실패:', error);
      if (error.response?.data?.detail?.includes('already in playlist')) {
        alert('이미 플레이리스트에 있는 노래입니다.');
      } else {
        alert('플레이리스트에 추가하는 중 오류가 발생했습니다.');
      }
    }
  };

  // 컴포넌트 마운트 시 데이터 가져오기 (기존 로직 유지)
  useEffect(() => {
    fetchChartData();
    
    return () => {
      isRequestingRef.current = false;
    };
  }, []);

  // 기존 함수들 유지
  const getRankClass = (rank) => {
    if (rank === 1) return 'top-1';
    if (rank <= 3) return 'top-3';
    return '';
  };

  const getImageSourceBadge = (source) => {
    if (source === 'spotify') {
      return <span className="image-source-badge spotify">Spotify</span>;
    } else if (source === 'lastfm') {
      return <span className="image-source-badge lastfm">Last.fm</span>;
    }
    return null;
  };

  const handleRetry = () => {
    fetchChartData(true);
  };

  return (
    <div className="chart-page">
      <div className="chart-header">
        <h2 className="page-title">인기차트</h2>
      </div>
      
      {/* 로딩 상태 (기존 유지) */}
      {isLoading && (
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <span>차트 데이터를 불러오는 중...</span>
          <p className="loading-info">
            이미지를 가져오는 중입니다. 잠시만 기다려주세요.
          </p>
        </div>
      )}

      {/* 에러 상태 (기존 유지) */}
      {error && (
        <div className="chart-error">
          <p>{error}</p>
          <button onClick={handleRetry} className="retry-button">
            다시 시도
          </button>
        </div>
      )}
      
      {/* 차트 리스트 (기존 구조 유지, 버튼 기능만 추가) */}
      {!isLoading && !error && chartData.length > 0 && (
        <div className="chart-list">
          {chartData.map(item => (
            <div key={item.rank} className="chart-item">
              <span className={`chart-rank ${getRankClass(item.rank)}`}>
                {item.rank}
              </span>
              
              <div className="chart-image">
                {item.image_small ? (
                  <div className="image-container">
                    <img 
                      src={item.image_small} 
                      alt={item.title}
                      className="track-image"
                    />
                    {getImageSourceBadge(item.image_source)}
                  </div>
                ) : (
                  <div className="placeholder-image">
                    <Play size={24} />
                  </div>
                )}
              </div>
              
              <div className="chart-info">
                <p className="chart-title">{item.title}</p>
                <p className="chart-artist">{item.artist.name}</p>
                <div className="chart-stats">
                  <span className="playcount">
                    재생: {parseInt(item.playcount).toLocaleString()}
                  </span>
                  <span className="listeners">
                    청취자: {parseInt(item.listeners).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="chart-actions">
                <button 
                  className="chart-action"
                  onClick={() => window.open(item.url, '_blank')}
                  title="Last.fm에서 열기"
                >
                  <Play size={18} />
                </button>
                <button 
                  className={`chart-action ${likedSongs.has(item.song_id) ? 'liked' : ''}`}
                  onClick={() => handleLikeToggle(item.song_id)}
                  title="좋아요"
                >
                  <Heart 
                    size={18} 
                    fill={likedSongs.has(item.song_id) ? 'currentColor' : 'none'}
                  />
                </button>
                <button 
                  className="chart-action" 
                  onClick={() => handleAddToPlaylist(item)}
                  title="플레이리스트에 추가"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 데이터 없음 (기존 유지) */}
      {!isLoading && !error && chartData.length === 0 && (
        <div className="chart-empty">
          <p>차트 데이터가 없습니다.</p>
          <button onClick={handleRetry} className="retry-button">
            다시 시도
          </button>
        </div>
      )}

      {/* 플레이리스트 선택 모달 */}
      {showPlaylistModal && (
        <div className="playlist-modal-overlay" onClick={() => setShowPlaylistModal(false)}>
          <div className="playlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="playlist-modal-header">
              <h3>플레이리스트에 추가</h3>
              <button 
                className="close-button"
                onClick={() => setShowPlaylistModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="playlist-modal-content">
              <div className="selected-song-info">
                <strong>{selectedSong?.title}</strong>
                <span>by {selectedSong?.artist?.name}</span>
              </div>
              
              {!showCreateForm && (
                <button 
                  className="create-playlist-button"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus size={16} />
                  새 플레이리스트 만들기
                </button>
              )}

              {showCreateForm && (
                <div className="create-playlist-form">
                  <input
                    type="text"
                    placeholder="플레이리스트 이름"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                  />
                  <div className="form-actions">
                    <button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}>
                      <Check size={16} />
                      생성
                    </button>
                    <button onClick={() => {
                      setShowCreateForm(false);
                      setNewPlaylistName('');
                    }}>
                      취소
                    </button>
                  </div>
                </div>
              )}
              
              <div className="playlists-list">
                {playlists.length === 0 ? (
                  <p className="no-playlists">플레이리스트가 없습니다.</p>
                ) : (
                  playlists.map(playlist => (
                    <div 
                      key={playlist.id}
                      className="playlist-item"
                      onClick={() => addSongToPlaylist(playlist.id)}
                    >
                      <Music size={16} />
                      <span>{playlist.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chart;