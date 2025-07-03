// src/pages/MyPage.jsx
import React, { useState } from 'react';
import { User, Music, Heart, History, Settings, LogOut } from 'lucide-react';
import '../styles/MyPage.css';

const MyPage = ({ setActiveModal }) => {
  const [activeTab, setActiveTab] = useState('profile');
  
  // 사용자 정보 (실제로는 API에서 받아올 것)
  const userInfo = {
    username: '음악사랑',
    email: 'music_lover@example.com',
    joinDate: '2023년 5월',
    profileImage: null // 실제로는 이미지 URL
  };
  
  // 내 플레이리스트 데이터 (실제로는 API에서 받아올 것)
  const myPlaylists = [
    { id: 1, title: '내가 만든 플레이리스트 #1', tracks: 12 },
    { id: 2, title: '출근길 음악', tracks: 8 },
    { id: 3, title: '운동할 때 듣는 음악', tracks: 15 }
  ];
  
  // 좋아요한 음악 데이터 (실제로는 API에서 받아올 것)
  const likedSongs = [
    { id: 1, title: '눈이 오는 날엔', artist: '이무진' },
    { id: 2, title: '밤편지', artist: '아이유' },
    { id: 3, title: 'Dynamite', artist: '방탄소년단' },
    { id: 4, title: 'Celebrity', artist: '아이유' },
    { id: 5, title: '라일락', artist: '아이유' }
  ];
  
  // 탭 메뉴 데이터
  const tabs = [
    { id: 'profile', name: '프로필', icon: <User size={18} /> },
    { id: 'playlists', name: '내 플레이리스트', icon: <Music size={18} /> },
    { id: 'liked', name: '좋아요한 음악', icon: <Heart size={18} /> },
    { id: 'history', name: '최근 들은 음악', icon: <History size={18} /> },
    { id: 'settings', name: '설정', icon: <Settings size={18} /> }
  ];
  
  // 탭 변경 핸들러
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
    window.dispatchEvent(new Event('login-status-change'));
    setActiveModal(null);
  };
  
  // 현재 탭에 따른 컨텐츠 렌더링
  const renderTabContent = () => {
    switch(activeTab) {
      case 'profile':
        return (
          <div className="profile-content">
            <div className="profile-header">
              <div className="MyPage-profile-avatar">
                {userInfo.profileImage ? (
                  <img src={userInfo.profileImage} alt="프로필" />
                ) : (
                  <User size={48} />
                )}
              </div>
              <div className="profile-details">
                <h3 className="profile-username">{userInfo.username}</h3>
                <p className="profile-email">{userInfo.email}</p>
                <p className="profile-joined">가입일: {userInfo.joinDate}</p>
              </div>
            </div>
            <div className="profile-stats">
              <div className="stat-item">
                <h4 className="stat-value">3</h4>
                <p className="stat-label">내 플레이리스트</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-value">5</h4>
                <p className="stat-label">좋아요한 음악</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-value">42</h4>
                <p className="stat-label">최근 들은 음악</p>
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={16} />
              <span>로그아웃</span>
            </button>
          </div>
        );
      
      case 'playlists':
        return (
          <div className="playlists-content">
            <button className="create-playlist-button">+ 새 플레이리스트 만들기</button>
            <div className="my-playlists-list">
              {myPlaylists.map(playlist => (
                <div key={playlist.id} className="my-playlist-item">
                  <div className="playlist-thumbnail"></div>
                  <div className="playlist-details">
                    <h4 className="playlist-name">{playlist.title}</h4>
                    <p className="playlist-tracks">{playlist.tracks}곡</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'liked':
        return (
          <div className="liked-songs-content">
            <h3 className="content-subtitle">좋아요한 음악 ({likedSongs.length})</h3>
            <div className="liked-songs-list">
              {likedSongs.map(song => (
                <div key={song.id} className="liked-song-item">
                  <div className="song-thumbnail"></div>
                  <div className="song-details">
                    <h4 className="song-title">{song.title}</h4>
                    <p className="song-artist">{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'history':
        return (
          <div className="history-content">
            <h3 className="content-subtitle">최근 들은 음악</h3>
            <p className="empty-state">아직 음악을 들은 기록이 없습니다.</p>
          </div>
        );
      
      case 'settings':
        return (
          <div className="settings-content">
            <h3 className="content-subtitle">설정</h3>
            <div className="settings-group">
              <h4 className="settings-group-title">계정</h4>
              <div className="settings-item">
                <label className="settings-label">사용자 이름 변경</label>
                <input type="text" className="settings-input" defaultValue={userInfo.username} />
              </div>
              <div className="settings-item">
                <label className="settings-label">이메일 변경</label>
                <input type="email" className="settings-input" defaultValue={userInfo.email} />
              </div>
              <button className="save-button">저장</button>
            </div>
            <div className="settings-group">
              <h4 className="settings-group-title">테마</h4>
              <div className="settings-item">
                <label className="settings-label">다크 모드</label>
                <label className="toggle-switch">
                  <input type="checkbox" />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>콘텐츠를 찾을 수 없습니다.</div>;
    }
  };

  return (
    <div className="mypage">
      <h2 className="page-title">마이페이지</h2>
      
      <div className="mypage-container">
        <div className="mypage-sidebar">
          <nav className="mypage-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mypage-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default MyPage;