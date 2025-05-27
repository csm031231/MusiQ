// src/pages/Chart.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Heart, Plus } from 'lucide-react';
import '../styles/Chart.css';

const Chart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API에서 차트 데이터 가져오기
  const fetchChartData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('http://54.180.116.4:3000/apichartPage', {
        timeout: 5000,
      });
      
      // API 응답 데이터를 변환
      const transformedData = response.data.map((item, index) => ({
        id: index + 1,
        rank: item.rank || index + 1,
        title: item.title || '제목 없음',
        artist: item.artist?.name || item.artist || '아티스트 없음',
        album: item.album || 'Unknown Album',
        playcount: item.playcount || 0,
        listeners: item.listeners || 0,
        image: item.image_small || item.image || null
      }));
      
      setChartData(transformedData);
    } catch (error1) {
      try {
        const response = await axios.get('http://localhost:8000/apichartPage', {
          timeout: 5000,
        });
        
        // API 응답 데이터를 변환
        const transformedData = response.data.map((item, index) => ({
          id: index + 1,
          rank: item.rank || index + 1,
          title: item.title || '제목 없음',
          artist: item.artist?.name || item.artist || '아티스트 없음',
          album: item.album || 'Unknown Album',
          playcount: item.playcount || 0,
          listeners: item.listeners || 0,
          image: item.image_small || item.image || null
        }));
        
        setChartData(transformedData);
      } catch (error2) {
        setError('데이터를 가져오는데 실패했습니다');
      }
    }
    
    setLoading(false);
  };

  // useEffect
  useEffect(() => {
    fetchChartData();
  }, []);

  // 차트 아이템 클래스 결정
  const getRankClass = (rank) => {
    if (rank === 1) return 'top-1';
    if (rank <= 3) return 'top-3';
    return '';
  };

  return (
    <div className="chart-page">
      <h2 className="page-title">인기차트</h2>
      
      {/* 로딩 표시 */}
      {loading && (
        <div className="loading">
          <p>차트를 불러오는 중...</p>
        </div>
      )}
      
      {/* 에러 표시 */}
      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchChartData}>다시 시도</button>
        </div>
      )}
      
      {/* 차트 리스트 */}
      {!loading && !error && chartData.length > 0 && (
        <div className="chart-list">
          {chartData.map(item => (
            <div key={item.id} className="chart-item">
              <span className={`chart-rank ${getRankClass(item.rank)}`}>{item.rank}</span>
              <div className="chart-image">
                {item.image && (
                  <img src={item.image} alt={`${item.title} 커버`} />
                )}
              </div>
              <div className="chart-info">
                <p className="chart-title">{item.title}</p>
                <p className="chart-artist">{item.artist}</p>
              </div>
              <div className="chart-actions">
                <button className="chart-action">
                  <Play size={18} />
                </button>
                <button className="chart-action">
                  <Heart size={18} />
                </button>
                <button className="chart-action">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Chart;