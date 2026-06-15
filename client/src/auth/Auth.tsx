import React, { useState } from 'react';

interface AuthProps {
  onLogin: () => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', { method: 'POST' });
      if (res.ok) {
        onLogin();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <h1>Wi-Files</h1>
        <p style={{ color: 'var(--text-muted)' }}>Sign in to access your private cloud.</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              placeholder="admin"
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>
          <button className="btn" type="submit" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? 'Authenticating...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
