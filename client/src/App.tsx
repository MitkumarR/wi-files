import React, { useState } from 'react';
import './index.css';
import Explorer from './explorer/Explorer';
import Dashboard from './dashboard/Dashboard';
import Auth from './auth/Auth';
import Player from './player/Player';

export type ViewState = 'explorer' | 'dashboard' | 'player' | 'auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('explorer');
  const [videoUrl, setVideoUrl] = useState<string>('');

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-container">
      {/* Navigation */}
      <nav className="glass-panel mobile-nav">
        <div 
          className={`nav-item ${currentView === 'explorer' ? 'active' : ''}`}
          onClick={() => setCurrentView('explorer')}
        >
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
          <span>Files</span>
        </div>
        <div 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
          <span>Dash</span>
        </div>
        <div 
          className={`nav-item ${currentView === 'player' ? 'active' : ''}`}
          onClick={() => setCurrentView('player')}
        >
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Play</span>
        </div>
        <div 
          className="nav-item"
          onClick={() => {
            localStorage.removeItem('jwt_token');
            setIsAuthenticated(false);
          }}
        >
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          <span>Logout</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {currentView === 'explorer' && <Explorer onPlayVideo={(path) => { setVideoUrl(path); setCurrentView('player'); }} />}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'player' && <Player videoUrl={videoUrl} />}
      </main>
    </div>
  );
}

export default App;
