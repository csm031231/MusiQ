// src/pages/Chart.jsx
import React, { useState } from 'react';
import { Play, Heart, Plus } from 'lucide-react';
import '../styles/Chart.css';

const Chart = () => {
  const [activeFilter, setActiveFilter] = useState('realtime');
  
  // 차트 필터 옵션
  const filters = [
    { id: 'realtime', name: '실시간' },
    { id: 'daily', name: '일간' },
    { id: 'weekly', name: '주간' },
    { id: 'monthly', name: '월간' },
    { id: 'yearly', name: '연간' }
  ];
  
  // 차트 데이터 (실제로는 API에서 받아올 것)
  const chartData = [
    { id: 1, rank: 1, title: '눈을 감으면', artist: '어반자카파', album: 'Seoul City Pop' },
    { id: 2, rank: 2, title: '옥탑방', artist: '엔플라잉', album: '옥탑방' },
    { id: 3, rank: 3, title: '그때 그 아인', artist: '김필', album: '슬기로운 의사생활 OST' },
    { id: 4, rank: 4, title: '작은 것들을 위한 시', artist: '방탄소년단', album: 'MAP OF THE SOUL : PERSONA' },
    { id: 5, rank: 5, title: '아로하', artist: '조정석', album: '슬기로운 의사생활 OST' },
    { id: 6, rank: 6, title: '어떻게 이별까지 사랑하겠어, 널 사랑하는 거지', artist: 'AKMU', album: '항해' },
    { id: 7, rank: 7, title: 'Blueming', artist: '아이유', album: 'Love poem' },
    { id: 8, rank: 8, title: '시작', artist: '가호', album: '이태원 클라쓰 OST Part.2' },
    { id: 9, rank: 9, title: '흔들리는 꽃들 속에서 네 샴푸향이 느껴진거야', artist: '장범준', album: '멜로가 체질 OST Part 3' },
    { id: 10, rank: 10, title: '마음을 드려요', artist: '아이유', album: '사랑의 불시착 OST Part 11' }
  ];
  
  // 필터 변경 핸들러
  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };
  
  // 차트 아이템 클래스 결정
  const getRankClass = (rank) => {
    if (rank === 1) return 'top-1';
    if (rank <= 3) return 'top-3';
    return '';
  };

  return (
    <div className="chart-page">
      <h2 className="page-title">인기차트</h2>
      
      {/* 차트 필터 */}
      <div className="chart-filters">
        {filters.map(filter => (
          <button
            key={filter.id}
            className={`chart-filter ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => handleFilterChange(filter.id)}
          >
            {filter.name}
          </button>
        ))}
      </div>
      
      {/* 차트 리스트 */}
      <div className="chart-list">
        {chartData.map(item => (
          <div key={item.id} className="chart-item">
            <span className={`chart-rank ${getRankClass(item.rank)}`}>{item.rank}</span>
            <div className="chart-image"></div>
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
    </div>
  );
};

export default Chart;