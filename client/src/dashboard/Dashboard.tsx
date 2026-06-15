import React, { useState, useEffect } from 'react';

interface SystemStats {
  cpu: string;
  ram: string;
  temp: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/monitor', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch monitor stats', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1>Dashboard</h1>
      </div>

      <div className="dash-grid">
        <div className="glass-panel stat-card">
          <div className="stat-title">CPU Usage</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {stats ? stats.cpu : '--%'}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
            Live Usage
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-title">Memory (RAM)</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {stats ? stats.ram : '-- GB'}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
            Allocated
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-title">Temperature</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {stats ? stats.temp : '--°C'}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
            Core Avg
          </div>
        </div>
      </div>
    </div>
  );
}
