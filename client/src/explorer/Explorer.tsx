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
  usedSpace?: string;
  totalSpace?: string;
  usedPct?: string;
}

interface ExplorerProps {
  onPlayVideo?: (path: string) => void;
}

export default function Explorer({ onPlayVideo }: ExplorerProps) {
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
      const res = await fetch('/api/drives', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
      });
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
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      } else if (res.status === 403) {
        alert("Permission denied to access this folder.");
      }
    } catch (err) {
      console.error('Failed to fetch files', err);
    } finally {
      setLoading(false);
    }
  };

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/upload?path=${encodeURIComponent(currentPath)}`);
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('jwt_token')}`);
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded * 100) / event.total));
      }
    };
    
    xhr.onload = () => {
      setIsUploading(false);
      setUploadProgress(0);
      if (xhr.status === 200) {
        fetchFiles(currentPath);
      } else if (xhr.status === 403) {
        alert("Permission denied to upload files here.");
      } else {
        alert('Upload failed: ' + xhr.responseText);
      }
    };
    
    xhr.send(formData);
  };

  const downloadFile = (path: string) => {
    fetch(`/api/download?path=${encodeURIComponent(path)}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    });
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
        <div style={{ position: 'relative' }}>
          <button className="btn">
            {isUploading ? `Uploading ${uploadProgress}%` : 'Upload File'}
          </button>
          <input 
            type="file" 
            onChange={handleUpload}
            style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
            disabled={isUploading}
          />
        </div>
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
            {currentPath === '/' && drives.map((d, i) => (
              <div 
                key={`drive-${i}`} 
                className="file-item"
                onClick={() => navigateTo(d.mountpoint)}
              >
                <div className="file-icon" style={{ color: 'var(--primary)' }}>💾</div>
                <div className="file-name">
                  {d.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({d.mountpoint})</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {d.usedSpace && d.totalSpace ? `${d.usedSpace} / ${d.totalSpace} (${d.usedPct})` : d.size}
                </div>
              </div>
            ))}
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
                {!f.isDir && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span>{formatSize(f.size)}</span>
                    <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); downloadFile(f.path); }}>↓</button>
                    {f.name.endsWith('.mp4') && (
                      <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--accent)' }} onClick={(e) => { e.stopPropagation(); onPlayVideo && onPlayVideo(f.path); }}>▶</button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {files.length === 0 && currentPath === '/' && <span style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>Directory is empty.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
