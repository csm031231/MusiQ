// src/pages/MyPage.jsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { User, Settings, LogOut, X, Save, AlertCircle, CheckCircle, Mail, Lock } from 'lucide-react';
import axios from 'axios';

// API 설정 - Login.jsx와 동일하게 설정
const API_BASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://54.180.116.4:8000';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// 요청 인터셉터 (토큰 자동 추가)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken'); // Login.jsx와 동일한 키 사용
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API 서비스
const apiService = {
  // 이메일 기반 로그인
  login: async (email, password) => {
    try {
      const response = await api.post('/users/login', {
        email: email,
        password: password
      });
      
      // 토큰 저장 (Login.jsx와 동일한 방식)
      const { access_token } = response.data;
      localStorage.setItem('accessToken', access_token);
      
      // 사용자 정보 가져오기
      const userResponse = await api.get('/users/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      
      // 사용자 정보 저장 (Login.jsx와 동일한 방식)
      localStorage.setItem('userInfo', JSON.stringify(userResponse.data));
      localStorage.setItem('userToken', access_token); // 기존 호환성을 위해
      localStorage.setItem('access_token', access_token); // Header.jsx 호환성을 위해
      
      // 로그인 상태 변경 이벤트 발생
      window.dispatchEvent(new Event('login-status-change'));
      
      return { success: true, data: { token: access_token, user: userResponse.data } };
    } catch (error) {
      console.error('로그인 실패:', error);
      return { success: false, error: error.response?.data?.detail || '로그인 실패' };
    }
  },

  // 사용자 정보 조회
  getMyInfo: async () => {
    try {
      const response = await api.get('/users/me');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error);
      return { success: false, error: error.response?.data?.detail || '사용자 정보 조회 실패' };
    }
  },

  // 사용자 정보 수정
  updateMyInfo: async (userData) => {
    try {
      const response = await api.put('/users/me', userData);
      
      // 업데이트된 사용자 정보를 localStorage에도 저장
      localStorage.setItem('userInfo', JSON.stringify(response.data));
      
      // 로그인 상태 변경 이벤트 발생 (헤더 업데이트를 위해)
      window.dispatchEvent(new Event('login-status-change'));
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('정보 수정 실패:', error);
      return { success: false, error: error.response?.data?.detail || '정보 수정 실패' };
    }
  },

  // 비밀번호 변경
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('비밀번호 변경 실패:', error);
      return { success: false, error: error.response?.data?.detail || '비밀번호 변경 실패' };
    }
  },

  // 관심 아티스트 목록 조회
  getFavoriteArtists: async () => {
    try {
      const response = await api.get('/users/me/favorite-artists');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('관심 아티스트 조회 실패:', error);
      return { success: false, error: error.response?.data?.detail || '관심 아티스트 조회 실패' };
    }
  }
};

// 스타일 컴포넌트들
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContainer = styled.div`
  width: 100%;
  max-width: 1100px;
  height: 700px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const MainContent = styled.div`
  display: flex;
  height: 620px;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 280px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  padding: 1.5rem 0;
  overflow-y: auto;
  flex-shrink: 0;
`;

const TabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 2rem;
  background: none;
  border: none;
  color: ${props => props.$isActive ? '#fff' : 'rgba(255,255,255,0.7)'};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  text-align: left;
  
  &:hover {
    color: white;
    background: rgba(255,255,255,0.1);
  }
  
  ${props => props.$isActive && `
    background: rgba(255,255,255,0.15);
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: white;
    }
  `}
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 2.5rem;
  background: #fafafa;
  overflow-y: auto;
  height: 620px;
`;

const ContentWrapper = styled.div`
  height: 530px;
  display: flex;
  flex-direction: column;
`;

const SectionContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  position: relative;
  height: 530px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  
  &::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 6px;
    right: 6px;
    bottom: 6px;
    background: linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%);
    border-radius: 16px;
    z-index: -1;
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 2.5rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 6px;
    right: 6px;
    bottom: 6px;
    background: linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%);
    border-radius: 16px;
    z-index: -1;
  }
`;

const ProfileAvatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2.2rem;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(102,126,234,0.3);
  border: 3px solid white;
`;

const ProfileDetails = styled.div`
  flex: 1;
`;

const ProfileName = styled.h3`
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
`;

const ProfileEmail = styled.p`
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 0.5rem;
`;

const ProfileJoinDate = styled.p`
  font-size: 1rem;
  color: #999;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  padding: 2rem 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  transition: transform 0.3s ease;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    right: 3px;
    bottom: 3px;
    background: linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%);
    border-radius: 12px;
    z-index: -1;
  }
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const StatValue = styled.h4`
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.p`
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: ${props => props.$variant === 'danger' ? 
    'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  };
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: ${props => props.$variant === 'danger' ? 'auto' : '0'};
  margin-bottom: 1rem;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px ${props => props.$variant === 'danger' ? 
      'rgba(239,68,68,0.3)' : 'rgba(102,126,234,0.3)'
    };
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const SectionTitle = styled.h4`
  font-size: 1.4rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 1rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const StatusMessage = styled.div`
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  background: ${props => props.$messageType === 'success' ? '#f0f9f0' : '#fef2f2'};
  border: 1px solid ${props => props.$messageType === 'success' ? '#22c55e' : '#ef4444'};
  color: ${props => props.$messageType === 'success' ? '#16a34a' : '#dc2626'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
`;

const LoginForm = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem 0;
`;

const LoginTitle = styled.h3`
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 2rem;
`;

const TestInfo = styled.div`
  background: #f0f9ff;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(102,126,234,0.2);
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #666;
`;

const MyPage = ({ setActiveModal }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [userInfo, setUserInfo] = useState(null);
  const [favoriteArtists, setFavoriteArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 로그인 폼 상태
  const [loginForm, setLoginForm] = useState({
    email: '222@example.com',  // 기본값
    password: '22222222'       // 기본값
  });
  
  // 수정 폼 상태
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    nickname: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: ''
  });

  const tabs = [
    { id: 'profile', name: '프로필', icon: <User size={20} /> },
    { id: 'settings', name: '설정', icon: <Settings size={20} /> }
  ];

  // 메시지 표시 함수
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // 초기화 - Login.jsx 패턴을 따라 토큰 확인
  useEffect(() => {
    // Login.jsx와 동일한 방식으로 토큰 확인
    const token = localStorage.getItem('accessToken');
    const userToken = localStorage.getItem('userToken'); // 기존 호환성
    const access_token = localStorage.getItem('access_token'); // Header 호환성
    
    if (token || userToken || access_token) {
      setIsLoggedIn(true);
      
      // 저장된 사용자 정보가 있으면 사용
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        try {
          const parsedUserInfo = JSON.parse(storedUserInfo);
          setUserInfo(parsedUserInfo);
          setEditForm({
            username: parsedUserInfo.username || '',
            email: parsedUserInfo.email || '',
            nickname: parsedUserInfo.nickname || ''
          });
        } catch (error) {
          console.error('사용자 정보 파싱 오류:', error);
        }
      }
      
      // API에서 최신 정보 가져오기
      if (token || access_token) {
        loadUserInfo();
        loadFavoriteArtists();
      }
    }
  }, []);

  // 로그인 처리 - Login.jsx와 동일한 패턴
  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      showMessage('이메일과 비밀번호를 입력하세요.', 'error');
      return;
    }

    setLoading(true);
    try {
      const loginResult = await apiService.login(loginForm.email, loginForm.password);
      if (loginResult.success) {
        setIsLoggedIn(true);
        setUserInfo(loginResult.data.user);
        setEditForm({
          username: loginResult.data.user.username || '',
          email: loginResult.data.user.email || '',
          nickname: loginResult.data.user.nickname || ''
        });
        showMessage('로그인 성공!', 'success');
        
        await loadFavoriteArtists();
      } else {
        showMessage('로그인 실패: ' + loginResult.error, 'error');
      }
    } catch (error) {
      showMessage('로그인 오류: ' + error.message, 'error');
    }
    setLoading(false);
  };

  // 사용자 정보 로드
  const loadUserInfo = async () => {
    const result = await apiService.getMyInfo();
    if (result.success) {
      setUserInfo(result.data);
      setEditForm({
        username: result.data.username || '',
        email: result.data.email || '',
        nickname: result.data.nickname || ''
      });
      
      // localStorage에도 저장 (Login.jsx 패턴)
      localStorage.setItem('userInfo', JSON.stringify(result.data));
    } else {
      showMessage('사용자 정보 로드 실패: ' + result.error, 'error');
    }
  };

  // 관심 아티스트 로드
  const loadFavoriteArtists = async () => {
    const result = await apiService.getFavoriteArtists();
    if (result.success) {
      setFavoriteArtists(result.data);
    }
  };

  // 사용자 정보 수정
  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const updateData = {};
      if (editForm.username !== userInfo.username) updateData.username = editForm.username;
      if (editForm.email !== userInfo.email) updateData.email = editForm.email;
      if (editForm.nickname !== userInfo.nickname) updateData.nickname = editForm.nickname;

      if (Object.keys(updateData).length === 0) {
        showMessage('변경된 정보가 없습니다.', 'error');
        setLoading(false);
        return;
      }

      const result = await apiService.updateMyInfo(updateData);
      if (result.success) {
        setUserInfo(result.data);
        showMessage('프로필이 성공적으로 업데이트되었습니다!', 'success');
      } else {
        showMessage('프로필 업데이트 실패: ' + result.error, 'error');
      }
    } catch (error) {
      showMessage('프로필 업데이트 오류: ' + error.message, 'error');
    }
    setLoading(false);
  };

  // 비밀번호 변경
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showMessage('현재 비밀번호와 새 비밀번호를 모두 입력하세요.', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      if (result.success) {
        showMessage('비밀번호가 성공적으로 변경되었습니다!', 'success');
        setPasswordForm({ currentPassword: '', newPassword: '' });
      } else {
        showMessage('비밀번호 변경 실패: ' + result.error, 'error');
      }
    } catch (error) {
      showMessage('비밀번호 변경 오류: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleClose = () => {
    setActiveModal(null);
  };

  // 로그아웃 처리 - Login.jsx 패턴을 반대로
  const handleLogout = () => {
    // 모든 토큰과 사용자 정보 삭제
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('userInfo');
    
    setIsLoggedIn(false);
    setUserInfo(null);
    setFavoriteArtists([]);
    
    // 로그인 상태 변경 이벤트 발생
    window.dispatchEvent(new Event('login-status-change'));
    
    showMessage('로그아웃되었습니다.', 'success');
  };

  const renderTabContent = () => {
    // 로그인 폼 표시
    if (!isLoggedIn) {
      return (
        <SectionContainer>
          <LoginForm>
            <LoginTitle>로그인</LoginTitle>
            <FormGroup>
              <Label>이메일:</Label>
              <Input 
                type="email" 
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({...prev, email: e.target.value}))}
                placeholder="이메일 입력"
              />
            </FormGroup>
            
            <FormGroup>
              <Label>비밀번호:</Label>
              <Input 
                type="password" 
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({...prev, password: e.target.value}))}
                placeholder="비밀번호 입력"
              />
            </FormGroup>
            
            <ActionButton onClick={handleLogin} disabled={loading}>
              <Mail size={18} />
              {loading ? '로그인 중...' : '로그인'}
            </ActionButton>
            
            <TestInfo>
              💡 <strong>테스트 계정 정보:</strong><br/>
              이메일: 222@example.com<br/>
              비밀번호: 22222222<br/>
              API URL: {API_BASE_URL}
            </TestInfo>
          </LoginForm>
        </SectionContainer>
      );
    }

    switch(activeTab) {
      case 'profile':
        return (
          <ContentWrapper>
            <ProfileHeader>
              <ProfileAvatar>
                <User size={48} />
              </ProfileAvatar>
              <ProfileDetails>
                <ProfileName>{userInfo?.username || '로딩 중...'}</ProfileName>
                <ProfileEmail>{userInfo?.email || '로딩 중...'}</ProfileEmail>
                <ProfileJoinDate>
                  가입일: {userInfo?.created_at ? new Date(userInfo.created_at).toLocaleDateString() : '로딩 중...'}
                </ProfileJoinDate>
              </ProfileDetails>
            </ProfileHeader>
            
            <StatsContainer>
              <StatCard>
                <StatValue>{userInfo?.id || 0}</StatValue>
                <StatLabel>사용자 ID</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{favoriteArtists.length}</StatValue>
                <StatLabel>관심 아티스트</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{userInfo?.is_active ? '활성' : '비활성'}</StatValue>
                <StatLabel>계정 상태</StatLabel>
              </StatCard>
            </StatsContainer>
            
            <ActionButton $variant="danger" onClick={handleLogout}>
              <LogOut size={16} />
              로그아웃
            </ActionButton>
          </ContentWrapper>
        );
      
      case 'settings':
        return (
          <SectionContainer>
            <SectionTitle>설정</SectionTitle>
            
            <FormGroup>
              <Label>사용자명:</Label>
              <Input 
                type="text" 
                value={editForm.username}
                onChange={(e) => setEditForm(prev => ({...prev, username: e.target.value}))}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>이메일:</Label>
              <Input 
                type="email" 
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({...prev, email: e.target.value}))}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>닉네임:</Label>
              <Input 
                type="text" 
                value={editForm.nickname}
                onChange={(e) => setEditForm(prev => ({...prev, nickname: e.target.value}))}
              />
            </FormGroup>
            
            <ActionButton onClick={handleUpdateProfile} disabled={loading}>
              <Save size={18} />
              {loading ? '저장 중...' : '프로필 저장'}
            </ActionButton>

            <hr style={{margin: '2rem 0', border: 'none', borderTop: '1px solid #e0e0e0'}} />

            <SectionTitle style={{fontSize: '1.2rem', marginBottom: '1rem'}}>비밀번호 변경</SectionTitle>
            
            <FormGroup>
              <Label>현재 비밀번호:</Label>
              <Input 
                type="password" 
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                placeholder="현재 비밀번호 입력"
              />
            </FormGroup>
            
            <FormGroup>
              <Label>새 비밀번호:</Label>
              <Input 
                type="password" 
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                placeholder="새 비밀번호 입력"
              />
            </FormGroup>
            
            <ActionButton onClick={handleChangePassword} disabled={loading}>
              <Lock size={18} />
              {loading ? '변경 중...' : '비밀번호 변경'}
            </ActionButton>
          </SectionContainer>
        );
      
      default:
        return <SectionContainer>콘텐츠를 찾을 수 없습니다.</SectionContainer>;
    }
  };

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>마이페이지</ModalTitle>
          <CloseButton onClick={handleClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        
        {message && (
          <StatusMessage $messageType={message.type}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </StatusMessage>
        )}
        
        <MainContent>
          <Sidebar>
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                $isActive={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.icon}
                {tab.name}
              </TabButton>
            ))}
          </Sidebar>
          
          <ContentArea>
            {renderTabContent()}
          </ContentArea>
        </MainContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default MyPage;