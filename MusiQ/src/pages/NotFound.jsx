// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import '../styles/NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found">
      <h2 className="not-found-code">404</h2>
      <h3 className="not-found-title">페이지를 찾을 수 없습니다</h3>
      <p className="not-found-message">
        요청하신 페이지가 존재하지 않거나, 이동되었거나, 일시적으로 사용할 수 없습니다.
        URL을 확인하시거나 홈으로 돌아가세요.
      </p>
      <Link to="/" className="back-home-button">
        <Home size={18} />
        <span>홈으로 돌아가기</span>
      </Link>
    </div>
  );
};

export default NotFound;