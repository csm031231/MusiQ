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

// API 설정
const API_BASE_URL = 'http://54.180.116.4:8000';

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 - 토큰 자동 추가 (임시로 주석처리)
apiClient.interceptors.request.use(
  (config) => {
    // 로그인 로직 완성 전까지 주석처리
    // const token = localStorage.getItem('accessToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 로그인 로직 완성 전까지 주석처리
    // if (error.response?.status === 401) {
    //   // 토큰이 만료되었거나 유효하지 않은 경우
    //   localStorage.removeItem('accessToken');
    //   window.location.href = '/login';
    // }
    console.log('API 에러:', error);
    return Promise.reject(error);
  }
);

const api = {
  // 내 플레이리스트 목록 조회
  getMyPlaylists: async () => {
    try {
      return await apiClient.get('/playlists/my-playlists');
    } catch (error) {
      console.error('플레이리스트 목록 조회 실패:', error);
      throw error;
    }
  },

  // 플레이리스트 생성
  createPlaylist: async (playlistData) => {
    try {
      return await apiClient.post('/playlists/', playlistData);
    } catch (error) {
      console.error('플레이리스트 생성 실패:', error);
      throw error;
    }
  },

  // 플레이리스트 삭제
  deletePlaylist: async (playlistId) => {
    try {
      return await apiClient.delete(`/playlists/${playlistId}`);
    } catch (error) {
      console.error('플레이리스트 삭제 실패:', error);
      throw error;
    }
  },

  // 좋아요한 노래 목록 조회
  getLikedSongs: async () => {
    try {
      return await apiClient.get('/playlists/liked-songs');
    } catch (error) {
      console.error('좋아요한 노래 목록 조회 실패:', error);
      throw error;
    }
  },

  // 플레이리스트 수정
  updatePlaylist: async (playlistId, playlistData) => {
    try {
      return await apiClient.put(`/playlists/${playlistId}`, playlistData);
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

const FilterTabs = styled.div`
  display: flex;
  gap: 4px;
  background: white;
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const FilterTab = styled.button`
  background: ${props => props.active ? '#667eea' : 'transparent'};
  color: ${props => props.active ? 'white' : '#6b7280'};
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
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

const PlayButton = styled.button`
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  background: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  opacity: 0;

  ${PlaylistCard}:hover & {
    opacity: 1;
  }

  &:hover {
    transform: scale(1.1);
    background: #667eea;
    color: white;
  }
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

// 모달 스타일
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
  opacity: ${props => props.show ? 1 : 0};
  visibility: ${props => props.show ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
`;

const Modal = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  transform: ${props => props.show ? 'scale(1)' : 'scale(0.9)'};
  transition: all 0.3s ease;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 20px 0;
  text-align: center;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: #667eea;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button`
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.variant === 'primary' ? `
    background: #667eea;
    color: white;
    &:hover {
      background: #5a67d8;
    }
    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  ` : `
    background: #f1f5f9;
    color: #6b7280;
    &:hover {
      background: #e2e8f0;
    }
  `}
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

// 메인 컴포넌트 - 이름을 Playlists로 변경
const Playlists = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [playlists, setPlaylists] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    title: '',
    description: '',
    is_public: true
  });
  const [error, setError] = useState(null);

  // 사이드바에서 오는 플레이리스트 생성 요청 리스닝
  useEffect(() => {
    const handleCreatePlaylistRequest = async (event) => {
      const playlistData = event.detail;
      
      try {
        const createdPlaylist = await api.createPlaylist(playlistData);
        
        // 새 플레이리스트를 목록에 추가
        const newPlaylistWithMeta = {
          ...createdPlaylist,
          tracks: 0,
          isLiked: false
        };
        
        setPlaylists(prev => [newPlaylistWithMeta, ...prev]);
        
        // 사이드바 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new Event('playlist-updated'));
        
        // 사이드바에서 생성된 경우에만 상세 페이지로 이동
        navigate(`/playlists/${createdPlaylist.id}`);
        
      } catch (error) {
        console.error('플레이리스트 생성 중 오류:', error);
        alert('플레이리스트 생성 중 오류가 발생했습니다.');
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
      try {
        setLoading(true);
        setError(null);
        
        const [playlistsData, likedSongsData] = await Promise.all([
          api.getMyPlaylists(),
          api.getLikedSongs()
        ]);
        
        setPlaylists(playlistsData);
        setLikedSongs(likedSongsData);
      } catch (error) {
        console.error('데이터 로딩 중 오류:', error);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        
        // 인증 오류가 아닌 경우에만 빈 배열로 설정 (로그인 로직 완성 전까지 항상 빈 배열로 설정)
        // if (error.response?.status !== 401) {
          setPlaylists([]);
          setLikedSongs([]);
        // }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 플레이리스트 생성
  const handleCreatePlaylist = async () => {
    if (!newPlaylist.title.trim()) {
      setError('플레이리스트 이름을 입력해주세요.');
      return;
    }

    try {
      setError(null);
      const createdPlaylist = await api.createPlaylist(newPlaylist);
      
      // 새 플레이리스트를 목록에 추가 (isLiked: false 추가)
      const newPlaylistWithMeta = {
        ...createdPlaylist,
        tracks: 0,
        isLiked: false
      };
      
      setPlaylists(prev => [newPlaylistWithMeta, ...prev]);
      setShowCreateModal(false);
      setNewPlaylist({ title: '', description: '', is_public: true });
      
      // 사이드바 업데이트를 위한 이벤트 발생
      window.dispatchEvent(new Event('playlist-updated'));
      
      // 성공 메시지 (선택사항)
      console.log('플레이리스트가 성공적으로 생성되었습니다:', createdPlaylist.title);
      
    } catch (error) {
      console.error('플레이리스트 생성 중 오류:', error);
      setError('플레이리스트 생성 중 오류가 발생했습니다.');
    }
  };

  // 플레이리스트 삭제
  const handleDeletePlaylist = async (playlistId, event) => {
    event.stopPropagation(); // 카드 클릭 이벤트 방지
    
    if (!window.confirm('이 플레이리스트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.deletePlaylist(playlistId);
      setPlaylists(prev => prev.filter(playlist => playlist.id !== playlistId));
      
      // 사이드바 업데이트를 위한 이벤트 발생
      window.dispatchEvent(new Event('playlist-updated'));
    } catch (error) {
      console.error('플레이리스트 삭제 중 오류:', error);
      alert('플레이리스트 삭제 중 오류가 발생했습니다.');
    }
  };

  // 플레이리스트 클릭 시 상세 페이지로 이동
  const handlePlaylistClick = (playlistId) => {
    navigate(`/playlists/${playlistId}`);
  };

  // 좋아요한 노래 클릭 처리
  const handleLikedSongsClick = () => {
    navigate('/liked-songs');
  };

  // 필터링된 플레이리스트
  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || 
      (activeFilter === 'public' && playlist.is_public) ||
      (activeFilter === 'private' && !playlist.is_public);
    
    return matchesSearch && matchesFilter;
  });

  // "좋아요한 노래" 가상 플레이리스트 추가
  const allPlaylists = [
    {
      id: 'liked',
      title: '좋아요한 노래',
      description: `${likedSongs.length}곡의 좋아요한 노래`,
      is_public: false,
      created_at: new Date().toISOString(),
      tracks: likedSongs.length,
      isLiked: true
    },
    ...filteredPlaylists.map(playlist => ({
      ...playlist,
      tracks: playlist.tracks || 0,
      isLiked: false
    }))
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatDuration = (tracks) => {
    const avgDuration = 210; // 평균 3분 30초
    const totalSeconds = tracks * avgDuration;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

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
        <FilterTabs>
          <FilterTab 
            active={activeFilter === 'all'} 
            onClick={() => setActiveFilter('all')}
          >
            전체
          </FilterTab>
          <FilterTab 
            active={activeFilter === 'public'} 
            onClick={() => setActiveFilter('public')}
          >
            공개
          </FilterTab>
          <FilterTab 
            active={activeFilter === 'private'} 
            onClick={() => setActiveFilter('private')}
          >
            비공개
          </FilterTab>
        </FilterTabs>
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
                  <PlayButton>
                    <Play size={16} fill="currentColor" />
                  </PlayButton>
                </PlaylistImage>
                <PlaylistInfo>
                  <PlaylistTitle>{playlist.title}</PlaylistTitle>
                  <PlaylistStats>
                    <span>{playlist.tracks}곡</span>
                    <span>•</span>
                    <span>{formatDuration(playlist.tracks)}</span>
                    {!playlist.isLiked && (
                      <>
                        <span>•</span>
                        <span>
                          {playlist.is_public ? (
                            <>
                              <Eye size={12} style={{ marginRight: '4px' }} />
                              공개
                            </>
                          ) : (
                            <>
                              <EyeOff size={12} style={{ marginRight: '4px' }} />
                              비공개
                            </>
                          )}
                        </span>
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
                    <span>•</span>
                    <span>{formatDuration(playlist.tracks)}</span>
                    {!playlist.isLiked && (
                      <>
                        <span>•</span>
                        <span>
                          {playlist.is_public ? (
                            <>
                              <Eye size={12} style={{ marginRight: '4px' }} />
                              공개
                            </>
                          ) : (
                            <>
                              <EyeOff size={12} style={{ marginRight: '4px' }} />
                              비공개
                            </>
                          )}
                        </span>
                      </>
                    )}
                  </PlaylistStats>
                </ListPlaylistInfo>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <PlayButton style={{ position: 'static', opacity: 1 }}>
                    <Play size={16} fill="currentColor" />
                  </PlayButton>
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

      {/* 플레이리스트 생성 모달 */}
      <ModalOverlay show={showCreateModal} onClick={() => setShowCreateModal(false)}>
        <Modal show={showCreateModal} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <ModalTitle>새 플레이리스트 만들기</ModalTitle>
            <button
              onClick={() => setShowCreateModal(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
          
          {error && (
            <div style={{ 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              color: '#dc2626', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: '16px', 
              fontSize: '0.875rem' 
            }}>
              {error}
            </div>
          )}
          
          <FormGroup>
            <Label>플레이리스트 이름 *</Label>
            <Input
              type="text"
              placeholder="플레이리스트 이름을 입력하세요"
              value={newPlaylist.title}
              onChange={(e) => {
                setNewPlaylist(prev => ({ ...prev, title: e.target.value }));
                setError(null);
              }}
            />
          </FormGroup>
          <FormGroup>
            <Label>설명</Label>
            <TextArea
              placeholder="플레이리스트에 대한 설명을 입력하세요 (선택사항)"
              value={newPlaylist.description}
              onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
            />
          </FormGroup>
          <CheckboxGroup>
            <Checkbox
              type="checkbox"
              id="is_public"
              checked={newPlaylist.is_public}
              onChange={(e) => setNewPlaylist(prev => ({ ...prev, is_public: e.target.checked }))}
            />
            <Label htmlFor="is_public" style={{ margin: 0 }}>
              다른 사용자에게 공개
            </Label>
          </CheckboxGroup>
          <ModalActions>
            <Button onClick={() => {
              setShowCreateModal(false);
              setError(null);
              setNewPlaylist({ title: '', description: '', is_public: true });
            }}>
              취소
            </Button>
            <Button 
              variant="primary" 
              onClick={handleCreatePlaylist}
              disabled={!newPlaylist.title.trim()}
            >
              만들기
            </Button>
          </ModalActions>
        </Modal>
      </ModalOverlay>
    </PlaylistsContainer>
  );
};

export default Playlists;