// src/pages/Artist.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Music, User, Search } from 'lucide-react';
import '../styles/Artist.css';

const Artist = () => {
  const navigate = useNavigate();
  const [popularArtists, setPopularArtists] = useState([]);
  const [favoriteArtists, setFavoriteArtists] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);

  const genres = ['전체', 'K-Pop', '인디', '힙합', 'R&B', '록/메탈', '팝', '발라드'];

  // API 기본 URL 설정
  const API_BASE_URL = 'http://54.180.116.4:8000';

  // 인기 아티스트 API 호출
  const fetchPopularArtists = async () => {
    try {
      setLoading(true);
      console.log('Fetching popular artists from Spotify API...');
      
      const token = localStorage.getItem('accessToken');
      
      // 로그인 여부에 따라 다른 엔드포인트 사용
      const endpoint = token 
        ? `${API_BASE_URL}/artists/popular/authenticated`
        : `${API_BASE_URL}/artists/popular`;
      
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const response = await fetch(endpoint, { 
        method: 'GET',
        headers 
      });
      
      console.log('Popular artists API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.log('Non-JSON response received:', textResponse.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }
      
      const artists = await response.json();
      console.log('Received artists:', artists.length);
      
      setPopularArtists(artists);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch popular artists:', err);
      setError(`인기 아티스트를 불러오는데 실패했습니다: ${err.message}`);
      
      // 에러 발생 시 빈 배열로 설정 (더미 데이터 제거)
      setPopularArtists([]);
    } finally {
      setLoading(false);
    }
  };

  // 좋아요한 아티스트 API 호출
  const fetchFavoriteArtists = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      console.log('Fetching favorite artists from Spotify API...');

      const response = await fetch(`${API_BASE_URL}/artists/favorites`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('Favorites endpoint not found');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Non-JSON response received for favorites');
        return;
      }

      const favoriteArtists = await response.json();
      console.log('Received favorite artists:', favoriteArtists.length);
      setFavoriteArtists(favoriteArtists);
    } catch (err) {
      console.error('Failed to fetch favorite artists:', err);
      // 좋아요 아티스트는 조용히 실패처리 (선택적 기능)
    }
  };

  // 아티스트 검색 API 호출
  const searchArtists = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      console.log('Searching artists:', query);
      
      const token = localStorage.getItem('accessToken');
      const endpoint = token 
        ? `${API_BASE_URL}/artists/search/${encodeURIComponent(query)}`
        : `${API_BASE_URL}/artists/public-search/${encodeURIComponent(query)}`;
      
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const response = await fetch(endpoint, { 
        method: 'GET',
        headers 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const artists = await response.json();
      console.log('Search results:', artists.length);
      setSearchResults(artists);
    } catch (err) {
      console.error('Search failed:', err);
      setError(`검색 중 오류가 발생했습니다: ${err.message}`);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 아티스트 좋아요 토글 함수
  const toggleFavorite = async (artistId, currentFavoriteStatus) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('로그인이 필요합니다.');
        return;
      }

      console.log('Toggling favorite for artist:', artistId);

      const response = await fetch(`${API_BASE_URL}/artists/${artistId}/favorite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      console.log('Favorite toggle result:', result);
      
      // 상태 업데이트
      if (searchResults.length > 0) {
        setSearchResults(prev => 
          prev.map(artist => 
            artist.id === artistId 
              ? { ...artist, is_favorite: result.is_favorite }
              : artist
          )
        );
      }
      
      if (popularArtists.length > 0) {
        setPopularArtists(prev => 
          prev.map(artist => 
            artist.id === artistId 
              ? { ...artist, is_favorite: result.is_favorite }
              : artist
          )
        );
      }

      // 좋아요 아티스트 목록 새로고침
      await fetchFavoriteArtists();
      
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      alert(`좋아요 처리 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  // 장르별 필터링
  const getFilteredFavoriteArtists = () => {
    if (selectedGenre === '전체') {
      return favoriteArtists;
    }
    
    return favoriteArtists.filter(artist => 
      artist.genres && artist.genres.some(genre => 
        genre.toLowerCase().includes(selectedGenre.toLowerCase()) ||
        (selectedGenre === 'K-Pop' && genre.toLowerCase().includes('k-pop')) ||
        (selectedGenre === '팝' && genre.toLowerCase().includes('pop')) ||
        (selectedGenre === '힙합' && genre.toLowerCase().includes('hip hop')) ||
        (selectedGenre === 'R&B' && genre.toLowerCase().includes('r&b')) ||
        (selectedGenre === '록/메탈' && (genre.toLowerCase().includes('rock') || genre.toLowerCase().includes('metal')))
      )
    );
  };

  // 아티스트 카드 클릭 핸들러
  const handleArtistClick = (artistId) => {
    navigate(`/artist/${artistId}`);
  };

  // 숫자 포맷팅 함수
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // 검색 입력 핸들러 (디바운싱)
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // 기존 타이머 클리어
    if (window.searchTimer) {
      clearTimeout(window.searchTimer);
    }
    
    // 500ms 후 검색 실행 (Spotify API 호출이므로 조금 더 길게)
    window.searchTimer = setTimeout(() => {
      searchArtists(value);
    }, 500);
  };

  useEffect(() => {
    fetchPopularArtists();
    fetchFavoriteArtists();
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (window.searchTimer) {
        clearTimeout(window.searchTimer);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="artist-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Spotify에서 아티스트 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-page">
      <h2 className="page-title">
        <Music size={24} />
        아티스트
      </h2>
      
      {/* 검색 섹션 */}
      <div className="search-section">
        <div className="search-input-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Spotify에서 아티스트 검색..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        {searchLoading && (
          <div className="search-loading">
            <div className="mini-spinner"></div>
            Spotify에서 검색 중...
          </div>
        )}
        
        {searchResults.length > 0 && (
          <div className="search-results">
            <h3 className="section-title">검색 결과</h3>
            <div className="artists-grid">
              {searchResults.map(artist => (
                <div 
                  key={artist.id} 
                  className="artist-card"
                  onClick={() => handleArtistClick(artist.id)}
                >
                  <div className="artist-avatar">
                    {artist.image_url ? (
                      <img src={artist.image_url} alt={artist.name} />
                    ) : (
                      <User size={40} />
                    )}
                  </div>
                  <div className="artist-info">
                    <h4 className="artist-name">{artist.name}</h4>
                    <p className="artist-genre">
                      {artist.genres?.join(', ') || '장르 정보 없음'}
                    </p>
                    <p className="artist-followers">
                      팔로워 {formatNumber(artist.followers || 0)}
                    </p>
                    <div className="artist-popularity">
                      인기도: {artist.popularity || 0}
                    </div>
                    {localStorage.getItem('accessToken') && (
                      <button 
                        className="favorite-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(artist.id, artist.is_favorite);
                        }}
                      >
                        <Heart 
                          size={16} 
                          fill={artist.is_favorite ? "red" : "none"}
                          color={artist.is_favorite ? "red" : "#666"}
                        />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 인기 아티스트 섹션 */}
      <div className="artist-section">
        <h3 className="section-title">
          <Music size={20} />
          Spotify 인기 아티스트
        </h3>
        
        {error && (
          <div className="error-message">
            {error}
            <button 
              onClick={fetchPopularArtists}
              className="retry-button"
            >
              다시 시도
            </button>
          </div>
        )}
        
        {popularArtists.length === 0 && !error && (
          <div className="empty-state">
            <Music size={48} />
            <p>아티스트 정보를 불러올 수 없습니다.</p>
            <p>Spotify API 연결을 확인해주세요.</p>
          </div>
        )}
        
        <div className="artists-grid">
          {popularArtists.map(artist => (
            <div 
              key={artist.id} 
              className="artist-card"
              onClick={() => handleArtistClick(artist.id)}
            >
              <div className="artist-avatar">
                {artist.image_url ? (
                  <img src={artist.image_url} alt={artist.name} />
                ) : (
                  <User size={40} />
                )}
              </div>
              <div className="artist-info">
                <h4 className="artist-name">{artist.name}</h4>
                <p className="artist-genre">
                  {artist.genres?.join(', ') || '장르 정보 없음'}
                </p>
                <p className="artist-followers">
                  팔로워 {formatNumber(artist.followers || 0)}
                </p>
                <div className="artist-popularity">
                  인기도: {artist.popularity || 0}
                </div>
                {localStorage.getItem('accessToken') && (
                  <button 
                    className="favorite-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(artist.id, artist.is_favorite);
                    }}
                  >
                    <Heart 
                      size={16} 
                      fill={artist.is_favorite ? "red" : "none"}
                      color={artist.is_favorite ? "red" : "#666"}
                    />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 좋아요한 아티스트 섹션 */}
      {localStorage.getItem('accessToken') && (
        <div className="artist-section">
          <h3 className="section-title">
            <Heart size={20} />
            내가 좋아하는 아티스트
          </h3>
          
          <div className="genre-tabs">
            {genres.map(genre => (
              <button 
                key={genre}
                className={`genre-tab ${selectedGenre === genre ? 'active' : ''}`}
                onClick={() => setSelectedGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>

          {favoriteArtists.length === 0 ? (
            <div className="empty-state">
              <Heart size={48} />
              <p>아직 좋아하는 아티스트가 없습니다.</p>
              <p>아티스트를 검색해서 좋아요를 눌러보세요!</p>
            </div>
          ) : (
            <div className="artists-grid">
              {getFilteredFavoriteArtists().map(artist => (
                <div 
                  key={artist.id} 
                  className="artist-card favorite-artist"
                  onClick={() => handleArtistClick(artist.id)}
                >
                  <div className="artist-avatar">
                    {artist.image_url ? (
                      <img src={artist.image_url} alt={artist.name} />
                    ) : (
                      <User size={40} />
                    )}
                    <Heart className="favorite-badge" size={16} fill="red" />
                  </div>
                  <div className="artist-info">
                    <h4 className="artist-name">{artist.name}</h4>
                    <p className="artist-genre">
                      {artist.genres?.join(', ') || '장르 정보 없음'}
                    </p>
                    <p className="artist-followers">
                      팔로워 {formatNumber(artist.followers || 0)}
                    </p>
                    <div className="artist-popularity">
                      인기도: {artist.popularity || 0}
                    </div>
                    <button 
                      className="favorite-button favorite-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(artist.id, true);
                      }}
                      title="좋아요 취소"
                    >
                      <Heart size={16} fill="red" color="red" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {getFilteredFavoriteArtists().length === 0 && selectedGenre !== '전체' && favoriteArtists.length > 0 && (
            <div className="empty-genre">
              <p>선택한 장르의 아티스트가 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Artist;