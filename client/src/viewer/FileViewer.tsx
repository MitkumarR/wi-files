import { Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getActionIcon } from '../yaru/YaruIcon';

// ── Lazy-loaded viewers (only downloaded when needed) ──────────────────────
const ImageViewer = lazy(() => import('./ImageViewer'));
const VideoViewer = lazy(() => import('./VideoViewer'));
const PDFViewer   = lazy(() => import('./PDFViewer'));
const TextViewer  = lazy(() => import('./TextViewer'));

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const VIDEO_EXTS = ['mp4', 'mkv', 'webm', 'avi', 'mov'];
const PDF_EXTS   = ['pdf'];
const TEXT_EXTS  = ['txt', 'md', 'csv', 'json', 'log', 'xml', 'yaml', 'yml', 'sh', 'py', 'js', 'ts', 'tsx', 'jsx', 'go', 'rs', 'cpp', 'c', 'h', 'java', 'css', 'html', 'ini', 'toml', 'env'];

function getViewer(ext: string) {
  if (IMAGE_EXTS.includes(ext)) return ImageViewer;
  if (VIDEO_EXTS.includes(ext)) return VideoViewer;
  if (PDF_EXTS.includes(ext))   return PDFViewer;
  if (TEXT_EXTS.includes(ext))  return TextViewer;
  return null;
}

function ViewerSkeleton() {
  return (
    <div className="viewer-skeleton">
      <div className="viewer-skeleton-spinner" />
      <span>Loading viewer…</span>
    </div>
  );
}

export default function FileViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const filePath  = searchParams.get('path') || '';
  const token     = localStorage.getItem('jwt_token') || '';
  const fileName  = filePath.split('/').pop() || 'Unknown';
  const ext       = fileName.split('.').pop()?.toLowerCase() || '';
  const streamUrl = `/api/download?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;

  const goBack = () => {
    const parentDir = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
    navigate(`/files?path=${encodeURIComponent(parentDir)}`);
  };

  const ViewerComponent = getViewer(ext);

  if (!filePath) {
    return (
      <div className="viewer-container">
        <div className="nautilus-empty">No file selected.</div>
      </div>
    );
  }

  return (
    <div className="viewer-container">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="viewer-header">
        <button className="header-btn" onClick={goBack} title="Back">
          <img
            src={getActionIcon('go-previous-symbolic')}
            alt="Back"
            style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)' }}
          />
        </button>

        <span className="viewer-filename">{fileName}</span>

        <a
          href={streamUrl}
          download={fileName}
          className="header-btn"
          title="Download"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1v10l3-3 .7.7L8 12.4 4.3 8.7 5 8l3 3V1zM2 13v2h12v-2H2z"/>
          </svg>
        </a>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="viewer-content">
        {ViewerComponent ? (
          <Suspense fallback={<ViewerSkeleton />}>
            <ViewerComponent streamUrl={streamUrl} fileName={fileName} filePath={filePath} />
          </Suspense>
        ) : (
          <div className="viewer-unsupported">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.4">
              <rect x="8" y="4" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M28 4v10h10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p>No preview available for <code>.{ext}</code> files.</p>
            <a href={streamUrl} download={fileName} className="viewer-download-btn">
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
