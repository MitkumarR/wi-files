/**
 * YaruIcon — Maps file extensions to Ubuntu Yaru icon PNGs.
 *
 * Icon sources (relative to this file):
 *   Places  → ./icons/Yaru-blue/48x48/places/   (folders)
 *   Places  → ./icons/Yaru/48x48/places/         (home, desktop, trash …)
 *   Mimes   → ./icons/Yaru/48x48/mimetypes/      (file-type icons)
 *   Devices → ./icons/Yaru/scalable/devices/      (symbolic SVGs for drives)
 *
 * Vite resolves `new URL(…, import.meta.url).href` at build time,
 * so we use a helper that constructs the path string dynamically.
 */

// ── Folder icons (Yaru-blue for the blue folder look) ────────────────
const PLACES_BLUE = './icons/Yaru-blue/48x48/places/';
const PLACES      = './icons/Yaru/48x48/places/';
const EMBLEMS     = './icons/Yaru/48x48/emblems/';
const MIMETYPES   = './icons/Yaru/48x48/mimetypes/';
const DEVICES_SVG = './icons/Yaru/scalable/devices/';
const PLACES_SCALABLE = './icons/Yaru/scalable/places/';
const EMBLEMS_SCALABLE = './icons/Yaru/scalable/emblems/';
const ACTIONS_SCALABLE = './icons/Yaru/scalable/actions/';

/* Vite needs static analysis for glob imports.
   We use import.meta.glob to let Vite discover every icon at build time. */
const bluePlace = import.meta.glob('./icons/Yaru-blue/48x48/places/*.png',  { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const place     = import.meta.glob('./icons/Yaru/48x48/places/*.png',       { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const emblem    = import.meta.glob('./icons/Yaru/48x48/emblems/*.png',      { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const mime      = import.meta.glob('./icons/Yaru/48x48/mimetypes/*.png',    { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const deviceSvg = import.meta.glob('./icons/Yaru/scalable/devices/*.svg',   { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const placeSvg  = import.meta.glob('./icons/Yaru/scalable/places/*.svg',    { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const emblemSvg = import.meta.glob('./icons/Yaru/scalable/emblems/*.svg',   { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const actionSvg = import.meta.glob('./icons/Yaru/scalable/actions/*.svg',   { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

// Helper: resolve an asset from one of the glob maps.
function resolve(map: Record<string, string>, dir: string, file: string): string | undefined {
  return map[`${dir}${file}`];
}

// ── Public API ───────────────────────────────────────────────────────

/** Get the URL for a folder icon.  Supports special XDG folder names. */
export function getFolderIcon(name: string): string {
  const lower = name.toLowerCase();
  const specialFolders: Record<string, string> = {
    documents: 'folder-documents.png',
    downloads: 'folder-download.png',
    music:     'folder-music.png',
    pictures:  'folder-pictures.png',
    videos:    'folder-videos.png',
    templates: 'folder-templates.png',
    public:    'folder-publicshare.png',
    desktop:   'folder-open.png',
    network:   'network-workgroup.png',
    trash:     'user-trash.png',
    recent:    'folder-recent.png',
  };

  const match = specialFolders[lower];
  if (match) {
    return resolve(bluePlace, PLACES_BLUE, match) ?? resolve(place, PLACES, match) ?? getGenericFolderIcon();
  }
  return getGenericFolderIcon();
}

export function getGenericFolderIcon(): string {
  return resolve(bluePlace, PLACES_BLUE, 'folder.png') ?? '';
}

export function getHomeIcon(): string {
  return resolve(bluePlace, PLACES_BLUE, 'user-home.png') ?? resolve(place, PLACES, 'user-home.png') ?? '';
}

export function getStarredIcon(): string {
  return resolve(emblem, EMBLEMS, 'emblem-favorite.png') ?? '';
}

/** Get SVG sidebar icons from the scalable directory */
export function getSidebarIcon(name: string): string {
  const lower = name.toLowerCase();
  
  if (lower === 'starred') {
    return resolve(emblemSvg, EMBLEMS_SCALABLE, 'emblem-favorite-symbolic.svg') ?? '';
  }
  
  if (lower === 'logout') {
    return resolve(actionSvg, ACTIONS_SCALABLE, 'system-log-out-symbolic.svg') ?? '';
  }

  if (lower === 'menu') {
    return resolve(actionSvg, ACTIONS_SCALABLE, 'open-menu-symbolic.svg') ?? '';
  }

  if (lower === 'mounts') {
    return resolve(deviceSvg, DEVICES_SVG, 'drive-harddisk-system-symbolic.svg') ?? '';
  }

  const map: Record<string, string> = {
    home: 'user-home-symbolic.svg',
    documents: 'folder-documents-symbolic.svg',
    downloads: 'folder-download-symbolic.svg',
    music: 'folder-music-symbolic.svg',
    pictures: 'folder-pictures-symbolic.svg',
    videos: 'folder-videos-symbolic.svg',
    network: 'network-workgroup-symbolic.svg',
    trash: 'user-trash-symbolic.svg',
  };

  const file = map[lower];
  if (file) {
    return resolve(placeSvg, PLACES_SCALABLE, file) ?? '';
  }
  
  // Generic fallback
  return resolve(placeSvg, PLACES_SCALABLE, 'folder-symbolic.svg') ?? '';
}

export function getDesktopIcon(): string {
  return resolve(bluePlace, PLACES_BLUE, 'user-desktop.png') ?? resolve(place, PLACES, 'user-desktop.png') ?? '';
}

export function getDriveIcon(): string {
  return resolve(deviceSvg, DEVICES_SVG, 'drive-harddisk-symbolic.svg') ?? '';
}

export function getDriveUsbIcon(): string {
  return resolve(deviceSvg, DEVICES_SVG, 'drive-harddisk-usb-symbolic.svg') ?? '';
}

export function getDriveSystemIcon(): string {
  return resolve(deviceSvg, DEVICES_SVG, 'drive-harddisk-system-symbolic.svg') ?? '';
}

/** Map a file extension to the right Yaru mimetype icon URL. */
export function getFileIcon(filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';

  // Extension → mimetype PNG filename
  const extMap: Record<string, string> = {
    // ── Code / text ──
    'go':    'text-x-go.png',
    'py':    'text-x-python.png',
    'js':    'text-x-javascript.png',
    'mjs':   'text-x-javascript.png',
    'cjs':   'text-x-javascript.png',
    'jsx':   'text-x-javascript.png',
    'ts':    'text-x-typescript.png',
    'tsx':   'text-x-typescript.png',
    'rs':    'text-rust.png',
    'c':     'text-x-c.png',
    'h':     'text-x-chdr.png',
    'cpp':   'text-x-cpp.png',
    'cc':    'text-x-cpp.png',
    'hpp':   'text-x-c++hdr.png',
    'java':  'text-x-java.png',
    'kt':    'text-x-kotlin.png',
    'cs':    'text-x-csharp.png',
    'rb':    'text-x-ruby.png',
    'php':   'text-x-php.png',
    'lua':   'text-x-lua.png',
    'dart':  'text-x-dart.png',
    'scala': 'text-x-scala.png',
    'r':     'text-x-r.png',
    'v':     'text-x-v.png',
    'vala':  'text-x-vala.png',
    'nim':   'text-x-nim.png',
    'hs':    'text-x-haskell.png',
    'f90':   'text-x-fortran.png',
    'f':     'text-x-fortran.png',
    'pl':    'application-x-perl.png',
    'tex':   'text-x-tex.png',
    'cobol': 'text-x-cobol.png',

    // ── Shell / scripts ──
    'sh':    'application-x-shellscript.png',
    'bash':  'application-x-shellscript.png',
    'zsh':   'application-x-shellscript.png',
    'fish':  'application-x-shellscript.png',

    // ── Markup / data ──
    'html':  'text-html.png',
    'htm':   'text-html.png',
    'css':   'text-css.png',
    'scss':  'text-x-scss.png',
    'sass':  'text-x-sass.png',
    'less':  'text-less.png',
    'xml':   'text-xml.png',
    'json':  'application-json.png',
    'yaml':  'application-yaml.png',
    'yml':   'application-yaml.png',
    'toml':  'application-toml.png',
    'md':    'text-markdown.png',
    'rst':   'text-x-generic.png',
    'csv':   'text-csv.png',
    'sql':   'text-x-sql.png',
    'txt':   'text-x-generic.png',
    'log':   'text-x-log.png',

    // ── Config / build ──
    'makefile':    'text-x-makefile.png',
    'cmake':       'text-x-cmake.png',
    'dockerfile':  'text-dockerfile.png',
    'mod':         'text-x-go.png',
    'sum':         'text-x-generic.png',

    // ── Archives ──
    'zip':   'application-x-zip.png',
    'gz':    'application-x-gzip.png',
    'tar':   'application-x-gzip.png',
    'bz2':   'application-x-gzip.png',
    'xz':    'application-x-gzip.png',
    'rar':   'application-x-rar.png',
    '7z':    'application-x-7z-compressed.png',
    'deb':   'application-vnd.debian.binary-package.png',
    'rpm':   'package-x-generic.png',

    // ── Documents ──
    'pdf':   'application-pdf.png',
    'doc':   'application-vnd.ms-word.png',
    'docx':  'application-vnd.ms-word.png',
    'odt':   'x-office-document.png',
    'rtf':   'text-richtext.png',
    'ppt':   'application-vnd.ms-powerpoint.png',
    'pptx':  'application-vnd.ms-powerpoint.png',
    'odp':   'x-office-presentation.png',
    'xls':   'application-vnd.ms-excel.png',
    'xlsx':  'application-vnd.ms-excel.png',
    'ods':   'x-office-spreadsheet.png',

    // ── Images (these will show thumbnails, but we still need a fallback) ──
    'svg':   'image-svg+xml.png',

    // ── Audio ──
    'mp3':   'audio-x-mpeg.png',
    'flac':  'audio-x-flac.png',
    'ogg':   'audio-x-vorbis+ogg.png',
    'wav':   'audio-x-wav.png',
    'wma':   'audio-x-ms-wma.png',
    'aac':   'audio-x-generic.png',
    'm4a':   'audio-x-generic.png',

    // ── Video ──
    'mp4':   'video-x-generic.png',
    'mkv':   'video-x-generic.png',
    'avi':   'video-x-generic.png',
    'webm':  'video-x-generic.png',
    'mov':   'video-x-generic.png',
    'flv':   'video-x-generic.png',

    // ── Images (fallback) ──
    'png':   'image-x-generic.png',
    'jpg':   'image-x-generic.png',
    'jpeg':  'image-x-generic.png',
    'gif':   'image-x-generic.png',
    'bmp':   'image-x-generic.png',
    'webp':  'image-x-generic.png',
    'ico':   'image-x-generic.png',
    'tiff':  'image-x-generic.png',

    // ── Database ──
    'db':    'application-x-sqlite3.png',
    'sqlite': 'application-x-sqlite3.png',
    'sqlite3': 'application-x-sqlite3.png',

    // ── Executables / binary ──
    'exe':   'application-x-ms-dos-executable.png',
    'bin':   'application-x-executable.png',
    'appimage': 'application-x-executable.png',
    'snap':  'application-vnd.snap.png',
    'flatpak': 'application-vnd.flatpak.png',

    // ── Fonts ──
    'ttf':   'font-x-generic.png',
    'otf':   'font-x-generic.png',
    'woff':  'font-x-generic.png',
    'woff2': 'font-x-generic.png',

    // ── Misc ──
    'iso':   'application-x-cd-image.png',
    'torrent': 'application-x-bittorrent.png',
    'desktop': 'application-x-desktop.png',
  };

  const iconFile = extMap[ext];
  if (iconFile) {
    return resolve(mime, MIMETYPES, iconFile) ?? getGenericFileIcon();
  }

  // Filename-based matches (no extension)
  const nameMap: Record<string, string> = {
    'makefile':   'text-x-makefile.png',
    'dockerfile': 'text-dockerfile.png',
    'readme':     'text-x-readme.png',
    'readme.md':  'text-x-readme.png',
    'license':    'text-x-copying.png',
    'copying':    'text-x-copying.png',
    'authors':    'text-x-authors.png',
    'changelog':  'text-x-log.png',
    'install':    'text-x-install.png',
  };

  const nameLower = filename.toLowerCase();
  const nameIcon = nameMap[nameLower];
  if (nameIcon) {
    return resolve(mime, MIMETYPES, nameIcon) ?? getGenericFileIcon();
  }

  return getGenericFileIcon();
}

export function getGenericFileIcon(): string {
  return resolve(mime, MIMETYPES, 'text-x-generic.png') ?? '';
}
