// src/pages/Search.jsx
import React, { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import '../styles/Search.css';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // 검색 결과를 시뮬레이션 (실제로는 API 호출)
    setTimeout(() => {
      setSearchResults([
        { id: 1, title: '여름 아침', artist: '아이유', album: '꽃갈피' },
        { id: 2, title: '좋은 날', artist: '아이유', album: 'Real' },
        { id: 3, title: '봄날', artist: '방탄소년단', album: 'YOU NEVER WALK ALONE' },
      ]);
      setIsSearching(false);
    }, 500);
  };

  return (
    <div className="search-page">
      <h2 className="page-title">검색</h2>
      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-input-container">
          <input
            type="text"
            placeholder="음악, 아티스트, 앨범을 검색하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            <SearchIcon size={20} />
          </button>
        </div>
      </form>

      {isSearching ? (
        <div className="search-loading">검색 중...</div>
      ) : searchResults.length > 0 ? (
        <div className="search-results">
          <h3>검색 결과</h3>
          <div className="results-list">
            {searchResults.map(result => (
              <div key={result.id} className="result-item">
                <div className="result-image"></div>
                <div className="result-info">
                  <p className="result-title">{result.title}</p>
                  <p className="result-artist">{result.artist} • {result.album}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : searchQuery ? (
        <div className="no-results">검색 결과가 없습니다.</div>
      ) : (
        <div className="search-categories">
          <h3>인기 카테고리</h3>
          <div className="categories-grid">
            <div className="category-item">K-Pop</div>
            <div className="category-item">힙합</div>
            <div className="category-item">인디</div>
            <div className="category-item">팝</div>
            <div className="category-item">록</div>
            <div className="category-item">클래식</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;