import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import './Layout.css';

export const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main-content">
        <TopBar />
        <main className="app-page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
