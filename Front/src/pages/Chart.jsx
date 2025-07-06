// src/pages/Chart.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Play, Heart, Plus } from 'lucide-react';
import axios from 'axios';
import '../styles/Chart.css';

const Chart = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 중복 요청 방지를 위한 ref
  const isRequestingRef = useRef(false);

  // 차트 데이터 가져오기
  const fetchChartData = async (force = false) => {
    // 강제 요청이 아니고 이미 요청 중이면 중단
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
        timeout: 100000, // 100초 (Spotify 이미지 처리 시간 고려)
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

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchChartData();
    
    // 컴포넌트 언마운트 시 상태 초기화
    return () => {
      isRequestingRef.current = false;
    };
  }, []); // 빈 배열 유지 - 마운트 시에만 실행

  // 차트 순위별 스타일
  const getRankClass = (rank) => {
    if (rank === 1) return 'top-1';
    if (rank <= 3) return 'top-3';
    return '';
  };

  // 이미지 소스 배지 표시
  const getImageSourceBadge = (source) => {
    if (source === 'spotify') {
      return <span className="image-source-badge spotify">Spotify</span>;
    } else if (source === 'lastfm') {
      return <span className="image-source-badge lastfm">Last.fm</span>;
    }
    return null;
  };

  // 다시 시도 버튼 핸들러
  const handleRetry = () => {
    fetchChartData(true); // 강제 재시도
  };

  return (
    <div className="chart-page">
      <div className="chart-header">
        <h2 className="page-title">인기차트</h2>
      </div>
      
      {/* 로딩 상태 */}
      {isLoading && (
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <span>차트 데이터를 불러오는 중...</span>
          <p className="loading-info">
            이미지를 가져오는 중입니다. 잠시만 기다려주세요.
          </p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="chart-error">
          <p>{error}</p>
          <button onClick={handleRetry} className="retry-button">
            다시 시도
          </button>
        </div>
      )}
      
      {/* 차트 리스트 */}
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
                <button className="chart-action" title="좋아요">
                  <Heart size={18} />
                </button>
                <button className="chart-action" title="플레이리스트에 추가">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 데이터 없음 */}
      {!isLoading && !error && chartData.length === 0 && (
        <div className="chart-empty">
          <p>차트 데이터가 없습니다.</p>
          <button onClick={handleRetry} className="retry-button">
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
};

export default Chart;