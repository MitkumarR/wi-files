import { useState, useEffect } from 'react';

interface Props {
  streamUrl: string;
  fileName: string;
  filePath: string;
}

const MAX_SIZE = 1 * 1024 * 1024; // 1 MB — warn user for very large text files

export default function TextViewer({ streamUrl, filePath }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wrapped, setWrapped] = useState(true);

  const ext = filePath.split('.').pop()?.toLowerCase() || 'txt';

  useEffect(() => {
    setContent(null);
    setError(null);
    setLoading(true);

    fetch(streamUrl)
      .then(res => {
        const len = Number(res.headers.get('content-length') || 0);
        if (len > MAX_SIZE) {
          throw new Error(`File is too large to preview (${(len / 1024 / 1024).toFixed(1)} MB). Please download it.`);
        }
        return res.text();
      })
      .then(text => setContent(text))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [streamUrl]);

  if (loading) {
    return (
      <div className="viewer-text-loading">
        <div className="viewer-skeleton-spinner" />
        <span>Loading file…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viewer-unsupported">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="viewer-text-container">
      <div className="viewer-text-toolbar">
        <span className="viewer-text-lang">{ext.toUpperCase()}</span>
        <label className="viewer-text-wrap-toggle" title="Toggle word wrap">
          <input
            type="checkbox"
            checked={wrapped}
            onChange={e => setWrapped(e.target.checked)}
          />
          Word Wrap
        </label>
        <span className="viewer-text-lines">{content?.split('\n').length} lines</span>
      </div>
      <pre className={`viewer-text-pre ${wrapped ? 'wrapped' : ''}`}>
        <code>{content}</code>
      </pre>
    </div>
  );
}
