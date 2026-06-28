import { useState, useEffect, useRef } from 'react';

interface Props {
  streamUrl: string;
  fileName: string;
  filePath: string;
  onNavigate?: (path: string) => void;
}

export default function VideoViewer({ streamUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── State ─────────────────────────────────────────────────────────────
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          break;
        case 'ArrowLeft':
          v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case 'ArrowRight':
          v.currentTime = Math.min(v.duration, v.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          setVolume(v.volume);
          break;
        case 'ArrowDown':
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          setVolume(v.volume);
          break;
        case 'm':
          v.muted = !v.muted;
          setIsMuted(v.muted);
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
      resetControlsTimer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  // ── Auto-hide controls ────────────────────────────────────────────────
  const resetControlsTimer = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseMove = () => resetControlsTimer();

  // ── Video event handlers ──────────────────────────────────────────────
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handlePlay = () => { setIsPlaying(true); resetControlsTimer(); };
  const handlePause = () => { setIsPlaying(false); setShowControls(true); };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const seekBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const seekForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`gnome-vv ${showControls ? '' : 'gnome-vv--hide-cursor'}`}
      onMouseMove={handleMouseMove}
    >
      {/* ── Video Canvas ─────────────────────────────────────────────── */}
      <div className="gnome-vv-canvas" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={streamUrl}
          autoPlay
          className="gnome-vv-video"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
        />
      </div>

      {/* ── Bottom Controls Overlay ──────────────────────────────────── */}
      <div className={`gnome-vv-controls ${showControls ? 'visible' : ''}`}>
        {/* Progress bar */}
        <div className="gnome-vv-progress">
          <span className="gnome-vv-time">{fmtTime(currentTime)}</span>
          <input
            type="range"
            className="gnome-vv-seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            style={{
              background: `linear-gradient(to right, #3584e4 ${(duration > 0 ? currentTime / duration : 0) * 100}%, rgba(255, 255, 255, 0.2) ${(duration > 0 ? currentTime / duration : 0) * 100}%)`
            }}
          />
          <span className="gnome-vv-time">{fmtTime(duration)}</span>
        </div>

        {/* Control buttons */}
        <div className="gnome-vv-buttons">
          <div className="gnome-vv-buttons-left">
            <div className="gnome-iv-pill">
              <button className="gnome-iv-pill-btn" onClick={seekBackward} title="Skip Backward 10s">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
                </svg>
              </button>
              <button className="gnome-iv-pill-btn" onClick={seekForward} title="Skip Forward 10s">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="gnome-vv-buttons-center">
            <div className="gnome-iv-pill">
              <button className="gnome-iv-pill-btn gnome-vv-play-btn" onClick={togglePlay} title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="3" y="2" width="4" height="12" rx="1" />
                    <rect x="9" y="2" width="4" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 2l10 6-10 6z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="gnome-vv-buttons-right">
            <div className="gnome-iv-pill gnome-vv-volume-pill">
              <input
                type="range"
                className="gnome-vv-volume"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  background: `linear-gradient(to right, #3584e4 ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.2) ${(isMuted ? 0 : volume) * 100}%)`
                }}
              />
              <button className="gnome-iv-pill-btn" onClick={toggleMute} title="Mute (M)">
                {isMuted || volume === 0 ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2L4 5.5H1v5h3L8 14V2z" />
                    <path d="M11.5 5.5l3 3m0-3l-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2L4 5.5H1v5h3L8 14V2z" />
                    <path d="M10.5 4.5c1 1 1.5 2.2 1.5 3.5s-.5 2.5-1.5 3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                    <path d="M12.5 3c1.5 1.5 2 3.2 2 5s-.5 3.5-2 5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
            
            <div className="gnome-iv-pill">
              <button className="gnome-iv-pill-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
