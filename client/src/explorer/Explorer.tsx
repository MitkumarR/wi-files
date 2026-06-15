import React, { useState, useEffect } from 'react';

interface FileInfo {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

interface DriveInfo {
  name: string;
  mountpoint: string;
  size: string;
  type: string;
}

export default function Explorer() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrives();
  }, []);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const fetchDrives = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/drives');
      if (res.ok) {
        const data = await res.json();
        setDrives(data);
      }
    } catch (err) {
      console.error('Failed to fetch drives', err);
    }
  };

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/files?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to fetch files', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  const renderBreadcrumbs = () => {
    if (currentPath === '/') return <span className="crumb">/</span>;
    const parts = currentPath.split('/').filter(Boolean);
    let accum = '';
    return (
      <>
        <span className="crumb" onClick={() => navigateTo('/')}>Root</span>
        {parts.map((p, idx) => {
          accum += '/' + p;
          const target = accum;
          return (
            <React.Fragment key={idx}>
              <span className="separator">/</span>
              <span className="crumb" onClick={() => navigateTo(target)}>{p}</span>
            </React.Fragment>
          );
        })}
      </>
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="explorer-container">
      <div className="header">
        <h1>Explorer</h1>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Mounted Drives</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {drives.map(d => (
            <div 
              key={d.name} 
              className="btn" 
              onClick={() => navigateTo(d.mountpoint)}
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <span>{d.name} ({d.size})</span>
            </div>
          ))}
          {drives.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No extra drives found.</span>}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', minHeight: '60vh' }}>
        <div className="breadcrumbs">
          {renderBreadcrumbs()}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div className="file-list">
            {currentPath !== '/' && (
              <div 
                className="file-item" 
                onClick={() => {
                  const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
                  navigateTo(parent);
                }}
              >
                <div className="file-icon" style={{ color: 'var(--accent)' }}>⬆️</div>
                <div className="file-name">..</div>
              </div>
            )}
            {files.map((f, i) => (
              <div 
                key={i} 
                className="file-item"
                onClick={() => {
                  if (f.isDir) navigateTo(f.path);
                }}
              >
                <div className="file-icon">
                  {f.isDir ? <span style={{color: '#fbbf24'}}>📁</span> : <span style={{color: '#94a3b8'}}>📄</span>}
                </div>
                <div className="file-name" title={f.name}>{f.name}</div>
                {!f.isDir && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{formatSize(f.size)}</div>}
              </div>
            ))}
            {files.length === 0 && currentPath === '/' && <span style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>Directory is empty.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
