// src/components/Layout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import '../styles/Layout.css';

const Layout = ({ setActiveModal }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    console.log('토글 사이드바:', !sidebarOpen); // 디버깅용
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    console.log('사이드바 닫기 호출됨'); // 디버깅용
    setSidebarOpen(false);
  };

  return (
    <div className="layout">
      <Header toggleSidebar={toggleSidebar} setActiveModal={setActiveModal} />
      <div className="content-container">
        {/* 오버레이 - Layout.css에 스타일 추가 필요 */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay" 
            onClick={closeSidebar}
            aria-hidden="true"
          ></div>
        )}
        <Sidebar isOpen={sidebarOpen} closeSidebar={closeSidebar} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;