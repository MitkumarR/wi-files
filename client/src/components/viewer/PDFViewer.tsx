interface Props {
  streamUrl: string;
  fileName: string;
  filePath: string;
}

/**
 * PDFViewer — uses the browser's built-in PDF renderer via <embed>.
 * No external library needed. Works in Chrome, Firefox, Edge, and Safari.
 */
export default function PDFViewer({ streamUrl, fileName }: Props) {
  return (
    <embed
      src={streamUrl}
      type="application/pdf"
      className="viewer-pdf"
      title={fileName}
    />
  );
}
