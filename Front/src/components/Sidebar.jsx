// src/components/Sidebar.jsx
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
  Trash2, // 삭제 아이콘 추가
  MoreHorizontal // 메뉴 아이콘 추가
} from 'lucide-react';
import '../styles/Sidebar.css';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [hoverPlaylistId, setHoverPlaylistId] = useState(null); // 호버 상태 추가
  
  // 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = () => {
      const userToken = localStorage.getItem('userToken');
      setIsLoggedIn(!!userToken);
      
      // 로그인되어 있으면 내 플레이리스트 목록 가져오기
      if (userToken) {
        // 실제로는 API에서 가져와야 함
        // 여기서는 로컬스토리지를 임시로 사용
        const savedPlaylists = localStorage.getItem('userPlaylists');
        if (savedPlaylists) {
          try {
            setPlaylists(JSON.parse(savedPlaylists));
          } catch (error) {
            console.error('플레이리스트 정보 파싱 오류:', error);
            setPlaylists([]);
          }
        }
      } else {
        setPlaylists([]);
      }
    };
    
    checkLoginStatus();
    
    // 로그인 상태 변경 이벤트 리스닝
    window.addEventListener('login-status-change', checkLoginStatus);
    window.addEventListener('storage', (e) => {
      if (e.key === 'userToken' || e.key === 'userPlaylists') {
        checkLoginStatus();
      }
    });
    
    // 플레이리스트 변경 이벤트
    window.addEventListener('playlist-updated', checkLoginStatus);
    
    return () => {
      window.removeEventListener('login-status-change', checkLoginStatus);
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('playlist-updated', checkLoginStatus);
    };
  }, []);
  
  // 새 플레이리스트 생성
  const createNewPlaylist = () => {
    // 만약 로그인되어 있지 않다면 로그인 페이지로 이동
    if (!isLoggedIn) {
      closeSidebar();
      navigate('/login');
      return;
    }
    
    // 플레이리스트 생성 로직 (실제로는 API 호출)
    const newPlaylistName = `내 플레이리스트 ${playlists.length + 1}`;
    const newPlaylist = {
      id: Date.now(), // 임시 ID
      name: newPlaylistName,
      songs: []
    };
    
    // 새 플레이리스트 추가
    const updatedPlaylists = [...playlists, newPlaylist];
    
    // 로컬 스토리지에 저장 (실제로는 API에 저장)
    localStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists));
    
    // 상태 업데이트
    setPlaylists(updatedPlaylists);
    
    // 이벤트 발생
    window.dispatchEvent(new Event('playlist-updated'));
    
    // 새 플레이리스트 페이지로 이동
    closeSidebar();
    navigate(`/my-playlists/${newPlaylist.id}`);
  };
  
  // 플레이리스트 삭제
  const deletePlaylist = (playlistId, event) => {
    // 이벤트 전파 중단 (NavLink 클릭 방지)
    event.stopPropagation();
    event.preventDefault();
    
    // 삭제 확인
    if (window.confirm('이 플레이리스트를 삭제하시겠습니까?')) {
      // 플레이리스트 삭제 로직 (실제로는 API 호출)
      const updatedPlaylists = playlists.filter(playlist => playlist.id !== playlistId);
      
      // 로컬 스토리지에 저장 (실제로는 API에 저장)
      localStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists));
      
      // 상태 업데이트
      setPlaylists(updatedPlaylists);
      
      // 이벤트 발생
      window.dispatchEvent(new Event('playlist-updated'));
      
      // 만약 현재 보고 있는 플레이리스트가 삭제된 경우 홈으로 이동
      if (window.location.pathname.includes(`/my-playlists/${playlistId}`)) {
        navigate('/my-playlists');
      }
    }
  };
  
  // 파일 업로드 처리
  const handleFileUpload = () => {
    // 만약 로그인되어 있지 않다면 로그인 페이지로 이동
    if (!isLoggedIn) {
      closeSidebar();
      navigate('/login');
      return;
    }
    
    // 파일 업로드 트리거
    document.getElementById('music-file-upload').click();
  };
  
  // 파일 선택 처리
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      // 선택된 파일을 처리하는 페이지로 이동하거나 상태에 저장
      closeSidebar();
      navigate('/upload-music', { state: { files } });
      
      // 파일 입력 초기화 (동일 파일 재선택 가능하도록)
      e.target.value = null;
    }
  };
  
  // 기본 메뉴 항목
  const menuItems = [
    { to: '/', icon: <Home size={20} />, label: '홈' },
    { to: '/playlists', icon: <Music size={20} />, label: '추천 플레이리스트' },
    { to: '/chart', icon: <BarChart2 size={20} />, label: '인기차트' },
    { to: '/artist', icon: <Radio size={20} />, label: '아티스트' },
  ];

  // 로그인한 사용자를 위한 기타 메뉴 항목
  const otherUserItems = [
    { to: '/liked-songs', icon: <Heart size={20} />, label: '좋아요한 음악' },
    { 
      action: (e) => {
        handleFileUpload();
        closeSidebar(); // 명시적으로 사이드바 닫기 추가
      }, 
      icon: <FileMusic size={20} />, 
      label: '음악 파일 업로드' 
    },
  ];
  
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        <ul className="nav-menu">
          {menuItems.map((item) => (
            <li key={item.to} className="nav-item">
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
            </li>
          ))}
        </ul>
        
        {isLoggedIn && (
          <>
            <h3 className="nav-section-title">
              <div className="section-header">
                <span>라이브러리</span>
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
                  <span>내 플레이리스트</span>
                </NavLink>             
            </div>
            
            {/* 내 플레이리스트 목록 */}
            {playlists.length > 0 && (
              <ul className="playlist-menu">
                {playlists.map((playlist) => (
                  <li 
                    key={playlist.id} 
                    className="nav-item playlist-item"
                    onMouseEnter={() => setHoverPlaylistId(playlist.id)}
                    onMouseLeave={() => setHoverPlaylistId(null)}
                  >
                    <NavLink 
                      to={`/my-playlists/${playlist.id}`} 
                      className={({ isActive }) => 
                        isActive ? 'nav-link active' : 'nav-link'
                      }
                      onClick={closeSidebar}
                    >
                      <span className="playlist-name">{playlist.name}</span>
                      
                      {/* 삭제 버튼 - 호버 시에만 표시 */}
                      {hoverPlaylistId === playlist.id && (
                        <button 
                          className="delete-playlist-button"
                          onClick={(e) => deletePlaylist(playlist.id, e)}
                          title="플레이리스트 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
            
            {/* 기타 메뉴 항목 */}
            <ul className="nav-menu">
              {otherUserItems.map((item, index) => (
                <li key={index} className="nav-item">
                  {item.to ? (
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
          </>
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
  );
};

export default Sidebar;