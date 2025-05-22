// src/pages/SignUp.jsx
import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import '../styles/Auth.css';

const SignUp = ({ setActiveModal }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [errors, setErrors] = useState({});
  
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
    
    if (!formData.username.trim()) {
      newErrors.username = '사용자 이름을 입력해주세요';
    }
    
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
    
    // TODO: 실제 회원가입 로직 구현 (API 호출 등)
    console.log('회원가입 시도:', formData);
    
    // 성공했다고 가정하고 로그인 모달로 전환
    setActiveModal('login');
  };
  
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title">회원가입</h2>
          <p className="auth-subtitle">새로운 계정을 만들고 음악을 탐색해보세요!</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">사용자 이름</label>
            <input
              type="text"
              id="username"
              name="username"
              className={`form-input ${errors.username ? 'error' : ''}`}
              placeholder="사용자 이름을 입력하세요"
              value={formData.username}
              onChange={handleChange}
            />
            {errors.username && <p className="error-message">{errors.username}</p>}
          </div>
          
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
              placeholder="비밀번호를 입력하세요 (8자 이상)"
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <p className="error-message">{errors.password}</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="비밀번호를 다시 입력하세요"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
          </div>
          
          <div className="form-options">
            <div className="agree-terms">
              <input
                type="checkbox"
                id="agreeTerms"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
              />
              <label htmlFor="agreeTerms">
                <span>이용약관</span>과 <span>개인정보 처리방침</span>에 동의합니다
              </label>
            </div>
            {errors.agreeTerms && <p className="error-message">{errors.agreeTerms}</p>}
          </div>
          
          <button type="submit" className="auth-button">
            <UserPlus size={16} />
            <span>회원가입</span>
          </button>
        </form>
        
        <div className="social-login">
          <p className="social-login-text">소셜 계정으로 가입</p>
          <div className="social-buttons">
            <button className="social-button google">구글</button>
            <button className="social-button kakao">카카오</button>
            <button className="social-button naver">네이버</button>
          </div>
        </div>
        
        <div className="auth-footer">
          <p>이미 계정이 있으신가요? <button className="auth-link" onClick={() => setActiveModal('login')}>로그인</button></p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;