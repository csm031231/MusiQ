// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Playlists from './pages/Playlists';
import Search from './pages/Search';
import Chart from './pages/Chart';
import Artist from './pages/Artist';
import MyPage from './pages/MyPage';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import './styles/App.css';
import ArtistPage from './pages/ArtistPage';
import PlaylistDetail from './pages/PlaylistDetail';
import LikedSongs from './pages/LikedSongs';

// 모달 컴포넌트
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
};

function App() {
  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout setActiveModal={setActiveModal} />}>
          <Route index element={<Home />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="my-playlists" element={<Playlists />} />
          <Route path="search" element={<Search />} />
          <Route path="chart" element={<Chart />} />
          <Route path="artist" element={<Artist />} />
          <Route path="artist/:id" element={<ArtistPage />} />
          <Route path="/liked-songs" element={<LikedSongs />} />
          <Route path="/playlists/:id" element={<PlaylistDetail />} />
        </Route>
      </Routes>
      
      {/* 모달들 */}
      <Modal isOpen={activeModal === 'login'} onClose={closeModal}>
        <Login setActiveModal={setActiveModal} />
      </Modal>
      
      <Modal isOpen={activeModal === 'signup'} onClose={closeModal}>
        <SignUp setActiveModal={setActiveModal} />
      </Modal>
      
      <Modal isOpen={activeModal === 'mypage'} onClose={closeModal}>
        <MyPage setActiveModal={setActiveModal} />
      </Modal>
    </Router>
  );
}

export default App;