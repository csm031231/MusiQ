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

// API 설정
const API_BASE_URL = 'http://54.180.116.4:8000';

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
      // 강제 새로고침 대신 이벤트 발생
      window.dispatchEvent(new Event('login-status-change'));
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
  },
  
  // 플레이리스트 생성 API 추가
  createPlaylist: async (playlistData) => {
    try {
      return await apiClient.post('/playlists/', playlistData);
    } catch (error) {
      console.error('플레이리스트 생성 실패:', error);
      throw error;
    }
  }
};

const Sidebar = ({ isOpen, closeSidebar }) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  
  // 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    title: '',
    description: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  // 로그인 상태 확인 함수
  const checkLoginStatus = () => {
    const accessToken = localStorage.getItem('accessToken');
    const loggedIn = !!accessToken;
    console.log('로그인 상태 확인:', { accessToken: !!accessToken, loggedIn });
    setIsLoggedIn(loggedIn);
    return loggedIn;
  };

  // 플레이리스트 목록 로드 함수
  const loadPlaylists = async () => {
    const loggedIn = checkLoginStatus();
    
    if (loggedIn) {
      try {
        console.log('플레이리스트 목록 로드 시도...');
        const playlistsData = await api.getMyPlaylists();
        console.log('플레이리스트 로드 성공:', playlistsData);
        setPlaylists(playlistsData);
      } catch (error) {
        console.error('플레이리스트 로드 실패:', error);
        if (error.response?.status === 401) {
          console.log('401 에러 - 로그인 상태 재설정');
          setIsLoggedIn(false);
          localStorage.removeItem('accessToken');
        }
        setPlaylists([]);
      }
    } else {
      console.log('로그인되지 않음 - 플레이리스트 초기화');
      setPlaylists([]);
    }
  };

  // 로그인 상태 확인 및 플레이리스트 목록 조회
  useEffect(() => {
    console.log('Sidebar useEffect 실행');
    loadPlaylists();
    
    // 로그인 상태 변경 이벤트 리스닝
    const handleLoginStatusChange = () => {
      console.log('로그인 상태 변경 이벤트 감지');
      loadPlaylists();
    };

    // 플레이리스트 업데이트 이벤트 리스닝
    const handlePlaylistUpdate = () => {
      console.log('플레이리스트 업데이트 이벤트 감지');
      loadPlaylists();
    };
    
    // 홈에서 플레이리스트 생성 요청 이벤트 리스닝
    const handleCreateRequest = (event) => {
      console.log('플레이리스트 생성 요청 이벤트 감지:', event.detail);
      const playlistData = event.detail;
      if (playlistData) {
        setNewPlaylist({
          title: playlistData.title || '',
          description: playlistData.description || ''
        });
      }
      setShowCreateModal(true);
    };
    
    window.addEventListener('login-status-change', handleLoginStatusChange);
    window.addEventListener('playlist-updated', handlePlaylistUpdate);
    window.addEventListener('create-playlist-request', handleCreateRequest);
    
    return () => {
      window.removeEventListener('login-status-change', handleLoginStatusChange);
      window.removeEventListener('playlist-updated', handlePlaylistUpdate);
      window.removeEventListener('create-playlist-request', handleCreateRequest);
    };
  }, []);

  // 실제 플레이리스트 생성 함수
  const handleCreatePlaylist = async () => {
    console.log('플레이리스트 생성 시도:', { 
      title: newPlaylist.title, 
      isLoggedIn, 
      hasToken: !!localStorage.getItem('accessToken') 
    });

    if (!newPlaylist.title.trim()) {
      alert('플레이리스트 제목을 입력해주세요.');
      return;
    }

    // 실시간으로 로그인 상태 재확인
    const currentlyLoggedIn = checkLoginStatus();
    if (!currentlyLoggedIn) {
      alert('로그인이 필요합니다.');
      console.log('로그인 상태 확인 실패');
      return;
    }

    try {
      setIsCreating(true);
      
      const playlistData = {
        title: newPlaylist.title.trim(),
        description: newPlaylist.description.trim(),
        is_public: true
      };

      console.log('플레이리스트 생성 API 호출:', playlistData);
      const createdPlaylist = await api.createPlaylist(playlistData);
      console.log('플레이리스트 생성 성공:', createdPlaylist);

      // 성공 시 목록 새로고침
      await loadPlaylists();

      // 모달 닫기 및 상태 초기화
      setShowCreateModal(false);
      setNewPlaylist({ title: '', description: '' });
      
      // 전역 이벤트 발생 (다른 컴포넌트 업데이트용)
      window.dispatchEvent(new Event('playlist-updated'));
      
      // 생성된 플레이리스트로 이동
      navigate(`/playlists/${createdPlaylist.id}`);
      closeSidebar();

    } catch (error) {
      console.error('플레이리스트 생성 중 오류:', error);
      
      if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
        setIsLoggedIn(false);
        localStorage.removeItem('accessToken');
      } else {
        alert('플레이리스트 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // 플러스 버튼 클릭 시
  const handlePlusClick = () => {
    console.log('플러스 버튼 클릭:', { 
      isLoggedIn, 
      hasToken: !!localStorage.getItem('accessToken') 
    });

    // 실시간으로 로그인 상태 재확인
    const currentlyLoggedIn = checkLoginStatus();
    if (!currentlyLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }
    setShowCreateModal(true);
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
  
  // 기본 메뉴 항목
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

  // 로그인한 사용자를 위한 기타 메뉴 항목
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
                to="/playlists" 
                className={({ isActive }) => 
                  isActive ? 'playlist-link active' : 'playlist-link'
                }
                onClick={closeSidebar}
              >
                <Library size={20} />
                <span>최근에 만든 플레이리스트</span>
              </NavLink>
              
              {/* 플러스 버튼 */}
              <button 
                className="create-playlist-btn"
                onClick={handlePlusClick}
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

      {/* 전체화면 모달 - 실제 생성 기능 포함 */}
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
                    disabled={isCreating}
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
                    disabled={isCreating}
                  />
                </div>
              </div>
            </div>
            
            <div className="fullscreen-modal-footer">
              <button 
                className="cancel-button"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                취소
              </button>
              <button 
                className="create-button"
                onClick={handleCreatePlaylist}
                disabled={!newPlaylist.title.trim() || isCreating}
              >
                {isCreating ? '만드는 중...' : '만들기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;