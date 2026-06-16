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
