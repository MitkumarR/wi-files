import { useSearchParams, useNavigate } from 'react-router-dom';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const VIDEO_EXTS = ['mp4', 'mkv', 'webm', 'avi', 'mov'];

export default function FileViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filePath = searchParams.get('path') || '';
  const token = localStorage.getItem('jwt_token') || '';

  const fileName = filePath.split('/').pop() || 'Unknown';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isImage = IMAGE_EXTS.includes(ext);
  const isVideo = VIDEO_EXTS.includes(ext);

  const streamUrl = `/api/download?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;

  // Go back to the parent folder
  const goBack = () => {
    const parentDir = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
    navigate(`/files?path=${encodeURIComponent(parentDir)}`);
  };

  if (!filePath) {
    return (
      <div className="viewer-container">
        <div className="nautilus-empty">No file selected</div>
      </div>
    );
  }

  return (
    <div className="viewer-container">
      {/* Header */}
      <div className="viewer-header">
        <button className="header-btn" onClick={goBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.354 3.354L9.646 2.646 4.293 8l5.353 5.354.708-.708L5.707 8z"/>
          </svg>
        </button>
        <span className="viewer-filename">{fileName}</span>
        <a href={streamUrl} download={fileName} className="header-btn" title="Download" style={{ textDecoration: 'none', color: 'inherit' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1v10l3-3 .7.7L8 12.4 4.3 8.7 5 8l3 3V1zM2 13v2h12v-2H2z"/>
          </svg>
        </a>
      </div>

      {/* Content */}
      <div className="viewer-content">
        {isImage && (
          <img
            src={streamUrl}
            alt={fileName}
            className="viewer-image"
          />
        )}
        {isVideo && (
          <video
            controls
            autoPlay
            className="viewer-video"
            src={streamUrl}
          >
            Your browser does not support HTML5 video.
          </video>
        )}
        {!isImage && !isVideo && (
          <div className="nautilus-empty">
            <p>Cannot preview this file type.</p>
            <a href={streamUrl} download={fileName} className="btn" style={{ marginTop: '1rem' }}>
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
