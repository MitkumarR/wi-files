import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import Explorer from './explorer/Explorer';
import Dashboard from './dashboard/Dashboard';
import Auth from './auth/Auth';
import Player from './player/Player';
import FileViewer from './viewer/FileViewer';

/** Check if we have a valid (non-expired) JWT in localStorage */
function hasValidToken(): boolean {
  const token = localStorage.getItem('jwt_token');
  if (!token) return false;
  try {
    // JWT structure: header.payload.signature — decode the payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('jwt_token');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Wrapper that redirects to /auth/login if not authenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!hasValidToken()) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasValidToken());
  const navigate = useNavigate();
  const location = useLocation();

  // Re-check token when location changes (covers expiry edge case)
  useEffect(() => {
    setIsAuthenticated(hasValidToken());
  }, [location]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    // Redirect to files after login (default to home dir)
    navigate('/files?path=/home', { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setIsAuthenticated(false);
    navigate('/auth/login', { replace: true });
  };

  const handlePlayVideo = (filePath: string) => {
    navigate(`/view?path=${encodeURIComponent(filePath)}`);
  };

  // If user hits root /, redirect to /files or /auth/login
  const rootRedirect = isAuthenticated
    ? <Navigate to="/files?path=/home" replace />
    : <Navigate to="/auth/login" replace />;

  return (
    <Routes>
      {/* Auth route — no shell */}
      <Route path="/auth/login" element={
        isAuthenticated
          ? <Navigate to="/files?path=/home" replace />
          : <Auth onLogin={handleLogin} />
      } />

      {/* All protected routes share the app shell */}
      <Route path="/*" element={
        <RequireAuth>
          <div className="app-container">
            {/* Navigation rail */}
            <nav className="glass-panel mobile-nav">
              <div
                className={`nav-item ${location.pathname === '/files' ? 'active' : ''}`}
                onClick={() => navigate('/files?path=/home')}
              >
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
                <span>Files</span>
              </div>
              <div
                className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard')}
              >
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                </svg>
                <span>Dash</span>
              </div>
              <div
                className="nav-item"
                onClick={handleLogout}
              >
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span>Logout</span>
              </div>
            </nav>

            {/* Main Content Area */}
            <main className="main-content">
              <Routes>
                <Route path="/files" element={<Explorer onPlayVideo={handlePlayVideo} />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/view" element={<FileViewer />} />
                <Route path="*" element={<Navigate to="/files?path=/home" replace />} />
              </Routes>
            </main>
          </div>
        </RequireAuth>
      } />

      {/* Root redirect */}
      <Route index element={rootRedirect} />
    </Routes>
  );
}

export default App;
