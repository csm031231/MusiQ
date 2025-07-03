// src/pages/Chart.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Heart, Plus, RefreshCw } from 'lucide-react';
import axios from 'axios';
import '../styles/Chart.css';

const Chart = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyProgress, setSpotifyProgress] = useState(0);
  
  // 폴링 관련 상태
  const intervalRef = useRef(null);
  const [isPolling, setIsPolling] = useState(false);

  // 초기 차트 데이터 로드 (Last.fm 데이터)
  const fetchChartData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('차트 데이터 요청 중: http://localhost:8000/api/chartPage');
      
      const response = await axios.get('http://localhost:8000/api/chartPage', {
        timeout: 10000, // 10초로 단축 (빠른 Last.fm 응답 기대)
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('차트 데이터 받기 성공:', response.data);
      
      if (response.data.tracks) {
        setChartData(response.data.tracks);
        
        // Spotify 이미지 로딩이 진행 중인 경우
        if (response.data.spotify_loading) {
          setSpotifyLoading(true);
          startSpotifyImagePolling();
        }
      } else {
        setChartData(response.data || []);
      }
    } catch (err) {
      console.error('차트 데이터 받기 실패:', err);
      const errorMessage = err.code === 'ECONNABORTED'
        ? '요청 시간이 초과되었습니다. 서버 응답이 느릴 수 있습니다.'
        : err.response?.status === 404 
        ? '차트 API 엔드포인트를 찾을 수 없습니다. 백엔드 서버를 확인해주세요.'
        : '차트 데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Spotify 이미지 업데이트 폴링
  const startSpotifyImagePolling = useCallback(() => {
    if (isPolling) return; // 이미 폴링 중이면 중복 실행 방지
    
    setIsPolling(true);
    
    const pollSpotifyImages = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/spotify-images', {
          timeout: 5000
        });
        
        if (response.data.updated_tracks && response.data.updated_tracks.length > 0) {
          // 업데이트된 이미지들을 차트 데이터에 반영
          setChartData(prevData => {
            const updatedData = [...prevData];
            
            response.data.updated_tracks.forEach(updatedTrack => {
              const index = updatedData.findIndex(track => track.rank === updatedTrack.rank);
              if (index !== -1) {
                updatedData[index] = {
                  ...updatedData[index],
                  image_small: updatedTrack.image_small,
                  spotify_image_loaded: updatedTrack.spotify_image_loaded
                };
              }
            });
            
            return updatedData;
          });
          
          // 진행률 업데이트
          const progress = Math.round((response.data.updated_tracks.length / chartData.length) * 100);
          setSpotifyProgress(progress);
        }
        
        // 완료된 경우 폴링 중단
        if (response.data.completed) {
          setSpotifyLoading(false);
          setSpotifyProgress(100);
          stopSpotifyImagePolling();
        }
        
      } catch (err) {
        console.warn('Spotify 이미지 폴링 오류:', err);
        // 폴링 오류는 사용자에게 표시하지 않음 (선택사항)
      }
    };
    
    // 2초마다 폴링
    intervalRef.current = setInterval(pollSpotifyImages, 2000);
    
    // 첫 번째 폴링 즉시 실행
    pollSpotifyImages();
  }, [isPolling, chartData.length]);

  const stopSpotifyImagePolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // 개별 이미지 수동 업데이트 (옵션)
  const updateSingleImage = async (track) => {
    try {
      const response = await axios.post('http://localhost:8000/api/update-single-image', null, {
        params: {
          track_name: track.title,
          artist_name: track.artist.name,
          rank: track.rank
        }
      });
      
      if (response.data.success) {
        setChartData(prevData => {
          const updatedData = [...prevData];
          const index = updatedData.findIndex(item => item.rank === track.rank);
          if (index !== -1) {
            updatedData[index] = {
              ...updatedData[index],
              image_small: response.data.image_url,
              spotify_image_loaded: true
            };
          }
          return updatedData;
        });
      }
    } catch (err) {
      console.error(`이미지 업데이트 실패 (${track.title}):`, err);
    }
  };

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchChartData();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
      stopSpotifyImagePolling(); // 컴포넌트 언마운트 시 폴링 중단
    };
  }, [stopSpotifyImagePolling]);

  // 차트 아이템 클래스 결정
  const getRankClass = (rank) => {
    if (rank === 1) return 'top-1';
    if (rank <= 3) return 'top-3';
    return '';
  };

  return (
    <div className="chart-page">
      <div className="chart-header">
        <h2 className="page-title">인기차트</h2>
        
        {/* Spotify 이미지 로딩 진행률 표시 */}
        {spotifyLoading && (
          <div className="spotify-loading-info">
            <RefreshCw size={16} className="spinning" />
            <span>고품질 이미지 로딩 중... ({spotifyProgress}%)</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${spotifyProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* 로딩 상태 */}
      {isLoading && (
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <span>차트 데이터를 불러오는 중...</span>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="chart-error">
          <p>{error}</p>
          <button onClick={fetchChartData} className="retry-button">
            다시 시도
          </button>
        </div>
      )}
      
      {/* 차트 리스트 */}
      {!isLoading && !error && chartData.length > 0 && (
        <div className="chart-list">
          {chartData.map(item => (
            <div key={item.rank} className="chart-item">
              <span className={`chart-rank ${getRankClass(item.rank)}`}>{item.rank}</span>
              <div className="chart-image">
                {item.image_small ? (
                  <div className="image-container">
                    <img 
                      src={item.image_small} 
                      alt={item.title}
                      className={`track-image ${item.spotify_image_loaded ? 'spotify-loaded' : 'lastfm-image'}`}
                    />
                    {/* 이미지 품질 표시 */}
                    {!item.spotify_image_loaded && (
                      <div className="image-quality-indicator">
                        <span>기본</span>
                      </div>
                    )}
                    {item.spotify_image_loaded && (
                      <div className="image-quality-indicator spotify">
                        <span>HD</span>
                      </div>
                    )}
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
                  <span className="playcount">재생: {parseInt(item.playcount).toLocaleString()}</span>
                  <span className="listeners">청취자: {parseInt(item.listeners).toLocaleString()}</span>
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
                <button className="chart-action" title="좋아요">
                  <Heart size={18} />
                </button>
                <button className="chart-action" title="플레이리스트에 추가">
                  <Plus size={18} />
                </button>
                {/* 수동 이미지 업데이트 버튼 (개발용) */}
                {!item.spotify_image_loaded && (
                  <button 
                    className="chart-action update-image"
                    onClick={() => updateSingleImage(item)}
                    title="고품질 이미지 로드"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 데이터 없음 */}
      {!isLoading && !error && chartData.length === 0 && (
        <div className="chart-empty">
          <p>차트 데이터가 없습니다.</p>
        </div>
      )}
    </div>
  );
};

export default Chart;