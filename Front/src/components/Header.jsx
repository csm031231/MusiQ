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
  
  // 로그인 상태 확인 함수 - Login.jsx 패턴에 맞춤
  const checkLoginStatus = () => {
    // Login.jsx에서 사용하는 토큰 키들 확인
    const accessToken = localStorage.getItem('accessToken'); // 주요 토큰
    const userToken = localStorage.getItem('userToken'); // 기존 호환성
    const access_token = localStorage.getItem('access_token'); // MyPage 호환성
    const storedUserInfo = localStorage.getItem('userInfo');
    
    if (accessToken || userToken || access_token) {
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
      if (e.key === 'accessToken' || e.key === 'userToken' || e.key === 'access_token' || e.key === 'userInfo') {
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
  
  // 검색 처리 - 검색 페이지로 이동하면서 쿼리 전달
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // 검색 페이지로 이동하면서 검색어를 URL 파라미터로 전달
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };
  
  // 로그아웃 처리 - Login.jsx 패턴에 맞춤
  const handleLogout = () => {
    // 모든 토큰 삭제 (Login.jsx와 동일)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('access_token');
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

  // 마이페이지 클릭 핸들러 - 토큰 확인 로직 개선
  const handleMyPageClick = () => {
    // Login.jsx와 동일한 방식으로 토큰 확인
    const accessToken = localStorage.getItem('accessToken');
    const userToken = localStorage.getItem('userToken');
    const access_token = localStorage.getItem('access_token');
    
    // 어떤 토큰이든 있으면 마이페이지 열기
    if (accessToken || userToken || access_token) {
      setActiveModal('mypage');
    } else {
      // 토큰이 없으면 로그인 모달 열기
      alert('마이페이지를 이용하시려면 로그인해주세요.');
      setActiveModal('login');
    }
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
          <button className="header-login-button" onClick={() => setActiveModal('login')}>
            <LogIn size={16} />
            <span>로그인</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;