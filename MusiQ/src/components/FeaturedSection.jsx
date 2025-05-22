// src/components/FeaturedSection.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/FeaturedSection.css';

const FeaturedSection = ({ title, items }) => {
  return (
    <div className="featured-section">
      <h3 className="section-title">{title}</h3>
      <div className="items-list">
        {items && items.map((item) => (
          <Link to={`/play/${item.id}`} key={item.id} className="music-item">
            <div className="music-thumbnail"></div>
            <div className="music-info">
              <p className="music-title">{item.title}</p>
              <p className="music-artist">{item.artist}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FeaturedSection;