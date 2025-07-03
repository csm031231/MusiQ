// src/pages/Login.jsx
import React, { useState } from 'react';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import '../styles/Login.css';

const Login = ({ setActiveModal }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
    
    // 테스트용 로그인 성공 시뮬레이션
    setTimeout(() => {
      const mockUserInfo = {
        id: 1,
        username: formData.email.split('@')[0],
        nickname: formData.email.split('@')[0],
        email: formData.email,
      };
      
      const mockToken = 'test-token-' + Date.now();
      
      localStorage.setItem('userToken', mockToken);
      localStorage.setItem('userInfo', JSON.stringify(mockUserInfo));
      
      window.dispatchEvent(new Event('login-status-change'));
      
      setIsLoading(false);
      setActiveModal(null);
    }, 1000);
  };
  
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-icon">
            <LogIn size={32} />
          </div>
          <h2 className="login-title">환영합니다!</h2>
          <p className="login-subtitle">계정에 로그인하고 음악을 즐겨보세요</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                name="email"
                className={`login-input ${errors.email ? 'error' : ''}`}
                placeholder="이메일 주소"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
          
          <div className="input-group">
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={`login-input ${errors.password ? 'error' : ''}`}
                placeholder="비밀번호"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>
          
          <div className="login-options">
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={isLoading}
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-label">로그인 상태 유지</span>
            </label>
            <button type="button" className="forgot-link">비밀번호 찾기</button>
          </div>
          
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                <span>로그인 중...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>로그인</span>
              </>
            )}
          </button>
        </form>

        <div className="divider">
        </div>
        
        {/* 개발용 테스트 버튼 */}
        {process.env.NODE_ENV === 'development' && (
          <button 
            className="test-login-btn"
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
          >
            🚀 테스트 계정으로 빠른 로그인
          </button>
        )}
        
        <div className="login-footer">
          <span>계정이 없으신가요?</span>
          <button className="signup-link" onClick={() => setActiveModal('signup')}>
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;