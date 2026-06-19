import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getFolderIcon,
  getFileIcon,
  getHomeIcon,
  getDriveSystemIcon,
  getSidebarIcon,
} from '../yaru/YaruIcon';

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

/** Extract user's home directory from the JWT token */
function getUserHome(): string {
  try {
    const token = localStorage.getItem('jwt_token');
    if (!token) return '/home';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.homeDir || '/home';
  } catch {
    return '/home';
  }
}

export default function Explorer({ onPlayVideo }: ExplorerProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const userHome = getUserHome(); // e.g. /home/mit

  // Read current path from URL — default to user's home
  const currentPath = searchParams.get('path') || userHome;

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMountsOpen, setMobileMountsOpen] = useState(false);

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

  /** Navigate by updating the URL search param — this drives the whole explorer */
  const navigateTo = (path: string) => {
    navigate(`/files?path=${encodeURIComponent(path)}`);
  };

  const goBack = () => {
    navigate(-1);
  };

  const goForward = () => {
    navigate(1);
  };

  const goHome = () => {
    navigateTo(userHome);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasThumbnail = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'mp4', 'avi', 'mkv', 'webm', 'mov', 'pdf'].includes(ext || '');
  };

  /** Check if a file is viewable (image or video) */
  const isViewable = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'mp4', 'mkv', 'webm', 'avi', 'mov'].includes(ext);
  };

  /* ──── Quick-access sidebar items ──── */
  const quickAccess = [
    { label: 'Documents', folder: 'Documents' },
    { label: 'Music', folder: 'Music' },
    { label: 'Pictures', folder: 'Pictures' },
    { label: 'Videos', folder: 'Videos' },
    { label: 'Downloads', folder: 'Downloads' },
  ];

  /** Check if user is browsing inside a specific quick-access folder */
  const isInQuickAccess = (folder: string) => {
    const folderPath = `${userHome}/${folder}`;
    return currentPath === folderPath || currentPath.startsWith(folderPath + '/');
  };

  /** Check if we're in the home tree but NOT inside a quick-access subfolder */
  const isInHome = currentPath.startsWith(userHome) &&
    !drives.some(d => currentPath.startsWith(d.mountpoint)) &&
    !quickAccess.some(qa => isInQuickAccess(qa.folder));

  /* ──── Pathbar Context & Breadcrumbs ──── */
  let pathbarIcon = getSidebarIcon('home');
  let rootLabel = '';
  let rootPath = '';
  let remainingPath = currentPath;

  if (currentPath === '/starred') {
    pathbarIcon = getSidebarIcon('starred');
    rootLabel = 'Starred';
    rootPath = '/starred';
    remainingPath = '';
  } else if (currentPath === '/network') {
    pathbarIcon = getSidebarIcon('network');
    rootLabel = 'Network';
    rootPath = '/network';
    remainingPath = '';
  } else if (currentPath === '/trash') {
    pathbarIcon = getSidebarIcon('trash');
    rootLabel = 'Trash';
    rootPath = '/trash';
    remainingPath = '';
  } else {
    // Check if it's a mounted drive
    const drive = drives.find(d => currentPath.startsWith(d.mountpoint));
    if (drive) {
      pathbarIcon = getDriveSystemIcon();
      rootLabel = drive.name;
      rootPath = drive.mountpoint;
      remainingPath = currentPath.substring(drive.mountpoint.length);
    } else if (currentPath.startsWith(userHome)) {
      // Check if inside a quick-access folder
      const matchedQA = quickAccess.find(qa => isInQuickAccess(qa.folder));
      if (matchedQA) {
        pathbarIcon = getSidebarIcon(matchedQA.label);
        rootLabel = matchedQA.label;
        rootPath = `${userHome}/${matchedQA.folder}`;
        remainingPath = currentPath.substring(rootPath.length);
      } else {
        pathbarIcon = getSidebarIcon('home');
        rootLabel = 'Home';
        rootPath = userHome;
        remainingPath = currentPath.substring(userHome.length);
      }
    } else {
      pathbarIcon = getDriveSystemIcon();
      rootLabel = '/';
      rootPath = '/';
      remainingPath = currentPath === '/' ? '' : currentPath;
    }
  }

  // Build breadcrumb segments
  let pathSegments: { label: string; fullPath: string }[] = [];
  if (rootLabel) {
    pathSegments.push({ label: rootLabel, fullPath: rootPath });
  }
  if (remainingPath && remainingPath !== '/') {
    const parts = remainingPath.split('/').filter(Boolean);
    let currentAcc = rootPath;
    for (const part of parts) {
      currentAcc = currentAcc.endsWith('/') ? currentAcc + part : currentAcc + '/' + part;
      pathSegments.push({ label: part, fullPath: currentAcc });
    }
  }

  return (
    <div className="nautilus-root">
      {/* ──── SIDEBAR ──── */}
      <aside className="nautilus-sidebar">
        {/* Main nav */}
        <div className="sidebar-section">
          <button
            className={`sidebar-item ${isInHome ? 'active' : ''}`}
            onClick={goHome}
          >
            <img src={getSidebarIcon('home')} alt="" className="sidebar-icon" />
            <span>Home</span>
          </button>
          <button
            className={`sidebar-item ${currentPath === '/starred' ? 'active' : ''}`}
            onClick={() => navigateTo('/starred')}
          >
            <img src={getSidebarIcon('starred')} alt="" className="sidebar-icon" />
            <span>Starred</span>
          </button>
          <button
            className={`sidebar-item ${currentPath === '/network' ? 'active' : ''}`}
            onClick={() => navigateTo('/network')}
          >
            <img src={getSidebarIcon('network')} alt="" className="sidebar-icon" />
            <span>Network</span>
          </button>
          <button
            className={`sidebar-item ${currentPath === '/trash' ? 'active' : ''}`}
            onClick={() => navigateTo('/trash')}
          >
            <img src={getSidebarIcon('trash')} alt="" className="sidebar-icon" />
            <span>Trash</span>
          </button>
        </div>

        {/* Quick access folders */}
        <div className="sidebar-section">
          {quickAccess.map(qa => (
            <button
              key={qa.label}
              className={`sidebar-item ${isInQuickAccess(qa.folder) ? 'active' : ''}`}
              onClick={() => navigateTo(`${userHome}/${qa.folder}`)}
            >
              <img src={getSidebarIcon(qa.label)} alt="" className="sidebar-icon" />
              <span>{qa.label}</span>
            </button>
          ))}
        </div>

        {/* Mounted Drives */}
        {drives.length > 0 && (
          <div className="sidebar-section">
            {drives.map(d => (
              <button
                key={d.name}
                className={`sidebar-item ${currentPath.startsWith(d.mountpoint) ? 'active' : ''}`}
                onClick={() => navigateTo(d.mountpoint)}
              >
                <img src={getDriveSystemIcon()} alt="" className="sidebar-icon sidebar-icon-svg" />
                <span>{d.name}</span>
                <span className="sidebar-eject">⏏</span>
              </button>
            ))}
          </div>
        )}

        {/* Logout Section */}
        <div className="sidebar-section" style={{ marginTop: 'auto' }}>
          <button
            className="sidebar-item"
            onClick={() => {
              localStorage.removeItem('jwt_token');
              window.location.href = '/auth/login';
            }}
          >
            <img src={getSidebarIcon('logout')} alt="" className="sidebar-icon" />
            <span>Logout</span>
          </button>
        </div>

      </aside>

      {/* ──── MAIN CONTENT ──── */}
      <div className="nautilus-main">
        {/* ──── Header bar ──── */}
        <header className="nautilus-header">
          <div className="header-left">
            <button className="header-btn" onClick={goBack}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10.354 3.354L9.646 2.646 4.293 8l5.353 5.354.708-.708L5.707 8z" /></svg>
            </button>
            <button className="header-btn" onClick={goForward}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.646 3.354l.708-.708L11.707 8l-5.353 5.354-.708-.708L10.293 8z" /></svg>
            </button>
          </div>

          {/* Path / breadcrumb bar */}
          <div className="nautilus-pathbar">
            <img src={pathbarIcon} alt="" className="sidebar-icon" style={{ opacity: 0.8 }} />
            {pathSegments.map((seg, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="pathbar-sep">/</span>}
                <button
                  className={`pathbar-crumb ${i === pathSegments.length - 1 ? 'current' : ''}`}
                  onClick={() => navigateTo(seg.fullPath)}
                >
                  {seg.label}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="header-right">
            {/* Upload button */}
            <div style={{ position: 'relative' }}>
              <button className="header-btn upload-btn">
                {isUploading ? (
                  <span style={{ fontSize: '0.75rem' }}>{uploadProgress}%</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L4 5h3v6h2V5h3L8 1zM2 13v2h12v-2H2z" /></svg>
                )}
              </button>
              <input
                type="file"
                onChange={handleUpload}
                style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                disabled={isUploading}
              />
            </div>
          </div>
        </header>

        {/* ──── File Grid ──── */}
        <div className="nautilus-content">
          {loading ? (
            <div className="nautilus-empty">Loading…</div>
          ) : (
            <div className="nautilus-grid">

              {files.map((f, i) => (
                <div
                  key={i}
                  className="nautilus-item"
                  onDoubleClick={() => {
                    if (f.isDir) {
                      navigateTo(f.path);
                    } else if (isViewable(f.name)) {
                      // Open image/video in viewer
                      navigate(`/view?path=${encodeURIComponent(f.path)}`);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!f.isDir) downloadFile(f.path);
                  }}
                >
                  <div className="nautilus-item-icon">
                    {f.isDir ? (
                      <img src={getFolderIcon(f.name)} alt={f.name} />
                    ) : hasThumbnail(f.name) ? (
                      <img
                        src={`/api/thumbnail?path=${encodeURIComponent(f.path)}&token=${localStorage.getItem('jwt_token')}`}
                        alt={f.name}
                        className="nautilus-thumb"
                        onError={(e) => {
                          // Fall back to Yaru icon
                          e.currentTarget.src = getFileIcon(f.name);
                          e.currentTarget.classList.remove('nautilus-thumb');
                        }}
                      />
                    ) : (
                      <img src={getFileIcon(f.name)} alt={f.name} />
                    )}
                  </div>
                  <span className="nautilus-item-label" title={f.name}>{f.name}</span>

                  {/* Action buttons overlay on hover */}
                  {!f.isDir && (
                    <div className="nautilus-item-actions">
                      <button onClick={(e) => { e.stopPropagation(); downloadFile(f.path); }} title="Download">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1v10l3-3 .7.7L8 12.4 4.3 8.7 5 8l3 3V1zM2 13v2h12v-2H2z" /></svg>
                      </button>
                      {(f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.webm') || f.name.endsWith('.avi') || f.name.endsWith('.mov')) && (
                        <button onClick={(e) => { e.stopPropagation(); onPlayVideo && onPlayVideo(f.path); }} title="Play">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6z" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {files.length === 0 && currentPath !== '/' && (
                <div className="nautilus-empty">
                  {currentPath === '/starred'
                    ? 'No starred files'
                    : currentPath === '/network'
                    ? 'No known connections'
                    : 'This folder is empty'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ──── MOBILE BOTTOM NAV ──── */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-tab ${isInHome || quickAccess.some(qa => isInQuickAccess(qa.folder)) ? 'active' : ''}`}
          onClick={() => { setMobileMenuOpen(false); setMobileMountsOpen(false); goHome(); }}
        >
          <img src={getSidebarIcon('home')} alt="" className="mobile-nav-icon" />
          <span>Home</span>
        </button>
        <button
          className={`mobile-nav-tab ${mobileMountsOpen ? 'active' : ''}`}
          onClick={() => { setMobileMenuOpen(false); setMobileMountsOpen(!mobileMountsOpen); }}
        >
          <img src={getSidebarIcon('mounts')} alt="" className="mobile-nav-icon" />
          <span>Mounts</span>
        </button>
        <button
          className={`mobile-nav-tab ${currentPath === '/starred' ? 'active' : ''}`}
          onClick={() => { setMobileMenuOpen(false); setMobileMountsOpen(false); navigateTo('/starred'); }}
        >
          <img src={getSidebarIcon('starred')} alt="" className="mobile-nav-icon" />
          <span>Starred</span>
        </button>
        <button
          className={`mobile-nav-tab ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => { setMobileMountsOpen(false); setMobileMenuOpen(!mobileMenuOpen); }}
        >
          <img src={getSidebarIcon('menu')} alt="" className="mobile-nav-icon" />
          <span>Menu</span>
        </button>
      </nav>

      {/* ──── MOBILE MOUNTS POPUP ──── */}
      {mobileMountsOpen && (
        <div className="mobile-popup-overlay" onClick={() => setMobileMountsOpen(false)}>
          <div className="mobile-popup" onClick={e => e.stopPropagation()}>
            <div className="mobile-popup-title">Mounted Drives</div>
            {drives.length === 0 ? (
              <div className="mobile-popup-empty">No drives mounted</div>
            ) : (
              drives.map(d => (
                <button
                  key={d.name}
                  className="sidebar-item"
                  onClick={() => { setMobileMountsOpen(false); navigateTo(d.mountpoint); }}
                >
                  <img src={getDriveSystemIcon()} alt="" className="sidebar-icon" />
                  <span>{d.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--naut-text-dim)' }}>{d.size}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ──── MOBILE MENU POPUP ──── */}
      {mobileMenuOpen && (
        <div className="mobile-popup-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-popup" onClick={e => e.stopPropagation()}>
            <div className="mobile-popup-title">Menu</div>
            <button className="sidebar-item" onClick={() => { setMobileMenuOpen(false); navigateTo('/network'); }}>
              <img src={getSidebarIcon('network')} alt="" className="sidebar-icon" />
              <span>Network</span>
            </button>
            <button className="sidebar-item" onClick={() => { setMobileMenuOpen(false); navigateTo('/trash'); }}>
              <img src={getSidebarIcon('trash')} alt="" className="sidebar-icon" />
              <span>Trash</span>
            </button>
            {quickAccess.map(qa => (
              <button
                key={qa.label}
                className={`sidebar-item ${isInQuickAccess(qa.folder) ? 'active' : ''}`}
                onClick={() => { setMobileMenuOpen(false); navigateTo(`${userHome}/${qa.folder}`); }}
              >
                <img src={getSidebarIcon(qa.label)} alt="" className="sidebar-icon" />
                <span>{qa.label}</span>
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--naut-border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
              <button
                className="sidebar-item"
                onClick={() => {
                  localStorage.removeItem('jwt_token');
                  window.location.href = '/auth/login';
                }}
              >
                <img src={getSidebarIcon('logout')} alt="" className="sidebar-icon" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
