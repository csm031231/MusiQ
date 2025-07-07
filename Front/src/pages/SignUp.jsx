// src/pages/SignUp.jsx (닉네임 필드 포함)
import React, { useState } from 'react';
import { UserPlus, User, Mail, Lock, Eye, EyeOff, Check, AtSign } from 'lucide-react';
import axios from 'axios';
import '../styles/SignUp.css';

const SignUp = ({ setActiveModal }) => {
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  // 비밀번호 강도 체크
  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, text: '' };
    if (password.length < 4) return { strength: 1, text: '매우 약함' };
    if (password.length < 6) return { strength: 2, text: '약함' };
    if (password.length < 8) return { strength: 3, text: '보통' };
    
    let score = 3;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score >= 6) return { strength: 5, text: '매우 강함' };
    if (score >= 5) return { strength: 4, text: '강함' };
    return { strength: 3, text: '보통' };
  };
  
  const passwordStrength = getPasswordStrength(formData.password);
  
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
        case 400:
          if (detail?.includes('Email already registered')) {
            return { field: 'email', message: '이미 가입된 이메일입니다.' };
          }
          if (detail?.includes('Username already taken')) {
            return { field: 'username', message: '이미 사용 중인 사용자 이름입니다.' };
          }
          return detail || '잘못된 요청입니다.';
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
    
    if (!formData.username.trim()) {
      newErrors.username = '사용자 이름을 입력해주세요';
    } else if (formData.username.length < 2) {
      newErrors.username = '사용자 이름은 2자 이상이어야 합니다';
    }
    
    // nickname이 비어있으면 username을 기본값으로 사용
    const nickname = formData.nickname.trim() || formData.username.trim();
    
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
    }
    
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호를 확인해주세요';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }
    
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = '이용약관에 동의해주세요';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    const requestData = {
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      nickname: nickname // nickname이 비어있으면 username 사용
    };
    
    console.log('회원가입 요청 시작...');
    console.log('요청 URL:', `${API_BASE_URL}/users/register`);
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
      
      const response = await axios.post(
        `${API_BASE_URL}/users/register`,
        requestData,
        axiosConfig
      );
      
      console.log('회원가입 성공:', response.data);
      
      // 성공 시 로그인 모달로 전환
      setActiveModal('login');
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      
    } catch (error) {
      console.error('회원가입 실패:', error);
      
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
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-header">
          <div className="signup-icon">
            <UserPlus size={32} />
          </div>
          <h2 className="signup-title">계정 만들기</h2>
          <p className="signup-subtitle">새로운 음악 여행을 시작해보세요</p>
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
        
        <form className="signup-form" onSubmit={handleSubmit}>
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
              <User className="input-icon" size={20} />
              <input
                type="text"
                name="username"
                className={`signup-input ${errors.username ? 'error' : ''}`}
                placeholder="사용자 이름 (로그인 ID)"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>
          
          <div className="input-group">
            <div className="input-wrapper">
              <AtSign className="input-icon" size={20} />
              <input
                type="text"
                name="nickname"
                className={`signup-input ${errors.nickname ? 'error' : ''}`}
                placeholder="닉네임 (선택사항)"
                value={formData.nickname}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            {errors.nickname && <span className="error-text">{errors.nickname}</span>}
          </div>
          
          <div className="input-group">
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                name="email"
                className={`signup-input ${errors.email ? 'error' : ''}`}
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
                className={`signup-input ${errors.password ? 'error' : ''}`}
                placeholder="비밀번호 (8자 이상)"
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
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className={`strength-fill strength-${passwordStrength.strength}`}
                    style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  ></div>
                </div>
                <span className={`strength-text strength-${passwordStrength.strength}`}>
                  {passwordStrength.text}
                </span>
              </div>
            )}
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>
          
          <div className="input-group">
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                className={`signup-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="비밀번호 확인"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="password-match">
                  <Check size={20} />
                </div>
              )}
            </div>
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>
          
          <div className="terms-group">
            <label className="terms-wrapper">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                disabled={isLoading}
              />
              <span className="terms-checkbox"></span>
              <span className="terms-text">
                <span className="terms-link">이용약관</span> 및 <span className="terms-link">개인정보 처리방침</span>에 동의합니다
              </span>
            </label>
            {errors.agreeTerms && <span className="error-text">{errors.agreeTerms}</span>}
          </div>
          
          <button type="submit" className="signup-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                <span>계정 생성 중...</span>
              </>
            ) : (
              <>
                <UserPlus size={18} />
                <span>회원가입</span>
              </>
            )}
          </button>
        </form>

        <div className="divider">     
        </div>
      
        <div className="signup-footer">
          <span>이미 계정이 있으신가요?</span>
          <button className="login-link" onClick={() => setActiveModal('login')}>
            로그인
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;