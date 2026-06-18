import React, { useState, useEffect } from 'react';
import wifilesLogo from '../assets/logo/wifiles-blue.svg';

interface LinuxUser {
  username: string;
  uid: number;
  gid: number;
  fullName: string;
  homeDir: string;
  shell: string;
  hasAvatar: boolean;
}

interface AuthProps {
  onLogin: () => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [users, setUsers] = useState<LinuxUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<LinuxUser | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingUsers, setFetchingUsers] = useState(true);

  useEffect(() => {
    fetch('/api/auth/users')
      .then(res => res.json())
      .then((data: LinuxUser[]) => {
        setUsers(data);
        // If only one user, auto-select
        if (data.length === 1) {
          setSelectedUser(data[0]);
        }
        setFetchingUsers(false);
      })
      .catch(err => {
        console.error('Failed to fetch users:', err);
        setFetchingUsers(false);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUser.username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('jwt_token', data.token);
        onLogin();
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setPassword('');
    setError('');
  };

  const getAvatarUrl = (user: LinuxUser) => {
    if (user.hasAvatar) {
      return `/api/auth/avatar?username=${user.username}`;
    }
    return null;
  };

  // User selection screen
  if (!selectedUser) {
    return (
      <div className="auth-container">
        <div className="auth-login-box">
          <img src={wifilesLogo} alt="WiFiles" className="auth-logo" />
          {fetchingUsers ? (
            <p className="auth-subtitle">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="auth-subtitle">No users found on this system.</p>
          ) : (
            <>
              <div className="auth-user-grid">
                {users.map(user => (
                  <button
                    key={user.username}
                    className="auth-user-card"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="auth-avatar">
                      {user.hasAvatar ? (
                        <img src={getAvatarUrl(user)!} alt={user.fullName} />
                      ) : (
                        <div className="auth-avatar-fallback">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="auth-username">{user.fullName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Password entry screen
  return (
    <div className="auth-container">
      <div className="auth-login-box">
        <img src={wifilesLogo} alt="WiFiles" className="auth-logo" />

        <div className="auth-selected-user">
          <div className="auth-avatar auth-avatar-large">
            {selectedUser.hasAvatar ? (
              <img src={getAvatarUrl(selectedUser)!} alt={selectedUser.fullName} />
            ) : (
              <div className="auth-avatar-fallback">
                {selectedUser.fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="auth-selected-name">{selectedUser.fullName}</span>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-password-row">
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              required
              placeholder="Password"
              autoFocus
              className="auth-password-input"
            />
            <button
              className="auth-submit-btn"
              type="submit"
              disabled={loading || !password}
            >
              {loading ? '...' : '→'}
            </button>
          </div>
          {error && <p className="auth-error">{error}</p>}
        </form>

        {users.length > 1 && (
          <button className="auth-back-btn" onClick={handleBack}>
            ← Other users
          </button>
        )}
      </div>
    </div>
  );
}
