interface Props {
  streamUrl: string;
  fileName: string;
  filePath: string;
}

export default function ImageViewer({ streamUrl, fileName }: Props) {
  return (
    <img
      src={streamUrl}
      alt={fileName}
      className="viewer-image"
      draggable={false}
    />
  );
}
