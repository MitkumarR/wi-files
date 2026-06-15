import React from 'react';

interface PlayerProps {
  videoUrl: string;
}

export default function Player({ videoUrl }: PlayerProps) {
  // If videoUrl is provided, we append the JWT token to the URL so the server accepts the stream
  const token = localStorage.getItem('jwt_token') || '';
  const streamUrl = videoUrl ? `/api/download?path=${encodeURIComponent(videoUrl)}&token=${encodeURIComponent(token)}` : '';

  return (
    <div className="player-container">
      <div className="header">
        <h1>Media Player</h1>
      </div>
      
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {!videoUrl ? (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>🎬</div>
            <h2 style={{ marginBottom: '1rem' }}>No Video Selected</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
              Select a video from the Explorer to start streaming. Support for MP4 streaming with Range Requests is ready.
            </p>
          </>
        ) : (
          <video 
            controls 
            autoPlay 
            style={{ width: '100%', maxWidth: '800px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}
            src={streamUrl}
          >
            Your browser does not support HTML5 video.
          </video>
        )}
      </div>
    </div>
  );
}
