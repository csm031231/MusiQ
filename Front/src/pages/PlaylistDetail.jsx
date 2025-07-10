// src/pages/PlaylistDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Play, 
  Heart, 
  MoreHorizontal, 
  Plus,
  Music,
  Clock,
  Calendar,
  Users,
  Edit3,
  Trash2,
  ArrowLeft,
  Shuffle,
  X,
  Check,
  Album // 앨범 그룹 아이콘 추가
} from 'lucide-react';
import axios from 'axios';

// Styled Components
const PageContainer = styled.div`
  padding: 0;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 400px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    z-index: -1;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  color: white;
  padding: 40px;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorContainer = styled(LoadingContainer)``;

const Header = styled.div`
  padding: 40px;
  color: white;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  margin-bottom: 24px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateX(-2px);
  }
`;

const PlaylistInfo = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
`;

const PlaylistCover = styled.div`
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;

  @media (max-width: 1024px) {
    width: 150px;
    height: 150px;
  }

  @media (max-width: 768px) {
    width: 120px;
    height: 120px;
  }
`;

const PlaylistIcon = styled.div`
  color: rgba(255, 255, 255, 0.8);
`;

const PlaylistMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlaylistType = styled.span`
  font-size: 0.875rem;
  text-transform: uppercase;
  font-weight: 600;
  opacity: 0.8;
  margin-bottom: 8px;
  display: block;
`;

const PlaylistTitle = styled.h1`
  font-size: 3rem;
  font-weight: 900;
  margin: 0 0 16px 0;
  line-height: 1.1;
  word-break: break-word;

  @media (max-width: 1024px) {
    font-size: 2.5rem;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const PlaylistDescription = styled.p`
  font-size: 1rem;
  opacity: 0.9;
  margin: 0 0 16px 0;
  line-height: 1.5;
`;

const PlaylistStats = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  opacity: 0.8;
`;

// 편집 폼 스타일
const EditForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EditTitleInput = styled.input`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 2rem;
  font-weight: 700;
  backdrop-filter: blur(10px);

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
  }
`;

const EditDescriptionInput = styled.textarea`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 1rem;
  backdrop-filter: blur(10px);
  resize: vertical;
  font-family: inherit;

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
  }
`;

const EditActions = styled.div`
  display: flex;
  gap: 12px;
`;

const SaveButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #667eea;
  border: none;

  &:hover {
    background: white;
    transform: translateY(-1px);
  }
`;

const CancelButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const PlaylistActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const ActionButton = styled.button`
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;

  &.primary {
    background: white;
    color: #667eea;

    &:hover {
      background: #f8f9fa;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    &.danger {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);

      &:hover {
        background: rgba(239, 68, 68, 0.3);
      }
    }
  }
`;

const SongsSection = styled.div`
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  margin-top: -16px;
  padding: 32px;
  min-height: 60vh;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const EmptyPlaylist = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;

  svg {
    margin-bottom: 24px;
    color: #d1d5db;
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 1rem;
    margin: 0;
  }
`;

const SongsHeader = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 200px 80px 80px;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.025em;

  @media (max-width: 1024px) {
    grid-template-columns: 40px 1fr 80px 60px;
    
    .song-album {
      display: none;
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 40px 1fr 60px;
    
    .song-duration {
      display: none;
    }
  }
`;

const SongsList = styled.div`
  display: flex;
  flex-direction: column;
`;

const SongItem = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 200px 80px 80px;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  align-items: center;

  &:hover {
    background: #f9fafb;

    .track-number {
      opacity: 0;
    }

    .play-button {
      opacity: 1;
    }

    .song-actions {
      opacity: 1;
    }
  }

  @media (max-width: 1024px) {
    grid-template-columns: 40px 1fr 80px 60px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 40px 1fr 60px;
  }
`;

const SongNumber = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TrackNumber = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  transition: opacity 0.2s ease;
`;

const PlayButton = styled.button`
  position: absolute;
  background: none;
  border: none;
  color: #374151;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #667eea;
    background: #f3f4f6;
  }
`;

const SongInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const SongDetails = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const SongName = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SongArtist = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SongAlbum = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const SongDuration = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const SongActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  justify-content: center;
  min-width: 80px;
`;

const ActionBtn = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #374151;
    background: #f3f4f6;
  }

  &.liked {
    color: #ef4444;

    &:hover {
      background: #fef2f2;
    }
  }
`;

// 앨범 그룹 관련 스타일 추가
const AlbumGroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin: 8px 0;
  border-left: 4px solid #667eea;
`;

const AlbumGroupTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #374151;
`;

const AlbumGroupActions = styled.div`
  display: flex;
  gap: 8px;
`;

const AlbumGroupButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #374151;
    background: #f3f4f6;
  }

  &.danger:hover {
    color: #ef4444;
    background: #fef2f2;
  }
`;

// 플레이리스트 모달 스타일
const PlaylistModalOverlay = styled.div`
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
`;

const PlaylistModal = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
`;

const PlaylistModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1a1a;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #6b7280;
  transition: all 0.2s ease;

  &:hover {
    background: #e5e7eb;
    color: #374151;
  }
`;

const PlaylistModalContent = styled.div`
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
`;

const SelectedSongInfo = styled.div`
  background: #f0f4ff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  border-left: 4px solid #667eea;

  strong {
    display: block;
    color: #1a1a1a;
    font-weight: 600;
    margin-bottom: 4px;
  }

  span {
    color: #6b7280;
    font-size: 0.875rem;
  }
`;

const CreatePlaylistButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;

  &:hover {
    background: #5a67d8;
  }
`;

const CreatePlaylistForm = styled.div`
  margin-bottom: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;

  input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    margin-bottom: 12px;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 8px;

  button {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;

    &:first-child {
      background: #667eea;
      color: white;

      &:hover:not(:disabled) {
        background: #5a67d8;
      }

      &:disabled {
        background: #d1d5db;
        cursor: not-allowed;
      }
    }

    &:last-child {
      background: #f3f4f6;
      color: #6b7280;

      &:hover {
        background: #e5e7eb;
      }
    }
  }
`;

const PlaylistsList = styled.div`
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
`;

const NoPlaylists = styled.p`
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  padding: 20px;
`;

const PlaylistItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:hover {
    background: #f0f4ff;
    border-color: #667eea;
  }

  span {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 500;
  }
`;

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 상태 관리
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 편집 모드 상태
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: ''
  });
  
  // 플레이리스트 모달 상태
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // API 클라이언트 설정
  const apiClient = axios.create({
    baseURL: 'http://54.180.116.4:8000',
    headers: { 'Content-Type': 'application/json' }
  });

  // 토큰 추가 인터셉터
  apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // 로그인 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(!!token);
  }, []);

  // 플레이리스트 데이터 로드
  useEffect(() => {
    if (id && isLoggedIn) {
      loadPlaylistData();
    }
  }, [id, isLoggedIn]);

  // 플레이리스트 정보 및 노래 목록 로드
  const loadPlaylistData = async () => {
    try {
      setLoading(true);
      setError('');

      // 플레이리스트 정보 조회
      const playlistResponse = await apiClient.get(`/playlists/${id}`);
      setPlaylist(playlistResponse.data || playlistResponse);
      
      // 편집 데이터 초기화
      const playlistData = playlistResponse.data || playlistResponse;
      setEditData({
        title: playlistData.title || '',
        description: playlistData.description || ''
      });

      // 플레이리스트의 노래 목록 조회
      const songsResponse = await apiClient.get(`/playlists/${id}/songs`);
      setSongs(songsResponse.data || songsResponse);

    } catch (error) {
      console.error('플레이리스트 데이터 로드 실패:', error);
      
      if (error.response?.status === 404) {
        setError('플레이리스트를 찾을 수 없습니다.');
      } else if (error.response?.status === 401) {
        setError('로그인이 필요합니다.');
        setIsLoggedIn(false);
      } else {
        setError('플레이리스트를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 앨범 그룹 삭제 함수 추가
  const handleRemoveAlbumGroup = async (groupId, groupName) => {
    if (!window.confirm(`앨범 "${groupName}"의 모든 곡을 플레이리스트에서 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/playlists/${id}/album-group/${groupId}`);
      console.log('앨범 그룹 삭제 성공:', response);
      
      if (response.success) {
        alert(response.message || `앨범 "${groupName}"이 삭제되었습니다.`);
        // 노래 목록 새로고침
        await loadPlaylistData();
      }
      
    } catch (error) {
      console.error('앨범 그룹 삭제 실패:', error);
      alert('앨범 그룹 삭제 중 오류가 발생했습니다.');
    }
  };

  // 노래 재생 (Last.fm URL로 이동)
  const handlePlaySong = (song) => {
    console.log('Song data:', song);
    
    if (song.url) {
      window.open(song.url, '_blank');
    } else if (song.title && song.artist?.name) {
      const artist = encodeURIComponent(song.artist.name.replace(/ /g, '+'));
      const track = encodeURIComponent(song.title.replace(/ /g, '+'));
      const lastfmUrl = `https://www.last.fm/music/${artist}/_/${track}`;
      window.open(lastfmUrl, '_blank');
    } else if (song.preview_url) {
      window.open(song.preview_url, '_blank');
    } else {
      const searchQuery = `${song.title} ${song.artist?.name}`;
      const lastfmSearchUrl = `https://www.last.fm/search?q=${encodeURIComponent(searchQuery)}`;
      window.open(lastfmSearchUrl, '_blank');
    }
  };

  // 좋아요 토글
  const handleLikeToggle = async (songId) => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      await apiClient.post(`/playlists/like-song/${songId}`);
      
      // 노래 목록에서 좋아요 상태 업데이트
      setSongs(prev => {
        if (prev.album_groups) {
          return {
            ...prev,
            album_groups: prev.album_groups.map(group => ({
              ...group,
              songs: group.songs.map(song => 
                song.id === songId 
                  ? { ...song, is_liked: !song.is_liked }
                  : song
              )
            })),
            individual_songs: prev.individual_songs?.map(song => 
              song.id === songId 
                ? { ...song, is_liked: !song.is_liked }
                : song
            ) || [],
            all_songs: prev.all_songs?.map(song => 
              song.id === songId 
                ? { ...song, is_liked: !song.is_liked }
                : song
            ) || []
          };
        } else if (Array.isArray(prev)) {
          return prev.map(song => 
            song.id === songId 
              ? { ...song, is_liked: !song.is_liked }
              : song
          );
        } else if (prev.all_songs) {
          return {
            ...prev,
            all_songs: prev.all_songs.map(song => 
              song.id === songId 
                ? { ...song, is_liked: !song.is_liked }
                : song
            )
          };
        }
        return prev;
      });
      
    } catch (error) {
      console.error('좋아요 토글 실패:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 플레이리스트에서 노래 삭제
  const handleRemoveSong = async (songId) => {
    if (!window.confirm('이 노래를 플레이리스트에서 삭제하시겠습니까?')) {
      return;
    }

    try {
      await apiClient.delete(`/playlists/${id}/songs/${songId}`);
      
      // 노래 목록에서 해당 노래 제거
      setSongs(prev => {
        if (prev.album_groups) {
          return {
            ...prev,
            album_groups: prev.album_groups.map(group => ({
              ...group,
              songs: group.songs.filter(song => song.id !== songId),
              total_songs: group.songs.filter(song => song.id !== songId).length
            })).filter(group => group.songs.length > 0),
            individual_songs: prev.individual_songs?.filter(song => song.id !== songId) || [],
            all_songs: prev.all_songs?.filter(song => song.id !== songId) || []
          };
        } else if (Array.isArray(prev)) {
          return prev.filter(song => song.id !== songId);
        } else if (prev.all_songs) {
          return {
            ...prev,
            all_songs: prev.all_songs.filter(song => song.id !== songId)
          };
        }
        return prev;
      });
      
      alert('노래가 삭제되었습니다.');
    } catch (error) {
      console.error('노래 삭제 실패:', error);
      alert('노래 삭제 중 오류가 발생했습니다.');
    }
  };

  // 플레이리스트 정보 수정
  const handleUpdatePlaylist = async () => {
    if (!editData.title.trim()) {
      alert('플레이리스트 제목을 입력해주세요.');
      return;
    }

    try {
      const updateData = {
        title: editData.title.trim(),
        description: editData.description.trim()
      };

      const response = await apiClient.put(`/playlists/${id}`, updateData);
      setPlaylist(response.data || response);
      setEditMode(false);
      
      window.dispatchEvent(new Event('playlist-updated'));
      alert('플레이리스트가 수정되었습니다.');
    } catch (error) {
      console.error('플레이리스트 수정 실패:', error);
      alert('플레이리스트 수정 중 오류가 발생했습니다.');
    }
  };

  // 플레이리스트 삭제
  const handleDeletePlaylist = async () => {
    if (!window.confirm(`"${playlist.title}" 플레이리스트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await apiClient.delete(`/playlists/${id}`);
      window.dispatchEvent(new Event('playlist-updated'));
      alert('플레이리스트가 삭제되었습니다.');
      navigate('/playlists');
    } catch (error) {
      alert('플레이리스트 삭제 중 오류가 발생했습니다.');
    }
  };

  // 플레이리스트 모달 열기
  const handleAddToPlaylist = (song) => {
    setSelectedSong(song);
    setShowPlaylistModal(true);
    fetchPlaylists();
  };

  // 플레이리스트 목록 가져오기
  const fetchPlaylists = async () => {
    try {
      const response = await apiClient.get('/playlists/my-playlists');
      setPlaylists(response.data || response);
    } catch (error) {
      console.error('플레이리스트 목록 조회 실패:', error);
      setPlaylists([]);
    }
  };

  // 새 플레이리스트 생성
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const response = await apiClient.post('/playlists/', {
        title: newPlaylistName.trim(),
        description: `${selectedSong?.title}에서 생성됨`
      });
      
      setNewPlaylistName('');
      setShowCreateForm(false);
      await fetchPlaylists();
      
      if (response.data?.id) {
        await addSongToPlaylist(response.data.id);
      }
    } catch (error) {
      console.error('플레이리스트 생성 실패:', error);
      alert('플레이리스트 생성 중 오류가 발생했습니다.');
    }
  };

  // 플레이리스트에 노래 추가
  const addSongToPlaylist = async (playlistId) => {
    if (!selectedSong?.id) {
      alert('노래 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      await apiClient.post(`/playlists/${playlistId}/songs`, {
        song_id: selectedSong.id
      });
      
      alert('플레이리스트에 추가되었습니다!');
      setShowPlaylistModal(false);
    } catch (error) {
      console.error('노래 추가 실패:', error);
      if (error.response?.data?.message?.includes('already in playlist')) {
        alert('이미 플레이리스트에 있는 노래입니다.');
      } else {
        alert('플레이리스트에 추가하는 중 오류가 발생했습니다.');
      }
    }
  };

  // 시간 포맷팅
  const formatDuration = (duration) => {
    if (!duration) return '0:00';
    
    let totalSeconds;
    if (duration > 10000) {
      totalSeconds = Math.floor(duration / 1000);
    } else if (typeof duration === 'number') {
      totalSeconds = duration;
    } else if (typeof duration === 'string' && duration.includes(':')) {
      return duration;
    } else if (typeof duration === 'string') {
      const num = parseInt(duration);
      totalSeconds = num > 10000 ? Math.floor(num / 1000) : num;
    } else {
      return '0:00';
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  // 총 재생 시간 계산
  const getTotalDuration = () => {
    let allSongs = [];
    
    if (songs.album_groups) {
      songs.album_groups.forEach(group => {
        allSongs = allSongs.concat(group.songs);
      });
      if (songs.individual_songs) {
        allSongs = allSongs.concat(songs.individual_songs);
      }
    } else if (songs.all_songs) {
      allSongs = songs.all_songs;
    } else if (Array.isArray(songs)) {
      allSongs = songs;
    }
    
    const totalSeconds = allSongs.reduce((total, song) => {
      const duration = song.duration_ms || song.duration || song.length || 0;
      let seconds;
      if (duration > 10000) {
        seconds = Math.floor(duration / 1000);
      } else {
        seconds = duration;
      }
      return total + seconds;
    }, 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  // 노래 목록 렌더링 함수
  const renderSongsWithGroups = () => {
    if (songs.album_groups && songs.album_groups.length > 0) {
      return (
        <>
          <SongsHeader>
            <div style={{ textAlign: 'center' }}>#</div>
            <div>제목</div>
            <div className="song-album">앨범</div>
            <div className="song-duration" style={{ textAlign: 'center' }}>
              <Clock size={16} style={{ margin: '0 auto' }} />
            </div>
            <div></div>
          </SongsHeader>

          <SongsList>
            {songs.album_groups.map((group) => (
              <div key={group.group_id}>
                <AlbumGroupHeader>
                  <AlbumGroupTitle>
                    <Album size={16} />
                    <span>{group.group_name}</span>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      ({group.total_songs}곡)
                    </span>
                  </AlbumGroupTitle>
                  <AlbumGroupActions>
                    <AlbumGroupButton
                      className="danger"
                      onClick={() => handleRemoveAlbumGroup(group.group_id, group.group_name)}
                      title="앨범 전체 삭제"
                    >
                      <Trash2 size={16} />
                    </AlbumGroupButton>
                  </AlbumGroupActions>
                </AlbumGroupHeader>
                
                {group.songs.map((song, index) => (
                  <SongItem key={`${group.group_id}-${song.id}`}>
                    <SongNumber>
                      <TrackNumber className="track-number">{index + 1}</TrackNumber>
                      <PlayButton 
                        className="play-button"
                        onClick={() => handlePlaySong(song)}
                        title="재생"
                      >
                        <Play size={14} />
                      </PlayButton>
                    </SongNumber>

                    <SongInfo>
                      <SongDetails>
                        <SongName>{song.title}</SongName>
                        <SongArtist>{song.artist?.name}</SongArtist>
                      </SongDetails>
                    </SongInfo>

                    <SongAlbum className="song-album">
                      <span>{song.album?.title || '-'}</span>
                    </SongAlbum>

                    <SongDuration className="song-duration">
                      <span>{formatDuration(song.duration_ms || song.duration || song.length || 0)}</span>
                    </SongDuration>

                    <SongActions className="song-actions">
                      <ActionBtn
                        className={song.is_liked ? 'liked' : ''}
                        onClick={() => handleLikeToggle(song.id)}
                        title="좋아요"
                      >
                        <Heart 
                          size={16} 
                          fill={song.is_liked ? 'currentColor' : 'none'}
                        />
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => handleAddToPlaylist(song)}
                        title="다른 플레이리스트에 추가"
                      >
                        <Plus size={16} />
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => handleRemoveSong(song.id)}
                        title="플레이리스트에서 삭제"
                      >
                        <Trash2 size={16} />
                      </ActionBtn>
                    </SongActions>
                  </SongItem>
                ))}
              </div>
            ))}

            {songs.individual_songs && songs.individual_songs.map((song, index) => (
              <SongItem key={song.id}>
                <SongNumber>
                  <TrackNumber className="track-number">{index + 1}</TrackNumber>
                  <PlayButton 
                    className="play-button"
                    onClick={() => handlePlaySong(song)}
                    title="재생"
                  >
                    <Play size={14} />
                  </PlayButton>
                </SongNumber>

                <SongInfo>
                  <SongDetails>
                    <SongName>{song.title}</SongName>
                    <SongArtist>{song.artist?.name}</SongArtist>
                  </SongDetails>
                </SongInfo>

                <SongAlbum className="song-album">
                  <span>{song.album?.title || '-'}</span>
                </SongAlbum>

                <SongDuration className="song-duration">
                  <span>{formatDuration(song.duration_ms || song.duration || song.length || 0)}</span>
                </SongDuration>

                <SongActions className="song-actions">
                  <ActionBtn
                    className={song.is_liked ? 'liked' : ''}
                    onClick={() => handleLikeToggle(song.id)}
                    title="좋아요"
                  >
                    <Heart 
                      size={16} 
                      fill={song.is_liked ? 'currentColor' : 'none'}
                    />
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => handleAddToPlaylist(song)}
                    title="다른 플레이리스트에 추가"
                  >
                    <Plus size={16} />
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => handleRemoveSong(song.id)}
                    title="플레이리스트에서 삭제"
                  >
                    <Trash2 size={16} />
                  </ActionBtn>
                </SongActions>
              </SongItem>
            ))}
          </SongsList>
        </>
      );
    }

    // 기존 형태의 데이터인 경우
    const songsToRender = songs.all_songs || songs || [];
    
    return (
      <>
        <SongsHeader>
          <div style={{ textAlign: 'center' }}>#</div>
          <div>제목</div>
          <div className="song-album">앨범</div>
          <div className="song-duration" style={{ textAlign: 'center' }}>
            <Clock size={16} style={{ margin: '0 auto' }} />
          </div>
          <div></div>
        </SongsHeader>

        <SongsList>
          {songsToRender.map((song, index) => (
            <SongItem key={song.id}>
              <SongNumber>
                <TrackNumber className="track-number">{index + 1}</TrackNumber>
                <PlayButton 
                  className="play-button"
                  onClick={() => handlePlaySong(song)}
                  title="재생"
                >
                  <Play size={14} />
                </PlayButton>
              </SongNumber>

              <SongInfo>
                <SongDetails>
                  <SongName>{song.title}</SongName>
                  <SongArtist>{song.artist?.name}</SongArtist>
                </SongDetails>
              </SongInfo>

              <SongAlbum className="song-album">
                <span>{song.album?.title || '-'}</span>
              </SongAlbum>

              <SongDuration className="song-duration">
                <span>{formatDuration(song.duration_ms || song.duration || song.length || 0)}</span>
              </SongDuration>

              <SongActions className="song-actions">
                <ActionBtn
                  className={song.is_liked ? 'liked' : ''}
                  onClick={() => handleLikeToggle(song.id)}
                  title="좋아요"
                >
                  <Heart 
                    size={16} 
                    fill={song.is_liked ? 'currentColor' : 'none'}
                  />
                </ActionBtn>
                <ActionBtn
                  onClick={() => handleAddToPlaylist(song)}
                  title="다른 플레이리스트에 추가"
                >
                  <Plus size={16} />
                </ActionBtn>
                <ActionBtn
                  onClick={() => handleRemoveSong(song.id)}
                  title="플레이리스트에서 삭제"
                >
                  <Trash2 size={16} />
                </ActionBtn>
              </SongActions>
            </SongItem>
          ))}
        </SongsList>
      </>
    );
  };

  // 노래 개수 계산
  const getSongCount = () => {
    if (songs.album_groups) {
      let count = 0;
      songs.album_groups.forEach(group => {
        count += group.total_songs || group.songs?.length || 0;
      });
      if (songs.individual_songs) {
        count += songs.individual_songs.length;
      }
      return count;
    } else if (songs.all_songs) {
      return songs.all_songs.length;
    } else if (Array.isArray(songs)) {
      return songs.length;
    }
    return 0;
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <LoadingSpinner />
          <p>플레이리스트를 불러오는 중...</p>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorContainer>
          <p>{error}</p>
          <ActionButton 
            className="secondary" 
            onClick={() => navigate(-1)}
          >
            돌아가기
          </ActionButton>
        </ErrorContainer>
      </PageContainer>
    );
  }

  if (!playlist) {
    return (
      <PageContainer>
        <ErrorContainer>
          <p>플레이리스트를 찾을 수 없습니다.</p>
          <ActionButton 
            className="secondary" 
            onClick={() => navigate(-1)}
          >
            돌아가기
          </ActionButton>
        </ErrorContainer>
      </PageContainer>
    );
  }

  const songCount = getSongCount();

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)} title="뒤로 가기">
          <ArrowLeft size={20} />
        </BackButton>

        <PlaylistInfo>
          <PlaylistCover>
            <PlaylistIcon>
              <Music size={40} />
            </PlaylistIcon>
          </PlaylistCover>

          <PlaylistMeta>
            <PlaylistType>플레이리스트</PlaylistType>
            
            {editMode ? (
              <EditForm>
                <EditTitleInput
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="플레이리스트 제목"
                />
                <EditDescriptionInput
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="설명 (선택사항)"
                  rows="2"
                />
                <EditActions>
                  <SaveButton onClick={handleUpdatePlaylist}>
                    <Check size={16} />
                    저장
                  </SaveButton>
                  <CancelButton 
                    onClick={() => {
                      setEditMode(false);
                      setEditData({
                        title: playlist.title || '',
                        description: playlist.description || ''
                      });
                    }}
                  >
                    <X size={16} />
                    취소
                  </CancelButton>
                </EditActions>
              </EditForm>
            ) : (
              <>
                <PlaylistTitle>{playlist.title}</PlaylistTitle>
                {playlist.description && (
                  <PlaylistDescription>{playlist.description}</PlaylistDescription>
                )}
                <PlaylistStats>
                  <span>{songCount}곡</span>
                  {songCount > 0 && (
                    <>
                      <span>•</span>
                      <span>{getTotalDuration()}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatDate(playlist.created_at)}에 생성</span>
                </PlaylistStats>
              </>
            )}
          </PlaylistMeta>
        </PlaylistInfo>

        <PlaylistActions>
          {!editMode && (
            <>
              <ActionButton 
                className="secondary"
                onClick={() => setEditMode(true)}
              >
                <Edit3 size={16} />
                편집
              </ActionButton>
              <ActionButton 
                className="secondary danger"
                onClick={handleDeletePlaylist}
              >
                <Trash2 size={16} />
                삭제
              </ActionButton>
            </>
          )}
        </PlaylistActions>
      </Header>

      <SongsSection>
        {songCount === 0 ? (
          <EmptyPlaylist>
            <Music size={64} />
            <h3>이 플레이리스트는 비어있습니다</h3>
            <p>좋아하는 노래를 추가해보세요!</p>
          </EmptyPlaylist>
        ) : (
          renderSongsWithGroups()
        )}
      </SongsSection>

      {showPlaylistModal && (
        <PlaylistModalOverlay onClick={() => setShowPlaylistModal(false)}>
          <PlaylistModal onClick={(e) => e.stopPropagation()}>
            <PlaylistModalHeader>
              <h3>다른 플레이리스트에 추가</h3>
              <CloseButton onClick={() => setShowPlaylistModal(false)}>
                <X size={20} />
              </CloseButton>
            </PlaylistModalHeader>
            
            <PlaylistModalContent>
              <SelectedSongInfo>
                <strong>{selectedSong?.title}</strong>
                <span>by {selectedSong?.artist?.name}</span>
              </SelectedSongInfo>
              
              {!showCreateForm && (
                <CreatePlaylistButton onClick={() => setShowCreateForm(true)}>
                  <Plus size={16} />
                  새 플레이리스트 만들기
                </CreatePlaylistButton>
              )}

              {showCreateForm && (
                <CreatePlaylistForm>
                  <input
                    type="text"
                    placeholder="플레이리스트 이름"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                  />
                  <FormActions>
                    <button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}>
                      <Check size={16} />
                      생성
                    </button>
                    <button onClick={() => {
                      setShowCreateForm(false);
                      setNewPlaylistName('');
                    }}>
                      취소
                    </button>
                  </FormActions>
                </CreatePlaylistForm>
              )}
              
              <PlaylistsList>
                {playlists.filter(p => p.id !== parseInt(id)).length === 0 ? (
                  <NoPlaylists>다른 플레이리스트가 없습니다.</NoPlaylists>
                ) : (
                  playlists
                    .filter(p => p.id !== parseInt(id))
                    .map(playlist => (
                      <PlaylistItem 
                        key={playlist.id}
                        onClick={() => addSongToPlaylist(playlist.id)}
                      >
                        <Music size={16} />
                        <span>{playlist.title}</span>
                      </PlaylistItem>
                    ))
                )}
              </PlaylistsList>
            </PlaylistModalContent>
          </PlaylistModal>
        </PlaylistModalOverlay>
      )}
    </PageContainer>
  );
};

export default PlaylistDetail;