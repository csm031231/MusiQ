// src/pages/LikedSongs.jsx 
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Play, 
  Heart, 
  Plus,
  Music,
  Clock,
  ArrowLeft,
  X,
  Check
} from 'lucide-react';
import axios from 'axios';

// 스타일드 컴포넌트들 (PlaylistDetail과 유사)
const PageContainer = styled.div`
  padding: 0;
  min-height: 100vh;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 400px;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    z-index: -1;
  }
`;

const Header = styled.div`
  padding: 40px;
  color: white;
  position: relative;
  z-index: 1;
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  margin-bottom: 24px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateX(-2px);
  }
`;

const PlaylistInfo = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 32px;
`;

const PlaylistCover = styled.div`
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
`;

const PlaylistMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlaylistType = styled.span`
  font-size: 0.875rem;
  text-transform: uppercase;
  font-weight: 600;
  opacity: 0.8;
  margin-bottom: 8px;
  display: block;
`;

const PlaylistTitle = styled.h1`
  font-size: 3rem;
  font-weight: 900;
  margin: 0 0 16px 0;
  line-height: 1.1;
  word-break: break-word;
`;

const PlaylistStats = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  opacity: 0.8;
`;

const SongsSection = styled.div`
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  margin-top: -16px;
  padding: 32px;
  min-height: 60vh;
  position: relative;
  z-index: 2;
`;

// 나머지 스타일드 컴포넌트들은 PlaylistDetail과 동일...

const LikedSongs = () => {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 플레이리스트 모달 상태
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // API 클라이언트 설정
  const apiClient = axios.create({
    baseURL: 'http://54.180.116.4:8000',
    headers: { 'Content-Type': 'application/json' }
  });

  apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // 로그인 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(!!token);
  }, []);

  // 좋아요한 노래 목록 로드
  useEffect(() => {
    if (isLoggedIn) {
      loadLikedSongs();
    }
  }, [isLoggedIn]);

  const loadLikedSongs = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiClient.get('/playlists/liked-songs');
      setSongs(response.data || response || []);

    } catch (error) {
      console.error('좋아요한 노래 로드 실패:', error);
      
      if (error.response?.status === 401) {
        setError('로그인이 필요합니다.');
        setIsLoggedIn(false);
      } else {
        setError('좋아요한 노래를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 좋아요 토글 (취소)
  const handleLikeToggle = async (songId) => {
    try {
      await apiClient.post(`/playlists/like-song/${songId}`);
      
      // 좋아요 취소되면 목록에서 제거
      setSongs(prev => prev.filter(song => song.id !== songId));
      
    } catch (error) {
      console.error('좋아요 토글 실패:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 플레이리스트에 추가 관련 함수들 (PlaylistDetail과 동일)
  const handleAddToPlaylist = (song) => {
    setSelectedSong(song);
    setShowPlaylistModal(true);
    fetchPlaylists();
  };

  const fetchPlaylists = async () => {
    try {
      const response = await apiClient.get('/playlists/my-playlists');
      setPlaylists(response.data || response);
    } catch (error) {
      console.error('플레이리스트 목록 조회 실패:', error);
      setPlaylists([]);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const response = await apiClient.post('/playlists/', {
        title: newPlaylistName.trim(),
        description: `${selectedSong?.title}에서 생성됨`
      });
      
      setNewPlaylistName('');
      setShowCreateForm(false);
      await fetchPlaylists();
      
      if (response.data?.id) {
        await addSongToPlaylist(response.data.id);
      }
      
    } catch (error) {
      console.error('플레이리스트 생성 실패:', error);
      alert('플레이리스트 생성 중 오류가 발생했습니다.');
    }
  };

  const addSongToPlaylist = async (playlistId) => {
    if (!selectedSong?.id) {
      alert('노래 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      await apiClient.post(`/playlists/${playlistId}/songs`, {
        song_id: selectedSong.id
      });
      
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

  // 노래 재생 함수 (PlaylistDetail과 동일)
  const handlePlaySong = (song) => {
    if (song.url) {
      window.open(song.url, '_blank');
    } else if (song.title && song.artist?.name) {
      const artist = encodeURIComponent(song.artist.name.replace(/ /g, '+'));
      const track = encodeURIComponent(song.title.replace(/ /g, '+'));
      const lastfmUrl = `https://www.last.fm/music/${artist}/_/${track}`;
      window.open(lastfmUrl, '_blank');
    } else if (song.preview_url) {
      window.open(song.preview_url, '_blank');
    } else {
      const searchQuery = `${song.title} ${song.artist?.name}`;
      const lastfmSearchUrl = `https://www.last.fm/search?q=${encodeURIComponent(searchQuery)}`;
      window.open(lastfmSearchUrl, '_blank');
    }
  };

  // 시간 포맷팅 함수 (PlaylistDetail과 동일)
  const formatDuration = (duration) => {
    if (!duration) return '0:00';
    
    let totalSeconds;
    if (duration > 10000) {
      totalSeconds = Math.floor(duration / 1000);
    } else if (typeof duration === 'number') {
      totalSeconds = duration;
    } else if (typeof duration === 'string' && duration.includes(':')) {
      return duration;
    } else if (typeof duration === 'string') {
      const num = parseInt(duration);
      totalSeconds = num > 10000 ? Math.floor(num / 1000) : num;
    } else {
      return '0:00';
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          color: 'white' 
        }}>
          로딩 중...
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          color: 'white',
          textAlign: 'center',
          gap: '20px'
        }}>
          <p>{error}</p>
          <button 
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            돌아가기
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)} title="뒤로 가기">
          <ArrowLeft size={20} />
        </BackButton>

        <PlaylistInfo>
          <PlaylistCover>
            <Heart size={40} />
          </PlaylistCover>

          <PlaylistMeta>
            <PlaylistType>플레이리스트</PlaylistType>
            <PlaylistTitle>좋아요 표시한 음악</PlaylistTitle>
            <PlaylistStats>
              <span>{songs.length}곡</span>
            </PlaylistStats>
          </PlaylistMeta>
        </PlaylistInfo>
      </Header>

      <SongsSection>
        {songs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
            <Heart size={64} style={{ margin: '0 auto 24px', color: '#d1d5db' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
              좋아요 표시한 음악이 없습니다
            </h3>
            <p style={{ fontSize: '1rem', margin: 0 }}>
              마음에 드는 음악에 하트를 눌러보세요!
            </p>
          </div>
        ) : (
          <>
            {/* 노래 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {songs.map((song, index) => (
                <div 
                  key={song.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 200px 80px 80px',
                    gap: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    const trackNumber = e.currentTarget.querySelector('.track-number');
                    const playButton = e.currentTarget.querySelector('.play-button');
                    const songActions = e.currentTarget.querySelector('.song-actions');
                    if (trackNumber) trackNumber.style.opacity = '0';
                    if (playButton) playButton.style.opacity = '1';
                    if (songActions) songActions.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    const trackNumber = e.currentTarget.querySelector('.track-number');
                    const playButton = e.currentTarget.querySelector('.play-button');
                    const songActions = e.currentTarget.querySelector('.song-actions');
                    if (trackNumber) trackNumber.style.opacity = '1';
                    if (playButton) playButton.style.opacity = '0';
                    if (songActions) songActions.style.opacity = '0';
                  }}
                >
                  {/* 순번/재생 버튼 */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span 
                      className="track-number"
                      style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        fontWeight: 500,
                        transition: 'opacity 0.2s ease'
                      }}
                    >
                      {index + 1}
                    </span>
                    <button 
                      className="play-button"
                      onClick={() => handlePlaySong(song)}
                      style={{
                        position: 'absolute',
                        background: 'none',
                        border: 'none',
                        color: '#374151',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        opacity: 0,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="재생"
                      onMouseEnter={(e) => {
                        e.target.style.color = '#667eea';
                        e.target.style.background = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#374151';
                        e.target.style.background = 'none';
                      }}
                    >
                      <Play size={14} />
                    </button>
                  </div>

                  {/* 노래 정보 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#1f2937',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {song.title}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {song.artist?.name}
                      </span>
                    </div>
                  </div>

                  {/* 앨범 */}
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    <span>{song.album?.title || '-'}</span>
                  </div>

                  {/* 재생 시간 */}
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span>{formatDuration(song.duration_ms || song.duration || song.length || 0)}</span>
                  </div>

                  {/* 액션 버튼들 */}
                  <div 
                    className="song-actions"
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      justifyContent: 'center',
                      minWidth: '80px'
                    }}
                  >
                    <button
                      onClick={() => handleLikeToggle(song.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="좋아요 취소"
                      onMouseEnter={(e) => {
                        e.target.style.background = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'none';
                      }}
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                    <button
                      onClick={() => handleAddToPlaylist(song)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="플레이리스트에 추가"
                      onMouseEnter={(e) => {
                        e.target.style.color = '#374151';
                        e.target.style.background = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#6b7280';
                        e.target.style.background = 'none';
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SongsSection>

      {/* 플레이리스트 선택 모달 (PlaylistDetail과 동일) */}
      {showPlaylistModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowPlaylistModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '400px',
              maxHeight: '80vh',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1a1a1a'
              }}>
                플레이리스트에 추가
              </h3>
              <button 
                onClick={() => setShowPlaylistModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#6b7280',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e5e7eb';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = '#6b7280';
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{
              padding: '20px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <div style={{
                background: '#f0f4ff',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                borderLeft: '4px solid #667eea'
              }}>
                <strong style={{
                  display: 'block',
                  color: '#1a1a1a',
                  fontWeight: 600,
                  marginBottom: '4px'
                }}>
                  {selectedSong?.title}
                </strong>
                <span style={{
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  by {selectedSong?.artist?.name}
                </span>
              </div>
              
              {!showCreateForm && (
                <button 
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '16px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#5a67d8';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#667eea';
                  }}
                >
                  <Plus size={16} />
                  새 플레이리스트 만들기
                </button>
              )}

              {showCreateForm && (
                <div style={{
                  marginBottom: '16px',
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <input
                    type="text"
                    placeholder="플레이리스트 이름"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      marginBottom: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={handleCreatePlaylist} 
                      disabled={!newPlaylistName.trim()}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: newPlaylistName.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        background: newPlaylistName.trim() ? '#667eea' : '#d1d5db',
                        color: 'white'
                      }}
                    >
                      <Check size={16} />
                      생성
                    </button>
                    <button 
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewPlaylistName('');
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: '#f3f4f6',
                        color: '#6b7280'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#f3f4f6';
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{
                borderTop: '1px solid #f1f5f9',
                paddingTop: '16px'
              }}>
                {playlists.length === 0 ? (
                  <p style={{
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    padding: '20px'
                  }}>
                    플레이리스트가 없습니다.
                  </p>
                ) : (
                  playlists.map(playlist => (
                    <div 
                      key={playlist.id}
                      onClick={() => addSongToPlaylist(playlist.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f0f4ff';
                        e.target.style.borderColor = '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.borderColor = 'transparent';
                      }}
                    >
                      <Music size={16} />
                      <span style={{
                        fontSize: '0.875rem',
                        color: '#374151',
                        fontWeight: 500
                      }}>
                        {playlist.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default LikedSongs;