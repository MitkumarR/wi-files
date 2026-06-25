import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getFolderIcon,
  getFileIcon,
  getDriveSystemIcon,
  getSidebarIcon,
  getActionIcon,
} from '../yaru/YaruIcon';
import Popover from '../components/Popover';

interface FileInfo {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name-asc' | 'name-desc' | 'modified-desc' | 'modified-asc' | 'size' | 'type';

interface DriveInfo {
  name: string;
  mountpoint: string;
  size: string;
  type: string;
  usedSpace?: string;
  totalSpace?: string;
  usedPct?: string;
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

export default function Explorer() {
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

  // View options state
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('wf_viewMode') as ViewMode) || 'grid');
  const [iconSize, setIconSize] = useState(() => parseInt(localStorage.getItem('wf_iconSize') || '64'));
  const [sortBy, setSortBy] = useState<SortBy>(() => (localStorage.getItem('wf_sortBy') as SortBy) || 'name-asc');
  const [showHidden, setShowHidden] = useState(() => localStorage.getItem('wf_showHidden') === 'true');
  const [captionsModalOpen, setCaptionsModalOpen] = useState(false);
  const [gridCaptions, setGridCaptions] = useState<[string, string, string]>(() => {
    try { return JSON.parse(localStorage.getItem('wf_gridCaptions') || '["none","none","none"]'); } catch { return ['none', 'none', 'none']; }
  });
  const [listColumns, setListColumns] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('wf_listColumns') || '{"size":true,"modified":true,"type":false}'); } catch { return { size: true, modified: true, type: false }; }
  });
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);

  useEffect(() => {
    fetchDrives();
  }, []);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  // Persist view preferences
  useEffect(() => { localStorage.setItem('wf_viewMode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('wf_iconSize', String(iconSize)); }, [iconSize]);
  useEffect(() => { localStorage.setItem('wf_sortBy', sortBy); }, [sortBy]);
  useEffect(() => { localStorage.setItem('wf_showHidden', String(showHidden)); }, [showHidden]);
  useEffect(() => { localStorage.setItem('wf_gridCaptions', JSON.stringify(gridCaptions)); }, [gridCaptions]);
  useEffect(() => { localStorage.setItem('wf_listColumns', JSON.stringify(listColumns)); }, [listColumns]);

  // Ctrl+H to toggle hidden files
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'h') { e.preventDefault(); setShowHidden(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /** Get file extension */
  const getExt = (name: string) => name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';

  /** Sort and filter files */
  const processedFiles = React.useMemo(() => {
    let result = [...files];
    // Filter hidden
    if (!showHidden) result = result.filter(f => !f.name.startsWith('.'));
    // Sort — directories always first
    result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'name-desc': return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
        case 'modified-desc': return new Date(b.modTime).getTime() - new Date(a.modTime).getTime();
        case 'modified-asc': return new Date(a.modTime).getTime() - new Date(b.modTime).getTime();
        case 'size': return b.size - a.size;
        case 'type': return getExt(a.name).localeCompare(getExt(b.name));
        default: return 0;
      }
    });
    return result;
  }, [files, showHidden, sortBy]);

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
        {/* Logo */}
        <div style={{ padding: '0.5rem 0rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
          <span>Wi-Files</span>
        </div>

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
              <img src={getActionIcon('go-previous-symbolic')} alt="Back" style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)' }} />
            </button>
            <button className="header-btn" onClick={goForward}>
              <img src={getActionIcon('go-next-symbolic')} alt="Forward" style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)' }} />
            </button>
          </div>
          <div className="header-center">
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

            {/* More Options popover */}
            <Popover
              align="end"
              trigger={
                <button className="header-btn view-more-btn" title="More Options">
                  <img src={getActionIcon('view-more-symbolic')} alt="More Options" style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)' }} />
                </button>
              }
            >
              <button className="vom-action" onClick={() => alert('New Folder feature coming soon!')}>New Folder</button>
              <div style={{ position: 'relative' }}>
                <button className="vom-action" style={{ width: '100%', textAlign: 'left' }}>
                  {isUploading ? `Uploading ${uploadProgress}%` : 'Upload...'}
                </button>
                <input
                  type="file"
                  onChange={handleUpload}
                  style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  disabled={isUploading}
                />
              </div>
              <div className="vom-divider" />
              <button className="vom-action" onClick={() => fetchFiles(currentPath)}>Reload</button>
              <button className="vom-action" onClick={() => navigator.clipboard.writeText(currentPath)}>Copy Location</button>
            </Popover>

          </div>

          <div className="header-right">
            {/* View controls group */}
            <div className="view-mode-toggle">
              <button
                className="header-btn"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                title={viewMode === 'grid' ? 'List view' : 'Grid view'}
              >
                <img
                  src={getActionIcon(viewMode === 'grid' ? 'view-list-symbolic' : 'view-grid-symbolic')}
                  alt={viewMode === 'grid' ? 'List view' : 'Grid view'}
                  style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)' }}
                />
              </button>

              <div className="view-mode-sep" />

              <Popover
                align="end"
                trigger={
                  <button className="header-btn view-toggle-btn" title="View Options">
                    <img src={getActionIcon('go-down-symbolic')} alt="View Options" style={{ width: 10, height: 10, filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
                  </button>
                }
              >
                <div className="vom-section">
                  <div className="vom-label">Icon Size</div>
                  <div className="vom-icon-size">
                    <button onClick={() => setIconSize(s => Math.max(32, s - 16))} title="Smaller">
                      <img src={getActionIcon('zoom-out-symbolic')} alt="Smaller" style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)' }} />
                    </button>
                    <button onClick={() => setIconSize(s => Math.min(128, s + 16))} title="Larger">
                      <img src={getActionIcon('zoom-in-symbolic')} alt="Larger" style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)' }} />
                    </button>
                  </div>
                </div>
                <div className="vom-divider" />
                <div className="vom-section">
                  <div className="vom-label">Sort</div>
                  {([['name-asc', 'A-Z'], ['name-desc', 'Z-A'], ['modified-desc', 'Last Modified'], ['modified-asc', 'First Modified'], ['size', 'Size'], ['type', 'Type']] as [SortBy, string][]).map(([val, label]) => (
                    <label key={val} className="vom-radio">
                      <input type="radio" name="sort" checked={sortBy === val} onChange={() => setSortBy(val)} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="vom-divider" />
                <label className="vom-checkbox" onClick={() => setShowHidden(v => !v)}>
                  <span className="vom-check-icon">{showHidden ? '✓' : ''}</span>
                  <span>Show Hidden Files</span>
                  <span className="vom-shortcut">Ctrl+H</span>
                </label>
                <div className="vom-divider" />
                {viewMode === 'grid' ? (
                  <button className="vom-action" onClick={() => setCaptionsModalOpen(true)}>Captions…</button>
                ) : (
                  <button className="vom-action" onClick={() => setColumnsModalOpen(true)}>Visible Columns…</button>
                )}
              </Popover>
            </div>


          </div>
        </header>

        {/* ──── File Content ──── */}
        <div className="nautilus-content">
          {loading ? (
            <div className="nautilus-empty">Loading…</div>
          ) : viewMode === 'grid' ? (
            /* ── GRID VIEW ── */
            <div className="nautilus-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${iconSize + 36}px, 1fr))` }}>
              {processedFiles.map((f, i) => (
                <div
                  key={i}
                  className={`nautilus-item ${f.name.startsWith('.') ? 'nautilus-hidden-item' : ''}`}
                  onDoubleClick={() => {
                    if (f.isDir) navigateTo(f.path);
                    else if (isViewable(f.name)) navigate(`/view?path=${encodeURIComponent(f.path)}`);
                  }}
                  onContextMenu={(e) => { e.preventDefault(); if (!f.isDir) downloadFile(f.path); }}
                >
                  <div className="nautilus-item-icon" style={{ width: iconSize, height: iconSize }}>
                    {f.isDir ? (
                      <img src={getFolderIcon(f.name, iconSize)} alt={f.name} style={{ maxWidth: iconSize, maxHeight: iconSize }} />
                    ) : hasThumbnail(f.name) ? (
                      <img
                        src={`/api/thumbnail?path=${encodeURIComponent(f.path)}&token=${localStorage.getItem('jwt_token')}`}
                        alt={f.name}
                        className="nautilus-thumb"
                        style={{ maxWidth: iconSize, maxHeight: iconSize }}
                        onError={(e) => { e.currentTarget.src = getFileIcon(f.name, iconSize); e.currentTarget.classList.remove('nautilus-thumb'); }}
                      />
                    ) : (
                      <img src={getFileIcon(f.name, iconSize)} alt={f.name} style={{ maxWidth: iconSize, maxHeight: iconSize }} />
                    )}
                  </div>
                  <span className="nautilus-item-label" title={f.name}>{f.name}</span>
                  {gridCaptions.map((cap, ci) => cap !== 'none' && (
                    <span key={ci} className="nautilus-item-caption">
                      {cap === 'size' ? formatSize(f.size) : cap === 'modified' ? new Date(f.modTime).toLocaleDateString() : cap === 'type' ? (f.isDir ? 'Folder' : getExt(f.name).toUpperCase() || 'File') : ''}
                    </span>
                  ))}
                  {!f.isDir && (
                    <div className="nautilus-item-actions">
                      <button onClick={(e) => { e.stopPropagation(); downloadFile(f.path); }} title="Download">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1v10l3-3 .7.7L8 12.4 4.3 8.7 5 8l3 3V1zM2 13v2h12v-2H2z" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {processedFiles.length === 0 && (
                <div className="nautilus-empty">
                  {currentPath === '/starred' ? 'No starred files' : currentPath === '/network' ? 'No known connections' : 'This folder is empty'}
                </div>
              )}
            </div>
          ) : (
            /* ── LIST VIEW ── */
            <div className="nautilus-list">
              <div className="nautilus-list-header">
                <span className="list-col-name">Name</span>
                {listColumns.size && <span className="list-col-size">Size</span>}
                {listColumns.modified && <span className="list-col-modified">Modified</span>}
                {listColumns.type && <span className="list-col-type">Type</span>}
              </div>
              {processedFiles.map((f, i) => (
                <div
                  key={i}
                  className={`nautilus-list-item ${f.name.startsWith('.') ? 'nautilus-hidden-item' : ''}`}
                  onDoubleClick={() => {
                    if (f.isDir) navigateTo(f.path);
                    else if (isViewable(f.name)) navigate(`/view?path=${encodeURIComponent(f.path)}`);
                  }}
                  onContextMenu={(e) => { e.preventDefault(); if (!f.isDir) downloadFile(f.path); }}
                >
                  <span className="list-col-name">
                    <img
                      src={f.isDir ? getFolderIcon(f.name, Math.min(iconSize, 24)) : getFileIcon(f.name, Math.min(iconSize, 24))}
                      alt="" className="list-icon"
                      style={{ width: Math.min(iconSize, 24), height: Math.min(iconSize, 24) }}
                    />
                    {f.name}
                  </span>
                  {listColumns.size && <span className="list-col-size">{f.isDir ? '—' : formatSize(f.size)}</span>}
                  {listColumns.modified && <span className="list-col-modified">{new Date(f.modTime).toLocaleString()}</span>}
                  {listColumns.type && <span className="list-col-type">{f.isDir ? 'Folder' : getExt(f.name).toUpperCase() || 'File'}</span>}
                </div>
              ))}
              {processedFiles.length === 0 && (
                <div className="nautilus-empty">
                  {currentPath === '/starred' ? 'No starred files' : currentPath === '/network' ? 'No known connections' : 'This folder is empty'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ──── Grid View Captions Modal ──── */}
      {captionsModalOpen && (
        <div className="modal-overlay" onClick={() => setCaptionsModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Grid View Captions</h3>
              <button className="modal-close" onClick={() => setCaptionsModalOpen(false)}>✕</button>
            </div>
            <p className="modal-desc">Add information to be displayed beneath file and folder names.</p>
            {(['First', 'Second', 'Third'] as const).map((label, i) => (
              <div key={label} className="modal-row">
                <span>{label}</span>
                <select value={gridCaptions[i]} onChange={e => { const c = [...gridCaptions] as [string, string, string]; c[i] = e.target.value; setGridCaptions(c); }}>
                  <option value="none">None</option>
                  <option value="size">Size</option>
                  <option value="type">Type</option>
                  <option value="modified">Date Modified</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── Visible Columns Modal ──── */}
      {columnsModalOpen && (
        <div className="modal-overlay" onClick={() => setColumnsModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Visible Columns</h3>
              <button className="modal-close" onClick={() => setColumnsModalOpen(false)}>✕</button>
            </div>
            <div className="modal-col-row disabled"><span>Name</span><span className="col-always-on">Always On</span></div>
            {[['size', 'Size'], ['modified', 'Date Modified'], ['type', 'Type']].map(([key, label]) => (
              <div key={key} className="modal-col-row">
                <span>{label}</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={!!listColumns[key]} onChange={e => setListColumns(c => ({ ...c, [key]: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

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
