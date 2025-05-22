// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, LogIn, User, ChevronDown, LogOut, Menu } from 'lucide-react';
import '../styles/Header.css';

const Header = ({ toggleSidebar, setActiveModal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // 로그인 상태 확인 함수
  const checkLoginStatus = () => {
    const userToken = localStorage.getItem('userToken');
    const storedUserInfo = localStorage.getItem('userInfo');
    
    if (userToken) {
      setIsLoggedIn(true);
      
      if (storedUserInfo) {
        try {
          const parsedUserInfo = JSON.parse(storedUserInfo);
          setUserInfo(parsedUserInfo);
        } catch (error) {
          console.error('사용자 정보 파싱 오류:', error);
        }
      }
    } else {
      setIsLoggedIn(false);
      setUserInfo(null);
    }
  };
  
  // 컴포넌트 마운트 시 및 경로 변경 시 로그인 상태 확인
  useEffect(() => {
    checkLoginStatus();
  }, [location.pathname]);

  // 스토리지 변경 이벤트를 리스닝
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'userToken' || e.key === 'userInfo') {
        checkLoginStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // 로그인 상태 변경 이벤트
    const handleCustomEvent = () => {
      checkLoginStatus();
    };
    
    window.addEventListener('login-status-change', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('login-status-change', handleCustomEvent);
    };
  }, []);
  
  // 검색 처리
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    setSearchQuery('');
  };
  
  // 로그아웃 처리
  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
    setIsLoggedIn(false);
    setUserInfo(null);
    setShowProfileMenu(false);
    
    // 로그인 상태 변경 이벤트 발생
    window.dispatchEvent(new Event('login-status-change'));
    
    navigate('/');
  };
  
  // 프로필 메뉴 토글
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  // 마이페이지 클릭 핸들러
  const handleMyPageClick = () => {
    setActiveModal('mypage');
    setShowProfileMenu(false);
  };
  
  // 프로필 이미지 URL
  const profileImageUrl = userInfo?.profileImage || null;
  
  return (
    <header className="header">
      <div className="header-left">
        {/* 메뉴 버튼 */}
        <button 
          onClick={toggleSidebar}
          className="menu-button"
          aria-label="메뉴 열기/닫기"
        >
          <Menu size={24} />
        </button>
        <Link to="/" className="app-title">MusiQ</Link>
      </div>
      
      <div className="header-mid">
        <form className="header-search-form" onSubmit={handleSearch}>
          <div className="header-search-container">
            <input
              type="text"
              placeholder="음악, 아티스트, 앨범을 검색하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="header-search-input"
            />
            <button type="submit" className="header-search-button">
              <Search size={18} />
            </button>
          </div>
        </form>
      </div>
      
      <div className="header-right">
        {isLoggedIn ? (
          <div className="profile-container">
            <button className="profile-button" onClick={toggleProfileMenu}>
              <div className="profile-avatar">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="프로필" className="avatar-image" />
                ) : (
                  <User size={16} />
                )}
              </div>
              <span className="profile-name">
                {userInfo?.nickname || userInfo?.username || '사용자'}
              </span>
              <ChevronDown size={14} />
            </button>
            
            {showProfileMenu && (
              <div className="profile-dropdown">
                <button className="dropdown-item" onClick={handleMyPageClick}>
                  <User size={14} />
                  <span>마이페이지</span>
                </button>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  <LogOut size={14} />
                  <span>로그아웃</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="login-button" onClick={() => setActiveModal('login')}>
            <LogIn size={16} />
            <span>로그인</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;