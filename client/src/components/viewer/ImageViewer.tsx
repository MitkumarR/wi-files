import { useState, useEffect, useRef, useCallback } from 'react';
import { getActionIcon } from '../../yaru/YaruIcon';

interface Props {
  streamUrl: string;
  fileName: string;
  filePath: string;
  onNavigate?: (path: string) => void;
}

interface SiblingFile {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

export default function ImageViewer({ streamUrl, fileName, filePath, onNavigate }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── State ─────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showProps, setShowProps] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [siblings, setSiblings] = useState<SiblingFile[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);

  const ext = fileName.split('.').pop()?.toUpperCase() || '';
  const parentDir = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
  const folderName = parentDir.split('/').filter(Boolean).pop() || '/';

  // ── Fetch sibling images ──────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('jwt_token') || '';
    fetch(`/api/files?path=${encodeURIComponent(parentDir)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((files: SiblingFile[]) => {
        const imgs = files.filter(
          f => !f.isDir && IMAGE_EXTS.includes(f.name.split('.').pop()?.toLowerCase() || '')
        );
        setSiblings(imgs);
        setCurrentIdx(imgs.findIndex(f => f.path === filePath));
      })
      .catch(() => {});
  }, [parentDir, filePath]);

  // ── Reset zoom when navigating to a new image ─────────────────────────
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [filePath]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === '+' || e.key === '=') zoomIn();
      else if (e.key === '-') zoomOut();
      else if (e.key === '0') zoomReset();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  };

  // ── Zoom with scroll wheel ────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(prev => {
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      return Math.min(Math.max(prev * factor, 0.1), 10);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // ── Drag to pan ───────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // ── Double-click to toggle 100% / fit ─────────────────────────────────
  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      zoomReset();
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────
  const goToImage = (idx: number) => {
    const file = siblings[idx];
    if (file && onNavigate) onNavigate(file.path);
  };
  const goPrev = () => { if (currentIdx > 0) goToImage(currentIdx - 1); };
  const goNext = () => { if (currentIdx < siblings.length - 1) goToImage(currentIdx + 1); };

  // ── Zoom controls ────────────────────────────────────────────────────
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.25, 10));
  const zoomOut = () => setZoom(prev => Math.max(prev * 0.8, 0.1));
  const zoomReset = () => { setZoom(1); setPosition({ x: 0, y: 0 }); };

  // ── File metadata from sibling list ───────────────────────────────────
  const currentFile = siblings[currentIdx];

  return (
    <div className={`gnome-iv ${showProps ? 'gnome-iv--props-open' : ''}`}>
      {/* ── Image Canvas ─────────────────────────────────────────────── */}
      <div
        className="gnome-iv-canvas"
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
      >
        <img
          ref={imgRef}
          src={streamUrl}
          alt={fileName}
          onLoad={handleImageLoad}
          draggable={false}
          className="gnome-iv-img"
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})` }}
        />
      </div>

      {/* ── Properties Sidebar ───────────────────────────────────────── */}
      <aside className={`gnome-iv-sidebar ${showProps ? 'open' : ''}`}>
        <div className="gnome-iv-prop-group">
          <div className="gnome-iv-prop-row">
            <span className="gnome-iv-prop-label">Folder</span>
            <span className="gnome-iv-prop-value">{folderName}</span>
          </div>
        </div>

        <div className="gnome-iv-prop-group">
          <div className="gnome-iv-prop-row">
            <span className="gnome-iv-prop-label">Image Size</span>
            <span className="gnome-iv-prop-value">{imgSize.w} × {imgSize.h}</span>
          </div>
          <div className="gnome-iv-prop-row">
            <span className="gnome-iv-prop-label">Image Format</span>
            <span className="gnome-iv-prop-value">{ext}</span>
          </div>
          <div className="gnome-iv-prop-row">
            <span className="gnome-iv-prop-label">File Size</span>
            <span className="gnome-iv-prop-value">{currentFile ? fmtSize(currentFile.size) : ''}</span>
          </div>
        </div>

        {currentFile?.modTime && (
          <div className="gnome-iv-prop-group">
            <div className="gnome-iv-prop-row">
              <span className="gnome-iv-prop-label">File Modified</span>
              <span className="gnome-iv-prop-value">{fmtDate(currentFile.modTime)}</span>
            </div>
          </div>
        )}
      </aside>

      {/* ── Bottom Floating Toolbar ──────────────────────────────────── */}
      <div className="gnome-iv-toolbar">
        {/* Left pill: prev / next */}
        <div className="gnome-iv-toolbar-left">
          {siblings.length > 1 && (
            <div className="gnome-iv-pill">
              <button className="gnome-iv-pill-btn" onClick={goPrev} disabled={currentIdx <= 0} title="Previous (←)">
                <img src={getActionIcon('go-previous-symbolic')} alt="Previous" className="gnome-iv-icon" />
              </button>
              <button className="gnome-iv-pill-btn" onClick={goNext} disabled={currentIdx >= siblings.length - 1} title="Next (→)">
                <img src={getActionIcon('go-next-symbolic')} alt="Next" className="gnome-iv-icon" />
              </button>
            </div>
          )}
        </div>

        {/* Right pill: zoom + info toggle */}
        <div className="gnome-iv-toolbar-right">
          <div className="gnome-iv-pill">
            <button className="gnome-iv-pill-btn" onClick={zoomOut} title="Zoom out (-)">
              <img src={getActionIcon('zoom-out-symbolic')} alt="Zoom out" className="gnome-iv-icon" />
            </button>
            <button className="gnome-iv-pill-btn gnome-iv-zoom-label" onClick={zoomReset} title="Reset zoom (0)">
              {Math.round(zoom * 100)}%
            </button>
            <button className="gnome-iv-pill-btn" onClick={zoomIn} title="Zoom in (+)">
              <img src={getActionIcon('zoom-in-symbolic')} alt="Zoom in" className="gnome-iv-icon" />
            </button>
          </div>
          <button
            className={`gnome-iv-pill gnome-iv-pill-btn gnome-iv-info-btn ${showProps ? 'active' : ''}`}
            onClick={() => setShowProps(!showProps)}
            title="Properties"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="5" r="1.2"/>
              <rect x="7" y="7" width="2" height="5" rx="0.5"/>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Image counter ────────────────────────────────────────────── */}
      {siblings.length > 1 && currentIdx >= 0 && (
        <div className="gnome-iv-counter">
          {currentIdx + 1} / {siblings.length}
        </div>
      )}
    </div>
  );
}

function fmtSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'kB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return iso;
  }
}
