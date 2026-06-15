import React from 'react';

export default function Player() {
  return (
    <div className="player-container">
      <div className="header">
        <h1>Media Player</h1>
      </div>
      
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>🎬</div>
        <h2 style={{ marginBottom: '1rem' }}>No Video Selected</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
          Select a video from the Explorer to start streaming. Support for MP4 streaming with Range Requests is ready.
        </p>
      </div>
    </div>
  );
}
