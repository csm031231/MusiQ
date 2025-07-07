import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Music, 
  User, 
  LogIn, 
  Radio, 
  BarChart2, 
  UserPlus, 
  PlusCircle,
  FileMusic,
  Library,
  Heart,
  Trash2,
  MoreHorizontal,
  Plus,
  X,
  ThumbsUp
} from 'lucide-react';
import axios from 'axios';
import '../styles/Sidebar.css';

// API 설정 (목록 조회용만)
const API_BASE_URL = 'http://54.180.116.4:8000'; // 로컬 테스트용

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const api = {
  getMyPlaylists: async () => {
    try {
      return await apiClient.get('/playlists/my-playlists');
    } catch (error) {
      console.error('플레이리스트 목록 조회 실패:', error);
      throw error;
    }
  }
};

const Sidebar = ({ isOpen, closeSidebar }) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  
  // 모달 상태 (디자인만)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    title: '',
    description: ''
  });

  // 로그인 상태 확인 및 플레이리스트 목록 조회만
  useEffect(() => {
    const checkLoginStatus = async () => {
      const accessToken = localStorage.getItem('accessToken');
      setIsLoggedIn(!!accessToken);
      
      if (accessToken) {
        try {
          const playlistsData = await api.getMyPlaylists();
          setPlaylists(playlistsData);
        } catch (error) {
          console.error('플레이리스트 로드 실패:', error);
          if (error.response?.status !== 401) {
            setPlaylists([]);
          }
        }
      } else {
        setPlaylists([]);
      }
    };
    
    checkLoginStatus();
    
    // 플레이리스트 변경 이벤트 리스닝
    window.addEventListener('playlist-updated', checkLoginStatus);
    
    return () => {
      window.removeEventListener('playlist-updated', checkLoginStatus);
    };
  }, []);

  // 모달에서 생성 버튼 클릭 시 - 실제 기능은 playlist 페이지에 위임
  const handleCreatePlaylist = () => {
    // 플레이리스트 데이터를 전역 이벤트로 전달
    const playlistData = {
      title: newPlaylist.title,
      description: newPlaylist.description,
      is_public: false
    };

    // 커스텀 이벤트로 플레이리스트 페이지에 생성 요청
    window.dispatchEvent(new CustomEvent('create-playlist-request', {
      detail: playlistData
    }));

    // 모달 닫기 및 플레이리스트 페이지로 이동
    setShowCreateModal(false);
    setNewPlaylist({ title: '', description: '' });
    closeSidebar();
    navigate('/my-playlists');
  };
  
  // 파일 업로드 처리
  const handleFileUpload = () => {
    document.getElementById('music-file-upload').click();
  };
  
  // 파일 선택 처리
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      closeSidebar();
      navigate('/upload-music', { state: { files } });
      e.target.value = null;
    }
  };
  
  // 기본 메뉴 항목 - 순서 변경 및 추천 플레이리스트 제거
  const menuItems = [
    { to: '/', icon: <Home size={20} />, label: '홈' },
    { to: '/chart', icon: <BarChart2 size={20} />, label: '인기차트' },
    { to: '/artist', icon: <Radio size={20} />, label: '아티스트' },
    { 
      action: (e) => {
        handleFileUpload();
        closeSidebar();
      }, 
      icon: <FileMusic size={20} />, 
      label: '음악 파일 업로드' 
    },
  ];

  // 로그인한 사용자를 위한 기타 메뉴 항목 - 좋아요 표시한 음악만
  const otherUserItems = [
    { to: '/liked-songs', icon: <ThumbsUp size={20} />, label: '좋아요 표시한 음악' },
  ];
  
  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          <ul className="nav-menu">
            {menuItems.map((item, index) => (
              <li key={item.to || index} className="nav-item">
                {item.to ? (
                  <NavLink 
                    to={item.to} 
                    className={({ isActive }) => 
                      isActive ? 'nav-link active' : 'nav-link'
                    }
                    onClick={() => {
                      console.log('메뉴 항목 클릭: ' + item.label);
                      closeSidebar();
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ) : (
                  <button 
                    className="nav-link" 
                    onClick={(e) => {
                      console.log('버튼 클릭: ' + item.label);
                      item.action(e);
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          
          {/* 기타 메뉴 항목 - 좋아요 표시한 음악 */}
          <ul className="nav-menu">
            {otherUserItems.map((item, index) => (
              <li key={index} className="nav-item">
                <NavLink 
                  to={item.to} 
                  className={({ isActive }) => 
                    isActive ? 'nav-link active' : 'nav-link'
                  }
                  onClick={() => {
                    console.log('라이브러리 항목 클릭: ' + item.label);
                    closeSidebar();
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          
          {/* 라이브러리 섹션 */}
          <h3 className="nav-section-title">
            <div className="section-header">
              <span>플레이리스트</span>
            </div>
          </h3>
          
          {/* 내 플레이리스트 헤더 */}
          <div className="playlist-header">     
              <NavLink 
                to="/my-playlists" 
                className={({ isActive }) => 
                  isActive ? 'playlist-link active' : 'playlist-link'
                }
                onClick={closeSidebar}
              >
                <Library size={20} />
                <span>최근에 만든 플레이리스트</span>
              </NavLink>
              
              {/* 플러스 버튼 - 모달만 오픈 */}
              <button 
                className="create-playlist-btn"
                onClick={() => setShowCreateModal(true)}
                title="새 플레이리스트 만들기"
              >
                <Plus size={16} />
              </button>
          </div>
          
          {/* 내 플레이리스트 목록 */}
          {playlists.length > 0 && (
            <ul className="playlist-menu">
              {playlists.map((playlist) => (
                <li 
                  key={playlist.id} 
                  className="nav-item playlist-item"
                >
                  <NavLink 
                    to={`/playlists/${playlist.id}`}
                    className={({ isActive }) => 
                      isActive ? 'nav-link active' : 'nav-link'
                    }
                    onClick={closeSidebar}
                  >
                    <span className="playlist-name">{playlist.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
          
          <hr className="nav-divider" />      
        </nav>
        
        {/* 숨겨진 파일 업로드 입력 */}
        <input
          type="file"
          id="music-file-upload"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          multiple
        />
      </aside>

      {/* 전체화면 모달 - 디자인만, 실제 기능은 playlist 페이지에서 처리 */}
      {showCreateModal && (
        <div className="fullscreen-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="fullscreen-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="fullscreen-modal-header">
              <button 
                className="fullscreen-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={24} />
              </button>
              <h2>새 재생목록</h2>
            </div>
            
            <div className="fullscreen-modal-body">
              <div className="playlist-form">
                <div className="form-field">
                  <label htmlFor="playlist-title">제목</label>
                  <input
                    id="playlist-title"
                    type="text"
                    placeholder="재생목록의 제목을 입력하세요"
                    value={newPlaylist.title}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="form-field">
                  <label htmlFor="playlist-description">설명</label>
                  <textarea
                    id="playlist-description"
                    placeholder="재생목록에 대해 설명해 주세요"
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                    rows="4"
                  />
                </div>
              </div>
            </div>
            
            <div className="fullscreen-modal-footer">
              <button 
                className="cancel-button"
                onClick={() => setShowCreateModal(false)}
              >
                취소
              </button>
              <button 
                className="create-button"
                onClick={handleCreatePlaylist}
                disabled={!newPlaylist.title.trim()}
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default Sidebar;