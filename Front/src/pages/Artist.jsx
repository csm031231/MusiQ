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

  // 인기 아티스트 API 호출
  const fetchPopularArtists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      // 로그인 여부에 따라 다른 엔드포인트 사용
      const endpoint = token 
        ? '/api/artists/popular/authenticated'
        : '/api/artists/popular';
      
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(endpoint, { headers });
      
      if (response.ok) {
        const artists = await response.json();
        setPopularArtists(artists);
      } else {
        throw new Error('인기 아티스트 조회 실패');
      }
    } catch (err) {
      console.error('Failed to fetch popular artists:', err);
      setError('인기 아티스트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 좋아요한 아티스트 API 호출
  const fetchFavoriteArtists = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // 백엔드의 새로운 엔드포인트 사용 (한 번의 API 호출로 모든 정보 가져오기)
      const response = await fetch('/api/artists/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const favoriteArtists = await response.json();
        setFavoriteArtists(favoriteArtists);
      }
    } catch (err) {
      console.error('Failed to fetch favorite artists:', err);
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
      const token = localStorage.getItem('accessToken');
      const endpoint = token 
        ? `/api/artists/search/${encodeURIComponent(query)}`
        : `/api/artists/public-search/${encodeURIComponent(query)}`;
      
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(endpoint, { headers });
      
      if (response.ok) {
        const artists = await response.json();
        setSearchResults(artists);
      } else {
        throw new Error('검색 실패');
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('검색 중 오류가 발생했습니다.');
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

      const response = await fetch(`/api/artists/${artistId}/favorite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        // 상태 업데이트
        if (searchResults.length > 0) {
          // 검색 결과 업데이트
          setSearchResults(prev => 
            prev.map(artist => 
              artist.id === artistId 
                ? { ...artist, is_favorite: result.is_favorite }
                : artist
            )
          );
        }
        
        if (popularArtists.length > 0) {
          // 인기 아티스트 결과 업데이트
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
        
      } else {
        throw new Error('좋아요 처리 실패');
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 장르별 필터링
  const getFilteredFavoriteArtists = () => {
    if (selectedGenre === '전체') {
      return favoriteArtists;
    }
    
    return favoriteArtists.filter(artist => 
      artist.genres.some(genre => 
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

  // 검색 입력 핸들러
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // 디바운싱을 위한 setTimeout
    setTimeout(() => {
      if (value === searchQuery) {
        searchArtists(value);
      }
    }, 300);
  };

  useEffect(() => {
    fetchPopularArtists();
    fetchFavoriteArtists();
  }, []);

  if (loading) {
    return (
      <div className="artist-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>아티스트 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-page">
      <h2 className="page-title">아티스트</h2>
      
      {/* 검색 섹션 */}
      <div className="search-section">
        <div className="search-input-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="아티스트 검색..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        {searchLoading && <div className="search-loading">검색 중...</div>}
        
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
                      {artist.genres.join(', ') || '장르 정보 없음'}
                    </p>
                    <p className="artist-followers">
                      팔로워 {formatNumber(artist.followers)}
                    </p>
                    <div className="artist-popularity">
                      인기도: {artist.popularity}
                    </div>
                    {artist.is_favorite && (
                      <Heart className="favorite-icon" size={16} fill="red" />
                    )}
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
          인기 아티스트
        </h3>
        {error && <div className="error-message">{error}</div>}
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
                  {artist.genres.join(', ') || '장르 정보 없음'}
                </p>
                <p className="artist-followers">
                  팔로워 {formatNumber(artist.followers)}
                </p>
                <div className="artist-popularity">
                  인기도: {artist.popularity}
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
                    {artist.genres.join(', ') || '장르 정보 없음'}
                  </p>
                  <p className="artist-followers">
                    팔로워 {formatNumber(artist.followers)}
                  </p>
                  <div className="artist-popularity">
                    인기도: {artist.popularity}
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
        
        {getFilteredFavoriteArtists().length === 0 && selectedGenre !== '전체' && (
          <div className="empty-genre">
            <p>선택한 장르의 아티스트가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Artist;