interface Props {
  streamUrl: string;
  fileName: string;
  filePath: string;
}

export default function VideoViewer({ streamUrl }: Props) {
  return (
    <video
      controls
      autoPlay
      className="viewer-video"
      src={streamUrl}
    >
      Your browser does not support HTML5 video.
    </video>
  );
}
