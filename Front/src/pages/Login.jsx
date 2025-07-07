// src/pages/Login.jsx
import React, { useState } from 'react';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
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
  
  // API 기본 URL 설정
  const API_BASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://54.180.116.4:8000';
  
  
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
  
  // 에러 메시지 처리 함수
  const getErrorMessage = (error) => {
    console.log('전체 에러 객체:', error);
    console.log('에러 코드:', error.code);
    console.log('에러 메시지:', error.message);
    console.log('에러 응답:', error.response);
    
    // 네트워크 연결 오류
    if (error.code === 'ERR_NETWORK') {
      return 'API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
    }
    
    // 연결 거부 오류
    if (error.code === 'ECONNREFUSED') {
      return '서버 연결이 거부되었습니다. 서버 주소와 포트를 확인해주세요.';
    }
    
    // 타임아웃 오류
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return '요청 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.';
    }
    
    // CORS 오류
    if (error.message?.includes('CORS')) {
      return 'CORS 정책으로 인해 요청이 차단되었습니다. 서버 설정을 확인해주세요.';
    }
    
    // HTTP 상태 코드별 처리
    if (error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail;
      
      switch (status) {
        case 401:
          if (detail?.includes('Incorrect email or password')) {
            return { field: 'email', message: '이메일 또는 비밀번호가 잘못되었습니다.' };
          }
          return '인증에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
        case 422:
          return '입력 데이터가 올바르지 않습니다. 다시 확인해주세요.';
        case 500:
          return '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        default:
          return detail || `서버 오류가 발생했습니다. (상태 코드: ${status})`;
      }
    }
    
    // 기타 오류
    return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  };
  
  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
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
    setErrors({});
    
    const requestData = {
      email: formData.email.trim(),
      password: formData.password
    };
    
    console.log('로그인 요청 시작...');
    console.log('요청 URL:', `${API_BASE_URL}/users/login`);
    console.log('요청 데이터:', { ...requestData, password: '[HIDDEN]' });
    
    try {
      // Axios 설정
      const axiosConfig = {
        timeout: 15000, // 15초 타임아웃
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // CORS 관련 설정
        withCredentials: false,
      };
      
      // 로그인 API 호출
      const response = await axios.post(
        `${API_BASE_URL}/users/login`,
        requestData,
        axiosConfig
      );
      
      console.log('로그인 성공:', response.data);
      
      // 토큰 저장
      const { access_token } = response.data;
      localStorage.setItem('accessToken', access_token);
      
      // 사용자 정보 가져오기
      try {
        const userResponse = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          },
          timeout: 10000
        });
        
        console.log('사용자 정보 조회 성공:', userResponse.data);
        
        // 사용자 정보 저장
        localStorage.setItem('userInfo', JSON.stringify(userResponse.data));
        localStorage.setItem('userToken', access_token); // 기존 호환성을 위해
        
        // 로그인 상태 변경 이벤트 발생
        window.dispatchEvent(new Event('login-status-change'));
        
        // 모달 닫기
        setActiveModal(null);
        
      } catch (userError) {
        console.error('사용자 정보 조회 실패:', userError);
        
        // 토큰은 있지만 사용자 정보 조회 실패 시에도 로그인 처리
        localStorage.setItem('userToken', access_token);
        window.dispatchEvent(new Event('login-status-change'));
        setActiveModal(null);
        
        // 사용자에게 알림 (선택사항)
        console.warn('로그인은 성공했지만 사용자 정보 조회에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('로그인 실패:', error);
      
      const errorResult = getErrorMessage(error);
      
      if (typeof errorResult === 'object' && errorResult.field) {
        // 특정 필드 에러
        setErrors({ [errorResult.field]: errorResult.message });
      } else {
        // 일반 에러
        setErrors({ general: errorResult });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // 연결 테스트 함수
  const testConnection = async () => {
    try {
      console.log('서버 연결 테스트 중...');
      const response = await axios.get(`${API_BASE_URL}/docs`, { timeout: 5000 });
      console.log('연결 테스트 성공:', response.status);
      alert('서버 연결 성공!');
    } catch (error) {
      console.error('연결 테스트 실패:', error);
      alert(`서버 연결 실패: ${getErrorMessage(error)}`);
    }
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
        
        {/* 개발용 디버그 정보 */}
        {(typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') && (
          <div style={{
            background: '#f3f4f6',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.875rem',
            color: '#4b5563'
          }}>
            <div>API URL: {API_BASE_URL}</div>
            <button 
              type="button" 
              onClick={testConnection}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              연결 테스트
            </button>
          </div>
        )}
        
        <form className="login-form" onSubmit={handleSubmit}>
          {/* 일반 에러 메시지 */}
          {errors.general && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.875rem',
              wordBreak: 'break-word'
            }}>
              {errors.general}
            </div>
          )}
          
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
              localStorage.setItem('accessToken', 'test-token-' + Date.now());
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