// src/pages/Login.jsx
import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import '../styles/Auth.css';

const Login = ({ setActiveModal }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // 폼 입력 핸들러
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // 입력 시 해당 필드의 에러 메시지 제거
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // 폼 제출 핸들러
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 유효성 검사
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
    }
    
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    // TODO: 실제 로그인 로직 구현 (API 호출 등)
    console.log('로그인 시도:', formData);
    
    // 테스트용 로그인 성공 시뮬레이션
    setTimeout(() => {
      // 테스트용 사용자 정보
      const mockUserInfo = {
        id: 1,
        username: formData.email.split('@')[0],
        nickname: formData.email.split('@')[0],
        email: formData.email,
        // 실제 API에서는 서버에서 받은 사용자 정보로 대체
      };
      
      // 테스트용 토큰 (실제로는 서버에서 받은 토큰)
      const mockToken = 'test-token-' + Date.now();
      
      // 로컬 스토리지에 사용자 정보 및 토큰 저장
      localStorage.setItem('userToken', mockToken);
      localStorage.setItem('userInfo', JSON.stringify(mockUserInfo));
      
      // 로그인 상태 변경 이벤트 발생 (헤더 컴포넌트에서 감지)
      window.dispatchEvent(new Event('login-status-change'));
      
      setIsLoading(false);
      
      // 모달 닫기
      setActiveModal(null);
    }, 1000); // 1초 후 로그인 성공 (실제로는 API 응답 시간)
  };
  
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title">로그인</h2>
          <p className="auth-subtitle">계정에 로그인하고 음악을 즐겨보세요!</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="이메일 주소를 입력하세요"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="비밀번호를 입력하세요"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
            {errors.password && <p className="error-message">{errors.password}</p>}
          </div>
          
          <div className="form-options">
            <div className="remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={isLoading}
              />
              <label htmlFor="rememberMe">로그인 상태 유지</label>
            </div>
            <button type="button" className="forgot-password">비밀번호 찾기</button>
          </div>
          
          <button type="submit" className="auth-button" disabled={isLoading}>
            <LogIn size={16} />
            <span>{isLoading ? '로그인 중...' : '로그인'}</span>
          </button>
        </form>
        
        {/* 테스트용 빠른 로그인 버튼 (개발 중에만 사용, 배포 시 제거) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ margin: '10px 0', textAlign: 'center' }}>
            <button 
              onClick={() => {
                const testUser = {
                  id: 1,
                  username: 'testuser',
                  nickname: '테스트 사용자',
                  email: 'test@example.com'
                };
                localStorage.setItem('userToken', 'test-token-' + Date.now());
                localStorage.setItem('userInfo', JSON.stringify(testUser));
                window.dispatchEvent(new Event('login-status-change'));
                setActiveModal(null);
              }}
              style={{ 
                background: '#4CAF50', 
                color: 'white', 
                padding: '8px 12px', 
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              테스트 계정으로 빠른 로그인
            </button>
          </div>
        )}     
        <div className="auth-footer">
          <p>계정이 없으신가요? <button className="auth-link" onClick={() => setActiveModal('signup')}>회원가입</button></p>
        </div>
      </div>
    </div>
  );
};

export default Login;