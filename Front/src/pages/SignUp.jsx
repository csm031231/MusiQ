// src/pages/SignUp.jsx
import React, { useState } from 'react';
import { UserPlus, User, Mail, Lock, Eye, EyeOff, Check } from 'lucide-react';
import '../styles/SignUp.css';

const SignUp = ({ setActiveModal }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  
  // 폼 제출 핸들러
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 유효성 검사
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = '사용자 이름을 입력해주세요';
    } else if (formData.username.length < 2) {
      newErrors.username = '사용자 이름은 2자 이상이어야 합니다';
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
    
    setIsLoading(true);
    
    // 테스트용 회원가입 처리
    setTimeout(() => {
      console.log('회원가입 완료:', formData);
      setIsLoading(false);
      setActiveModal('login');
    }, 1500);
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
        
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input
                type="text"
                name="username"
                className={`signup-input ${errors.username ? 'error' : ''}`}
                placeholder="사용자 이름"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            {errors.username && <span className="error-text">{errors.username}</span>}
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