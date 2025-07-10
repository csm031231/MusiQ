import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Play, 
  Heart, 
  Plus, 
  Music, 
  Users, 
  Clock, 
  MoreHorizontal,
  Star,
  Shuffle,
  Search,
  List,
  Grid,
  Eye,
  EyeOff,
  X,
  Trash2
} from 'lucide-react';

import axios from 'axios';

// API 설정 - Login.jsx와 동일하게 통일
const API_BASE_URL = 'http://54.180.116.4:8000';

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 - 토큰 자동 추가 (Login.jsx와 동일한 키 사용)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken'); // Login.jsx와 동일한 키
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API 요청에 토큰 추가:', token.substring(0, 20) + '...');
    } else {
      console.log('토큰이 없습니다.');
    }
    return config;
  },
  (error) => {
    console.error('요청 인터셉터 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
apiClient.interceptors.response.use(
  (response) => {
    console.log('API 응답 성공:', response.status, response.config.url);
    return response.data;
  },
  (error) => {
    console.error('API 응답 에러:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      // 토큰이 만료되었거나 유효하지 않은 경우
      console.log('인증 오류 - 토큰 삭제 및 리다이렉트');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userToken');
      localStorage.removeItem('access_token');
      localStorage.removeItem('userInfo');
      
      // 로그인 상태 변경 이벤트 발생
      window.dispatchEvent(new Event('login-status-change'));
      
      // 로그인 페이지로 리다이렉트하지 않고 에러만 반환
      return Promise.reject(new Error('로그인이 필요합니다.'));
    }
    
    return Promise.reject(error);
  }
);

// 시간 포맷팅 함수 (Home.jsx와 동일)
const formatDuration = (duration) => {
  if (!duration) return 0;
  
  let totalSeconds;
  
  // 1. 밀리초인 경우 (duration_ms)
  if (duration > 10000) {
    totalSeconds = Math.floor(duration / 1000);
  }
  // 2. 이미 초 단위인 경우
  else if (typeof duration === 'number') {
    totalSeconds = duration;
  }
  // 3. 문자열 숫자인 경우
  else if (typeof duration === 'string') {
    const num = parseInt(duration);
    totalSeconds = num > 10000 ? Math.floor(num / 1000) : num;
  }
  else {
    return 0;
  }
  
  return totalSeconds;
};

// 총 재생 시간을 문자열로 변환 (Home.jsx와 동일)
const formatTotalDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
};

const api = {
  // 내 플레이리스트 목록 조회
  getMyPlaylists: async () => {
    try {
      console.log('플레이리스트 목록 조회 시작...');
      const response = await apiClient.get('/playlists/my-playlists');
      console.log('플레이리스트 목록 조회 성공:', response);
      return response;
    } catch (error) {
      console.error('플레이리스트 목록 조회 실패:', error);
      throw error;
    }
  },

  // 플레이리스트의 노래 목록 조회 (통계를 위해)
  getPlaylistSongs: async (playlistId) => {
    try {
      console.log(`플레이리스트 ${playlistId} 노래 목록 조회 시작...`);
      const response = await apiClient.get(`/playlists/${playlistId}/songs`);
      console.log(`플레이리스트 ${playlistId} 노래 목록 조회 성공:`, response);
      return response;
    } catch (error) {
      console.error(`플레이리스트 ${playlistId} 노래 목록 조회 실패:`, error);
      throw error;
    }
  },

  // 플레이리스트 생성
  createPlaylist: async (playlistData) => {
    try {
      console.log('플레이리스트 생성 시작:', playlistData);
      const response = await apiClient.post('/playlists/', playlistData);
      console.log('플레이리스트 생성 성공:', response);
      return response;
    } catch (error) {
      console.error('플레이리스트 생성 실패:', error);
      throw error;
    }
  },

  // 플레이리스트 삭제
  deletePlaylist: async (playlistId) => {
    try {
      console.log('플레이리스트 삭제 시작:', playlistId);
      const response = await apiClient.delete(`/playlists/${playlistId}`);
      console.log('플레이리스트 삭제 성공:', response);
      return response;
    } catch (error) {
      console.error('플레이리스트 삭제 실패:', error);
      throw error;
    }
  },

  // 좋아요한 노래 목록 조회 - 백엔드 라우터에 맞춰 수정
  getLikedSongs: async () => {
    try {
      console.log('좋아요한 노래 목록 조회 시작...');
      // 백엔드에서 실제 경로가 /playlists/liked-songs가 아닐 수 있으므로 확인 후 수정
      // 일단 빈 배열로 처리하고, 실제 엔드포인트 확인 후 수정
      console.log('좋아요한 노래 목록 조회 - 임시로 빈 배열 반환');
      return [];
      
      // 실제 엔드포인트가 확인되면 아래 코드 사용
      // const response = await apiClient.get('/playlists/liked-songs');
      // console.log('좋아요한 노래 목록 조회 성공:', response);
      // return response;
    } catch (error) {
      console.error('좋아요한 노래 목록 조회 실패:', error);
      // 에러가 발생해도 빈 배열로 처리하여 다른 기능에 영향 주지 않음
      return [];
    }
  },

  // 플레이리스트 수정
  updatePlaylist: async (playlistId, playlistData) => {
    try {
      console.log('플레이리스트 수정 시작:', playlistId, playlistData);
      const response = await apiClient.put(`/playlists/${playlistId}`, playlistData);
      console.log('플레이리스트 수정 성공:', response);
      return response;
    } catch (error) {
      console.error('플레이리스트 수정 실패:', error);
      throw error;
    }
  }
};

// 스타일드 컴포넌트들
const PlaylistsContainer = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f8fafc;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 20px 0;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PageSubtitle = styled.p`
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
  font-weight: 400;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const CreateButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
`;

const ViewToggle = styled.div`
  display: flex;
  background: white;
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ViewButton = styled.button`
  background: ${props => props.active ? '#667eea' : 'transparent'};
  color: ${props => props.active ? 'white' : '#6b7280'};
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FilterSection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  align-items: center;
`;

const SearchBox = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  width: 16px;
  height: 16px;
`;

const PlaylistsGrid = styled.div`
  display: ${props => props.viewMode === 'grid' ? 'grid' : 'flex'};
  ${props => props.viewMode === 'grid' 
    ? `
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    `
    : `
      flex-direction: column;
      gap: 16px;
    `
  }
`;

const PlaylistCard = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #f1f5f9;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.isLiked ? '#ef4444' : '#667eea'};
    opacity: 0.8;
  }
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
  z-index: 10;

  ${PlaylistCard}:hover & {
    opacity: ${props => props.isLiked ? 0 : 1};
  }

  &:hover {
    background: rgba(220, 38, 38, 1);
    transform: scale(1.1);
  }
`;

const PlaylistImage = styled.div`
  width: 100%;
  padding-top: 75%;
  background: linear-gradient(135deg, 
    ${props => props.isLiked ? '#fef2f2' : '#f0f4ff'} 0%, 
    ${props => props.isLiked ? '#fee2e2' : '#e0e7ff'} 100%
  );
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => props.isLiked 
      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))'
      : 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(102, 126, 234, 0.05))'
    };
  }
`;

const PlaylistIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: ${props => props.isLiked ? '#ef4444' : '#667eea'};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0.8;
`;

const PlaylistInfo = styled.div`
  padding: 20px;
`;

const PlaylistTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  line-height: 1.4;
`;

const PlaylistStats = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 12px;
`;

const PlaylistDescription = styled.p`
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ListViewCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid #f1f5f9;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }
`;

const ListPlaylistImage = styled.div`
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, 
    ${props => props.isLiked ? '#fef2f2' : '#f0f4ff'} 0%, 
    ${props => props.isLiked ? '#fee2e2' : '#e0e7ff'} 100%
  );
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
`;

const ListPlaylistInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  background: #f1f5f9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: #9ca3af;
`;

const EmptyTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
`;

const EmptyDescription = styled.p`
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 24px 0;
`;

// 사이드바와 동일한 모달 스타일
const FullscreenModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: ${props => props.$show ? 'modalFadeIn 0.3s ease' : 'none'};

  @keyframes modalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const FullscreenModalContent = styled.div`
  background: white;
  color: #1a1a1a;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #f1f5f9;
  animation: ${props => props.$show ? 'modalSlideUp 0.3s ease' : 'none'};

  @keyframes modalSlideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const FullscreenModalHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 24px 24px 20px;
  border-bottom: 1px solid #f1f5f9;
  position: relative;
`;

const FullscreenModalCloseBtn = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-right: 16px;

  &:hover {
    background-color: #f1f5f9;
    color: #374151;
  }
`;

const FullscreenModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const FullscreenModalBody = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f8fafc;
`;

const PlaylistForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FormLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`;

const FormInput = styled.input`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 0.875rem;
  color: #1a1a1a;
  font-family: inherit;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const FormTextArea = styled.textarea`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 0.875rem;
  color: #1a1a1a;
  font-family: inherit;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  resize: vertical;
  min-height: 100px;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const FullscreenModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px 24px;
  background: white;
  border-top: 1px solid #f1f5f9;
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 100px;
  background: #f1f5f9;
  color: #6b7280;

  &:hover {
    background: #e2e8f0;
    color: #374151;
    transform: translateY(-1px);
  }
`;

const CreateButtonModal = styled.button`
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 100px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

// 스피너 스타일 컴포넌트
const SpinnerContainer = styled.div`
  text-align: center;
  padding: 60px 0;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: #6b7280;
`;

// 에러 상태 컴포넌트
const ErrorState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #dc2626;
`;

const ErrorIcon = styled.div`
  width: 80px;
  height: 80px;
  background: #fef2f2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: #dc2626;
`;

const ErrorTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 8px 0;
`;

const ErrorDescription = styled.p`
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 24px 0;
`;

// 로그인 필요 상태 컴포넌트
const LoginRequiredState = styled.div`
  text-align: center;
  padding: 60px 20px;
`;

const LoginIcon = styled.div`
  width: 80px;
  height: 80px;
  background: #f0f4ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: #667eea;
`;

// 메인 컴포넌트
const Playlists = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [playlists, setPlaylists] = useState([]);
  const [playlistStats, setPlaylistStats] = useState({}); // 플레이리스트 통계 정보
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    title: '',
    description: ''
  });
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 각 플레이리스트의 통계 정보 로드 (Home.jsx와 동일)
  const loadPlaylistStats = async (playlistId) => {
    try {
      const songs = await api.getPlaylistSongs(playlistId);
      
      const songCount = songs.length;
      const totalDurationSeconds = songs.reduce((total, song) => {
        const duration = song.duration_ms || song.duration || song.length || 0;
        return total + formatDuration(duration);
      }, 0);
      
      return {
        songCount,
        totalDuration: totalDurationSeconds > 0 ? formatTotalDuration(totalDurationSeconds) : '0분'
      };
    } catch (error) {
      console.error(`플레이리스트 ${playlistId} 통계 로드 실패:`, error);
      return {
        songCount: 0,
        totalDuration: '0분'
      };
    }
  };

  // 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('accessToken');
      setIsLoggedIn(!!token);
      console.log('로그인 상태 확인:', !!token);
    };

    checkLoginStatus();

    // 로그인 상태 변경 이벤트 리스닝
    const handleLoginStatusChange = () => {
      checkLoginStatus();
    };

    window.addEventListener('login-status-change', handleLoginStatusChange);

    return () => {
      window.removeEventListener('login-status-change', handleLoginStatusChange);
    };
  }, []);

  // 사이드바에서 오는 플레이리스트 생성 요청 리스닝
  useEffect(() => {
    const handleCreatePlaylistRequest = async (event) => {
      const playlistData = event.detail;
      console.log('사이드바에서 플레이리스트 생성 요청:', playlistData);
      
      // 사이드바에서 온 요청이면 모달을 띄우지 않고 바로 API 호출
      if (playlistData && playlistData.title) {
        try {
          const createdPlaylist = await api.createPlaylist(playlistData);
          console.log('사이드바 요청으로 플레이리스트 생성 성공:', createdPlaylist);
          
          // 새 플레이리스트를 목록에 추가
          const newPlaylistWithMeta = {
            ...createdPlaylist,
            tracks: 0,
            isLiked: false
          };
          
          setPlaylists(prev => [newPlaylistWithMeta, ...prev]);
          
          // 사이드바 업데이트를 위한 이벤트 발생
          window.dispatchEvent(new Event('playlist-updated'));
          
          // 사이드바에서 생성된 경우에만 플레이리스트 목록 페이지로 이동
          navigate('/playlists');
          
        } catch (error) {
          console.error('사이드바 요청 플레이리스트 생성 중 오류:', error);
          
          if (error.message === '로그인이 필요합니다.') {
            alert('로그인이 필요합니다.');
          } else {
            alert('플레이리스트 생성 중 오류가 발생했습니다.');
          }
        }
      }
    };

    // 사이드바에서 오는 생성 요청 이벤트 리스닝
    window.addEventListener('create-playlist-request', handleCreatePlaylistRequest);

    return () => {
      window.removeEventListener('create-playlist-request', handleCreatePlaylistRequest);
    };
  }, [navigate]);

  // 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      if (!isLoggedIn) {
        setLoading(false);
        setPlaylists([]);
        setPlaylistStats({});
        setLikedSongs([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('데이터 로딩 시작...');
        
        // 플레이리스트와 좋아요한 노래를 병렬로 로드하되, 좋아요한 노래 실패 시에도 플레이리스트는 로드
        const playlistsPromise = api.getMyPlaylists();
        const likedSongsPromise = api.getLikedSongs();
        
        const [playlistsData, likedSongsData] = await Promise.allSettled([
          playlistsPromise,
          likedSongsPromise
        ]);
        
        // 플레이리스트 결과 처리
        if (playlistsData.status === 'fulfilled') {
          console.log('플레이리스트 데이터 로딩 성공:', playlistsData.value);
          const playlistsArray = playlistsData.value || [];
          setPlaylists(playlistsArray);
          
          // 각 플레이리스트의 통계 정보 로드
          if (playlistsArray.length > 0) {
            const statsPromises = playlistsArray.map(async (playlist) => {
              const stats = await loadPlaylistStats(playlist.id);
              return { id: playlist.id, ...stats };
            });
            
            const statsResults = await Promise.all(statsPromises);
            const statsMap = {};
            statsResults.forEach(stat => {
              statsMap[stat.id] = {
                songCount: stat.songCount,
                totalDuration: stat.totalDuration
              };
            });
            
            setPlaylistStats(statsMap);
          }
        } else {
          console.error('플레이리스트 데이터 로딩 실패:', playlistsData.reason);
          setPlaylists([]);
          setPlaylistStats({});
        }
        
        // 좋아요한 노래 결과 처리
        if (likedSongsData.status === 'fulfilled') {
          console.log('좋아요한 노래 데이터 로딩 성공:', likedSongsData.value);
          setLikedSongs(likedSongsData.value || []);
        } else {
          console.error('좋아요한 노래 데이터 로딩 실패:', likedSongsData.reason);
          setLikedSongs([]);
        }
        
        console.log('데이터 로딩 완료');
      } catch (error) {
        console.error('데이터 로딩 중 오류:', error);
        
        if (error.message === '로그인이 필요합니다.') {
          setError('로그인이 필요합니다.');
          setIsLoggedIn(false);
        } else {
          setError('데이터를 불러오는 중 오류가 발생했습니다.');
        }
        
        setPlaylists([]);
        setPlaylistStats({});
        setLikedSongs([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isLoggedIn]);

  // 플레이리스트 생성
  const handleCreatePlaylist = async () => {
    if (!newPlaylist.title.trim()) {
      setError('플레이리스트 이름을 입력해주세요.');
      return;
    }

    if (!isLoggedIn) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      setError(null);
      console.log('플레이리스트 생성 시도:', newPlaylist);
      
      const createdPlaylist = await api.createPlaylist(newPlaylist);
      console.log('플레이리스트 생성 성공:', createdPlaylist);
      
      // 새 플레이리스트를 목록에 추가 (isLiked: false 추가)
      const newPlaylistWithMeta = {
        ...createdPlaylist,
        tracks: 0,
        isLiked: false
      };
      
      setPlaylists(prev => [newPlaylistWithMeta, ...prev]);
      setShowCreateModal(false);
      setNewPlaylist({ title: '', description: '' });
      
      // 사이드바 업데이트를 위한 이벤트 발생
      window.dispatchEvent(new Event('playlist-updated'));
      
      // 성공 메시지
      console.log('플레이리스트가 성공적으로 생성되었습니다:', createdPlaylist.title);
      
    } catch (error) {
      console.error('플레이리스트 생성 중 오류:', error);
      
      if (error.message === '로그인이 필요합니다.') {
        setError('로그인이 필요합니다.');
        setIsLoggedIn(false);
      } else {
        setError('플레이리스트 생성 중 오류가 발생했습니다.');
      }
    }
  };

  // 플레이리스트 삭제
  const handleDeletePlaylist = async (playlistId, event) => {
    event.stopPropagation(); // 카드 클릭 이벤트 방지
    
    if (!window.confirm('이 플레이리스트를 삭제하시겠습니까?')) {
      return;
    }

    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      console.log('플레이리스트 삭제 시도:', playlistId);
      await api.deletePlaylist(playlistId);
      console.log('플레이리스트 삭제 성공:', playlistId);
      
      setPlaylists(prev => prev.filter(playlist => playlist.id !== playlistId));
      
      // 사이드바 업데이트를 위한 이벤트 발생
      window.dispatchEvent(new Event('playlist-updated'));
    } catch (error) {
      console.error('플레이리스트 삭제 중 오류:', error);
      
      if (error.message === '로그인이 필요합니다.') {
        alert('로그인이 필요합니다.');
        setIsLoggedIn(false);
      } else {
        alert('플레이리스트 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 플레이리스트 클릭 시 세부 페이지로 이동 (수정됨)
  const handlePlaylistClick = (playlistId) => {
    console.log('플레이리스트 클릭:', playlistId);
    navigate(`/playlists/${playlistId}`);
  };

  // 좋아요한 노래 클릭 처리
  const handleLikedSongsClick = () => {
    navigate('/liked-songs');
  };

  // 필터링된 플레이리스트 (공개/비공개 필터 제거)
  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // "좋아요한 노래" 가상 플레이리스트 추가 (로그인 상태일 때만)
  const allPlaylists = isLoggedIn ? [
    {
      id: 'liked',
      title: '좋아요한 노래',
      description: `${likedSongs.length}곡의 좋아요한 노래`,
      created_at: new Date().toISOString(),
      tracks: likedSongs.length,
      isLiked: true
    },
    ...filteredPlaylists.map(playlist => {
      const stats = playlistStats[playlist.id] || { songCount: 0, totalDuration: '0분' };
      return {
        ...playlist,
        tracks: stats.songCount,
        totalDuration: stats.totalDuration,
        isLiked: false
      };
    })
  ] : [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  // formatDuration 함수를 삭제하고 실제 통계 데이터 사용

  if (loading) {
    return (
      <PlaylistsContainer>
        <SpinnerContainer>
          <Spinner />
          <LoadingText>로딩 중...</LoadingText>
        </SpinnerContainer>
      </PlaylistsContainer>
    );
  }

  // 로그인이 필요한 경우
  if (!isLoggedIn) {
    return (
      <PlaylistsContainer>
        <LoginRequiredState>
          <LoginIcon>
            <Users size={40} />
          </LoginIcon>
          <EmptyTitle>로그인이 필요합니다</EmptyTitle>
          <EmptyDescription>
            플레이리스트를 보려면 먼저 로그인해주세요
          </EmptyDescription>
        </LoginRequiredState>
      </PlaylistsContainer>
    );
  }

  // 에러가 있는 경우
  if (error) {
    return (
      <PlaylistsContainer>
        <ErrorState>
          <ErrorIcon>
            <X size={40} />
          </ErrorIcon>
          <ErrorTitle>오류 발생</ErrorTitle>
          <ErrorDescription>{error}</ErrorDescription>
          <CreateButton onClick={() => window.location.reload()}>
            다시 시도
          </CreateButton>
        </ErrorState>
      </PlaylistsContainer>
    );
  }

  return (
    <PlaylistsContainer>
      <HeaderSection>
        <TitleGroup>
          <div>
            <PageTitle>내 플레이리스트</PageTitle>
            <PageSubtitle>나만의 음악 컬렉션을 만들어보세요</PageSubtitle>
          </div>
        </TitleGroup>
        <ActionButtons>
          <ViewToggle>
            <ViewButton 
              active={viewMode === 'grid'} 
              onClick={() => setViewMode('grid')}
            >
              <Grid size={16} />
              그리드
            </ViewButton>
            <ViewButton 
              active={viewMode === 'list'} 
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
              리스트
            </ViewButton>
          </ViewToggle>
          <CreateButton onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            플레이리스트 만들기
          </CreateButton>
        </ActionButtons>
      </HeaderSection>

      <FilterSection>
        <SearchBox>
          <SearchIcon />
          <SearchInput
            placeholder="플레이리스트 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBox>
      </FilterSection>

      {allPlaylists.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <Music size={40} />
          </EmptyIcon>
          <EmptyTitle>플레이리스트가 없습니다</EmptyTitle>
          <EmptyDescription>
            첫 번째 플레이리스트를 만들어 좋아하는 음악을 저장해보세요
          </EmptyDescription>
          <CreateButton onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            첫 플레이리스트 만들기
          </CreateButton>
        </EmptyState>
      ) : (
        <PlaylistsGrid viewMode={viewMode}>
          {allPlaylists.map(playlist => 
            viewMode === 'grid' ? (
              <PlaylistCard 
                key={playlist.id} 
                isLiked={playlist.isLiked}
                onClick={() => playlist.isLiked ? handleLikedSongsClick() : handlePlaylistClick(playlist.id)}
              >
                {!playlist.isLiked && (
                  <DeleteButton 
                    isLiked={playlist.isLiked}
                    onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                  >
                    <Trash2 size={16} />
                  </DeleteButton>
                )}
                
                <PlaylistImage isLiked={playlist.isLiked}>
                  <PlaylistIcon isLiked={playlist.isLiked}>
                    {playlist.isLiked ? <Heart size={24} /> : <Music size={24} />}
                  </PlaylistIcon>
                </PlaylistImage>
                <PlaylistInfo>
                  <PlaylistTitle>{playlist.title}</PlaylistTitle>
                  <PlaylistStats>
                    <span>{playlist.tracks}곡</span>
                    {playlist.tracks > 0 && playlist.totalDuration && (
                      <>
                        <span>•</span>
                        <span>{playlist.totalDuration}</span>
                      </>
                    )}
                  </PlaylistStats>
                  <PlaylistDescription>
                    {playlist.description || `${formatDate(playlist.created_at)}에 생성됨`}
                  </PlaylistDescription>
                </PlaylistInfo>
              </PlaylistCard>
            ) : (
              <ListViewCard 
                key={playlist.id}
                onClick={() => playlist.isLiked ? handleLikedSongsClick() : handlePlaylistClick(playlist.id)}
              >
                <ListPlaylistImage isLiked={playlist.isLiked}>
                  <PlaylistIcon isLiked={playlist.isLiked}>
                    {playlist.isLiked ? <Heart size={20} /> : <Music size={20} />}
                  </PlaylistIcon>
                </ListPlaylistImage>
                <ListPlaylistInfo>
                  <PlaylistTitle>{playlist.title}</PlaylistTitle>
                  <PlaylistStats>
                    <span>{playlist.tracks}곡</span>
                    {playlist.tracks > 0 && playlist.totalDuration && (
                      <>
                        <span>•</span>
                        <span>{playlist.totalDuration}</span>
                      </>
                    )}
                  </PlaylistStats>
                </ListPlaylistInfo>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!playlist.isLiked && (
                    <DeleteButton 
                      isLiked={playlist.isLiked}
                      onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                      style={{ position: 'static', opacity: 1 }}
                    >
                      <Trash2 size={16} />
                    </DeleteButton>
                  )}
                </div>
              </ListViewCard>
            )
          )}
        </PlaylistsGrid>
      )}

      {/* 플레이리스트 생성 모달 - 사이드바와 동일한 전체화면 스타일 */}
      {showCreateModal && (
        <FullscreenModalOverlay 
          $show={showCreateModal} 
          onClick={(e) => {
            e.stopPropagation();
            setShowCreateModal(false);
            setError(null);
            setNewPlaylist({ title: '', description: '' });
          }}
        >
          <FullscreenModalContent 
            $show={showCreateModal} 
            onClick={(e) => e.stopPropagation()}
          >
            <FullscreenModalHeader>
              <FullscreenModalCloseBtn 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(false);
                  setError(null);
                  setNewPlaylist({ title: '', description: '' });
                }}
              >
                <X size={24} />
              </FullscreenModalCloseBtn>
              <FullscreenModalTitle>새 재생목록</FullscreenModalTitle>
            </FullscreenModalHeader>
            
            <FullscreenModalBody>
              {error && (
                <div style={{ 
                  background: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  color: '#dc2626', 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  marginBottom: '1.5rem', 
                  fontSize: '0.875rem' 
                }}>
                  {error}
                </div>
              )}
              
              <PlaylistForm>
                <FormField>
                  <FormLabel htmlFor="playlist-title">제목</FormLabel>
                  <FormInput
                    id="playlist-title"
                    type="text"
                    placeholder="재생목록의 제목을 입력하세요"
                    value={newPlaylist.title}
                    onChange={(e) => {
                      setNewPlaylist(prev => ({ ...prev, title: e.target.value }));
                      setError(null);
                    }}
                  />
                </FormField>
                
                <FormField>
                  <FormLabel htmlFor="playlist-description">설명</FormLabel>
                  <FormTextArea
                    id="playlist-description"
                    placeholder="재생목록에 대해 설명해 주세요"
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                  />
                </FormField>
              </PlaylistForm>
            </FullscreenModalBody>
            
            <FullscreenModalFooter>
              <CancelButton 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(false);
                  setError(null);
                  setNewPlaylist({ title: '', description: '' });
                }}
              >
                취소
              </CancelButton>
              <CreateButtonModal
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreatePlaylist();
                }}
                disabled={!newPlaylist.title.trim()}
              >
                만들기
              </CreateButtonModal>
            </FullscreenModalFooter>
          </FullscreenModalContent>
        </FullscreenModalOverlay>
      )}
    </PlaylistsContainer>
  );
};

export default Playlists;