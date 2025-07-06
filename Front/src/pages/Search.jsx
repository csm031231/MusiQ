// src/pages/Search.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Play, Heart, Plus, User, Music, Disc3 } from 'lucide-react';
import axios from 'axios';
import '../styles/Search.css';

const Search = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ albums: [], tracks: [], artists: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'albums', 'tracks', 'artists'

  // 검색 API 호출 함수
  const searchMusic = async (query) => {
    if (!query || !query.trim()) {
      throw new Error('검색어를 입력해주세요.');
    }

    try {
      console.log(`서버 POST 검색 중: ${query}`);
      
      const response = await axios.post(`http://54.180.116.4:8000/api/searchPage?query=${encodeURIComponent(query.trim())}`, null, {
        timeout: 10000,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('서버 POST 검색 성공:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('서버 요청 실패:', error.message);
      throw new Error(`서버 연결 실패: ${error.response?.status || 'Unknown'} - ${error.message}`);
    }
  };

  // 에러 처리 함수
  const getErrorMessage = (error) => {
    if (error.code === 'ECONNABORTED') {
      return '요청 시간이 초과되었습니다.';
    } else if (error.response?.status === 404) {
      return '검색 결과를 찾을 수 없습니다.';
    } else if (error.response?.status >= 500) {
      return '서버 오류가 발생했습니다.';
    } else if (error.message) {
      return error.message;
    } else {
      return '알 수 없는 오류가 발생했습니다.';
    }
  };

  // URL 파라미터에서 검색어 추출
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const query = urlParams.get('q');
    
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [location.search]);

  // 검색 실행 함수
  const performSearch = async (query) => {
    if (!query || !query.trim()) {
      return;
    }

    setIsSearching(true);
    setError('');
    setHasSearched(true);

    try {
      const results = await searchMusic(query.trim());
      setSearchResults(results || { albums: [], tracks: [], artists: [] });
    } catch (err) {
      console.error('검색 오류:', err);
      setError(getErrorMessage(err));
      setSearchResults({ albums: [], tracks: [], artists: [] });
    } finally {
      setIsSearching(false);
    }
  };

  // 필터된 결과 가져오기
  const getFilteredResults = () => {
    switch (activeFilter) {
      case 'albums':
        return { albums: searchResults.albums, tracks: [], artists: [] };
      case 'tracks':
        return { albums: [], tracks: searchResults.tracks, artists: [] };
      case 'artists':
        return { albums: [], tracks: [], artists: searchResults.artists };
      default:
        return searchResults;
    }
  };

  const filteredResults = getFilteredResults();
  const totalResults = searchResults.albums.length + searchResults.tracks.length + searchResults.artists.length;

  // 필터 옵션
  const filterOptions = [
    { id: 'all', name: '전체', icon: SearchIcon, count: totalResults },
    { id: 'albums', name: '앨범', icon: Disc3, count: searchResults.albums.length },
    { id: 'tracks', name: '트랙', icon: Music, count: searchResults.tracks.length },
    { id: 'artists', name: '아티스트', icon: User, count: searchResults.artists.length }
  ];

  return (
    <div className="search-page">
      {/* 검색 중 로딩 */}
      {isSearching && (
        <div className="search-loading">
          <div className="loading-spinner"></div>
          <span>검색 중...</span>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="search-error">
          <p>{error}</p>
          <button 
            onClick={() => performSearch(searchQuery)} 
            className="retry-button"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 검색 결과 */}
      {!isSearching && !error && hasSearched && totalResults > 0 && (
        <>
          {/* 필터 버튼들과 검색 요약 */}
          <div className="search-controls">
            <div className="search-filters">
              {filterOptions.map(filter => {
                const IconComponent = filter.icon;
                return (
                  <button
                    key={filter.id}
                    className={`search-filter ${activeFilter === filter.id ? 'active' : ''}`}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    <IconComponent size={16} />
                    <span>{filter.name}</span>
                    <span className="filter-count">({filter.count})</span>
                  </button>
                );
              })}
            </div>
            <div className="search-summary">
              "{searchQuery}" 검색 결과 총 {totalResults}개의 결과를 찾았습니다.
            </div>
          </div>

          <div className="search-results">
            {/* 앨범 섹션 */}
            {filteredResults.albums.length > 0 && (
              <div className="result-section">
                <h3 className="section-title">앨범 ({filteredResults.albums.length})</h3>
                <div className="results-grid">
                  {filteredResults.albums.map(album => (
                    <div key={album.id} className="result-card album-card">
                      <div className="result-image">
                        {album.image ? (
                          <img src={album.image} alt={album.name} />
                        ) : (
                          <div className="placeholder-image">
                            <Disc3 size={40} />
                          </div>
                        )}
                      </div>
                      <div className="result-info">
                        <p className="result-title">{album.name}</p>
                        <p className="result-artist">{album.artists?.join(', ')}</p>
                        <p className="result-details">
                          {album.release_date} • {album.total_tracks}곡
                        </p>
                      </div>
                      <div className="result-actions">
                        <button 
                          className="result-action-btn primary"
                          onClick={() => window.open(album.url, '_blank')}
                          title="Spotify에서 열기"
                        >
                          <Play size={16} />
                        </button>
                        <button className="result-action-btn" title="좋아요">
                          <Heart size={16} />
                        </button>
                        <button className="result-action-btn" title="플레이리스트에 추가">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 트랙 섹션 */}
            {filteredResults.tracks.length > 0 && (
              <div className="result-section">
                <h3 className="section-title">트랙 ({filteredResults.tracks.length})</h3>
                <div className="results-list">
                  {filteredResults.tracks.map(track => (
                    <div key={track.id} className="result-item track-item">
                      <div className="result-image small">
                        {track.image ? (
                          <img src={track.image} alt={track.name} />
                        ) : (
                          <Music size={24} />
                        )}
                      </div>
                      <div className="result-info">
                        <p className="result-title">{track.name}</p>
                        <p className="result-artist">{track.artists?.join(', ')}</p>
                        <p className="result-details">{track.album}</p>
                      </div>
                      <div className="track-duration">
                        {track.duration_ms && Math.floor(track.duration_ms / 60000)}:
                        {track.duration_ms && String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                      </div>
                      <div className="result-actions">
                        <button 
                          className="result-action-btn primary"
                          onClick={() => window.open(track.url, '_blank')}
                          title="Spotify에서 열기"
                        >
                          <Play size={16} />
                        </button>
                        <button className="result-action-btn" title="좋아요">
                          <Heart size={16} />
                        </button>
                        <button className="result-action-btn" title="플레이리스트에 추가">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 아티스트 섹션 */}
            {filteredResults.artists.length > 0 && (
              <div className="result-section">
                <h3 className="section-title">아티스트 ({filteredResults.artists.length})</h3>
                <div className="results-grid">
                  {filteredResults.artists.map(artist => (
                    <div key={artist.id} className="result-card artist-card">
                      <div className="result-image round">
                        {artist.image ? (
                          <img src={artist.image} alt={artist.name} />
                        ) : (
                          <div className="placeholder-image">
                            <User size={40} />
                          </div>
                        )}
                      </div>
                      <div className="result-info">
                        <p className="result-title">{artist.name}</p>
                        <p className="result-details">
                          팔로워 {artist.followers?.toLocaleString()}명
                        </p>
                        {artist.genres && artist.genres.length > 0 && (
                          <p className="result-genres">
                            {artist.genres.slice(0, 2).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="result-actions">
                        <button 
                          className="result-action-btn primary"
                          onClick={() => window.open(artist.url, '_blank')}
                          title="Spotify에서 열기"
                        >
                          <Play size={16} />
                        </button>
                        <button className="result-action-btn" title="팔로우">
                          <Heart size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 검색 결과 없음 */}
      {!isSearching && !error && hasSearched && totalResults === 0 && (
        <div className="no-results">
          <h3>검색 결과 없음</h3>
          <p>'{searchQuery}'에 대한 검색 결과가 없습니다.</p>
          <p>다른 검색어를 시도해보세요.</p>
        </div>
      )}

      {/* 검색하지 않은 상태 - 인기 카테고리 */}
      {!hasSearched && !isSearching && (
        <div className="search-categories">
          <h2 className="page-title">음악 검색</h2>
          <p className="search-subtitle">헤더의 검색창을 사용해서 음악을 찾아보세요</p>
          <h3>인기 카테고리</h3>
          <div className="categories-grid">
            {[
              'K-Pop', '힙합', '인디', '팝', '록', '클래식',
              'R&B', '재즈', '일렉트로닉', '포크', '발라드', '트로트'
            ].map((category, index) => (
              <div 
                key={index}
                className="category-item"
                onClick={() => {
                  navigate(`/search?q=${encodeURIComponent(category)}`);
                }}
              >
                {category}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;