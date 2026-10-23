import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import './Layout.css';

export const Layout: React.FC = () => {
  return (
    <div className="renalis-layout">
      <TopBar />
      <div className="renalis-body-container">
        <Sidebar />
        <main className="renalis-main-content" role="main">
          <div className="main-content-scroll">
            <Outlet />
            <footer className="renalis-page-footer">
              <p className="page-footer-note">
                Your health, one day at a time. Share questions with your care team.
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};
