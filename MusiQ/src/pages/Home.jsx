// src/pages/Home.jsx
import React from 'react';
import FeaturedSection from '../components/FeaturedSection';
import '../styles/Home.css';

const Home = () => {
  // 홈 페이지에 표시할 섹션 데이터
  const sections = [
    { 
      id: 'daily', 
      title: '오늘의 추천',
      items: [
        { id: 1, title: '잔잔한 아침', artist: '로피 비트' },
        { id: 2, title: '활기찬 오후', artist: '팝 아티스트' },
        { id: 3, title: '감성적인 저녁', artist: '인디 밴드' }
      ]
    },
    { 
      id: 'new', 
      title: '최신 음악',
      items: [
        { id: 4, title: '신나는 여름', artist: '써머 보이즈' },
        { id: 5, title: '꿈꾸는 밤', artist: '드림 걸스' },
        { id: 6, title: '도시의 새벽', artist: '어반 사운드' }
      ]
    },
    { 
      id: 'popular', 
      title: '인기 플레이리스트',
      items: [
        { id: 7, title: '워킹 아웃', artist: '운동 모음' },
        { id: 8, title: '집중 스터디', artist: '공부용 BGM' },
        { id: 9, title: '드라이브', artist: '야간 드라이브' }
      ]
    }
  ];

  return (
    <div className="home-page">
      <h2 className="page-title">홈</h2>
      <div className="sections-grid">
        {sections.map(section => (
          <FeaturedSection 
            key={section.id}
            title={section.title}
            items={section.items}
          />
        ))}
      </div>
    </div>
  );
};

export default Home;