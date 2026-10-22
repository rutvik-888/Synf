import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Link2, X, Image as ImageIcon, Video, AlertCircle, Check, Loader2, FileVideo, FileImage, Plus } from 'lucide-react';

export type MediaKind = 'image' | 'video';

export interface MediaItem {
  url: string;
  type: MediaKind;
  source_type: 'upload' | 'url' | 'embed';
  alt?: string | null;
  caption?: string | null;
  poster_url?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  original_filename?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface MediaUploaderProps {
  /** Single value for cover/poster fields, or the current list for galleries. */
  value: MediaItem | MediaItem[] | null;
  /** Called whenever the media changes (for single mode: the item or null; for multi: the full array). */
  onChange: (value: MediaItem | MediaItem[] | null) => void;
  /** Whether multiple files are allowed. */
  multiple?: boolean;
  /** Which media kinds are accepted. */
  accept?: MediaKind[];
  /** Storage bucket to upload to. */
  bucket?: string;
  /** Path prefix inside the bucket. */
  pathPrefix?: string;
  /** Max file size in MB per file. */
  maxFileSizeMB?: number;
  /** Label for the drop zone. */
  label?: string;
  /** Aspect ratio hint for preview (e.g. '3/4', '16/9'). */
  aspectRatio?: string;
  /** Whether to show the URL input tab. Default true. */
  allowUrl?: boolean;
  /** Whether to show alt/caption fields. Default false (for single fields). */
  showMetadata?: boolean;
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'];
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'm4v'];
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

interface PendingUpload {
  id: string;
  file: File;
  progress: number;
  state: UploadState;
  error: string | null;
  resultUrl: string | null;
  kind: MediaKind;
}

function detectKind(file: File): MediaKind {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'image';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTS.includes(ext) ? 'video' : 'image';
}

function detectUrlKind(url: string): MediaKind | 'embed' | null {
  const lower = url.toLowerCase();
  // Embeds
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) return 'embed';
  const ext = lower.split('?')[0].split('.').pop() || '';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  return null;
}

function normalizeEmbed(url: string): { url: string; provider: string } | null {
  const lower = url.toLowerCase();
  if (lower.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
    return { url: `https://www.youtube.com/embed/${id}`, provider: 'YouTube' };
  }
  if (lower.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v');
    return { url: `https://www.youtube.com/embed/${id}`, provider: 'YouTube' };
  }
  if (lower.includes('youtube.com/embed/')) return { url, provider: 'YouTube' };
  if (lower.includes('vimeo.com/')) {
    const id = url.split('vimeo.com/')[1]?.split(/[?&]/)[0];
    return { url: `https://player.vimeo.com/video/${id}`, provider: 'Vimeo' };
  }
  return null;
}

function validateUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'Only HTTP/HTTPS URLs are allowed.';
    return null;
  } catch {
    return 'Invalid URL.';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUploader({
  value, onChange, multiple = false, accept = ['image', 'video'],
  bucket = 'event-media', pathPrefix = 'uploads', maxFileSizeMB = 50,
  label, aspectRatio, allowUrl = true, showMetadata = false,
}: MediaUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [urlKind, setUrlKind] = useState<MediaKind>(accept[0] || 'image');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: MediaItem[] = multiple
    ? (Array.isArray(value) ? value : [])
    : value && !Array.isArray(value) ? [value] : [];

  const acceptStr = accept.map(a => a === 'image' ? 'image/*' : 'video/*').join(',');

  const updateValue = useCallback((newItems: MediaItem[]) => {
    if (multiple) onChange(newItems);
    else onChange(newItems[0] || null);
  }, [multiple, onChange]);

  const uploadFile = useCallback(async (file: File): Promise<MediaItem | null> => {
    const kind = detectKind(file);
    if (!accept.includes(kind)) return null;
    if (file.size > maxFileSizeMB * 1024 * 1024) return null;

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const path = `${pathPrefix}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);

    // Try to get image dimensions
    let width: number | null = null;
    let height: number | null = null;
    if (kind === 'image' && pub.publicUrl) {
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => rej(new Error('load fail'));
          im.src = pub.publicUrl;
        });
        width = img.naturalWidth;
        height = img.naturalHeight;
      } catch { /* ignore */ }
    }

    return {
      url: pub.publicUrl,
      type: kind,
      source_type: 'upload',
      mime_type: file.type || null,
      file_size: file.size,
      original_filename: file.name,
      width, height,
    };
  }, [accept, bucket, pathPrefix, maxFileSizeMB]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const pending: PendingUpload[] = fileArr.map(f => ({
      id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f, progress: 0, state: 'uploading' as UploadState,
      error: null, resultUrl: null, kind: detectKind(f),
    }));
    setUploads(prev => [...prev, ...pending]);

    const newItems: MediaItem[] = [];
    for (const p of pending) {
      try {
        if (!accept.includes(p.kind)) {
          throw new Error(`${p.file.name}: ${p.kind} files not accepted here.`);
        }
        if (p.file.size > maxFileSizeMB * 1024 * 1024) {
          throw new Error(`${p.file.name}: exceeds ${maxFileSizeMB} MB limit.`);
        }
        const item = await uploadFile(p.file);
        if (item) {
          newItems.push(item);
          setUploads(prev => prev.map(u => u.id === p.id ? { ...u, state: 'done', progress: 100, resultUrl: item.url } : u));
        }
      } catch (err) {
        setUploads(prev => prev.map(u => u.id === p.id ? { ...u, state: 'error', error: (err as Error).message } : u));
      }
    }
    if (newItems.length > 0) {
      updateValue([...items, ...newItems]);
    }
    // Clear completed uploads after a delay
    setTimeout(() => setUploads(prev => prev.filter(u => u.state === 'uploading')), 2000);
  }, [accept, maxFileSizeMB, uploadFile, items, updateValue]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  function addUrl() {
    setUrlError(null);
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const vErr = validateUrl(trimmed);
    if (vErr) { setUrlError(vErr); return; }

    const detected = detectUrlKind(trimmed);
    if (detected === 'embed') {
      const embed = normalizeEmbed(trimmed);
      if (!embed) { setUrlError('Could not parse embed URL.'); return; }
      const item: MediaItem = {
        url: embed.url, type: 'video', source_type: 'embed',
        original_filename: `${embed.provider} embed`,
      };
      updateValue([...items, item]);
      setUrlInput('');
      return;
    }

    const kind = detected || urlKind;
    if (!accept.includes(kind)) {
      setUrlError(`${kind} URLs not accepted here.`);
      return;
    }
    const item: MediaItem = {
      url: trimmed, type: kind, source_type: 'url',
      original_filename: trimmed.split('/').pop()?.split('?')[0] || null,
    };
    if (multiple) updateValue([...items, item]);
    else updateValue([item]);
    setUrlInput('');
  }

  function removeItem(idx: number) {
    updateValue(items.filter((_, i) => i !== idx));
  }

  function updateItemMeta(idx: number, patch: Partial<MediaItem>) {
    updateValue(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const arr = [...items];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    updateValue(arr);
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      {allowUrl && (
        <div className="flex gap-1 rounded-lg border border-white/5 bg-ink-900/50 p-1">
          <button onClick={() => setTab('upload')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${tab === 'upload' ? 'bg-synf-500/20 text-synf-300' : 'text-white/50 hover:text-white'}`}>
            <Upload size={12} /> Upload
          </button>
          <button onClick={() => setTab('url')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${tab === 'url' ? 'bg-synf-500/20 text-synf-300' : 'text-white/50 hover:text-white'}`}>
            <Link2 size={12} /> Add by URL
          </button>
        </div>
      )}

      {/* Upload tab */}
      {tab === 'upload' && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all ${dragging ? 'border-synf-500 bg-synf-500/10' : 'border-white/10 hover:border-white/20'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptStr}
            multiple={multiple}
            className="hidden"
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 text-sm text-white/50 transition hover:text-white/70"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5">
              <Upload size={20} className={dragging ? 'text-synf-400' : 'text-white/40'} />
            </div>
            <span>{label || `Drag ${multiple ? 'files' : 'a file'} here or click to browse`}</span>
            <span className="text-[10px] text-ink-500">
              {accept.map(a => a === 'image' ? 'JPG, PNG, WebP, GIF' : 'MP4, WebM').join(' · ')} · max {maxFileSizeMB} MB
            </span>
          </button>
        </div>
      )}

      {/* URL tab */}
      {tab === 'url' && allowUrl && (
        <div className="space-y-2 rounded-xl border border-white/10 p-4">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="https://example.com/image.jpg or video.mp4"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
            />
            <button onClick={addUrl} className="btn-primary px-4 py-2 text-xs"><Plus size={14} /> Add</button>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span>Type:</span>
            <select className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-xs text-white/70" value={urlKind} onChange={e => setUrlKind(e.target.value as MediaKind)}>
              {accept.includes('image') && <option value="image">Image</option>}
              {accept.includes('video') && <option value="video">Video / Embed</option>}
            </select>
            <span className="text-ink-600">— YouTube & Vimeo embeds supported</span>
          </div>
          {urlError && <p className="flex items-center gap-1.5 text-xs text-synf-400"><AlertCircle size={12} /> {urlError}</p>}
        </div>
      )}

      {/* Upload progress */}
      {uploads.filter(u => u.state !== 'done').length > 0 && (
        <div className="space-y-1.5">
          {uploads.map(u => (
            <div key={u.id} className="flex items-center gap-2 rounded-lg border border-white/5 p-2 text-xs">
              {u.kind === 'video' ? <FileVideo size={14} className="text-synf-400" /> : <FileImage size={14} className="text-acid-400" />}
              <span className="flex-1 truncate text-white/60">{u.file.name}</span>
              <span className="text-ink-500">{formatBytes(u.file.size)}</span>
              {u.state === 'uploading' && <Loader2 size={12} className="animate-spin text-synf-400" />}
              {u.state === 'error' && <span className="flex items-center gap-1 text-synf-400"><AlertCircle size={12} /> {u.error}</span>}
              {u.state === 'done' && <Check size={12} className="text-acid-400" />}
            </div>
          ))}
        </div>
      )}

      {/* Previews */}
      {items.length > 0 && (
        <div className={multiple ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : 'space-y-2'}>
          {items.map((item, idx) => (
            <MediaPreview
              key={idx}
              item={item}
              aspectRatio={aspectRatio}
              multiple={multiple}
              showMetadata={showMetadata}
              onRemove={() => removeItem(idx)}
              onMove={dir => moveItem(idx, dir)}
              onMeta={patch => updateItemMeta(idx, patch)}
              canMoveLeft={idx > 0}
              canMoveRight={idx < items.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaPreview({ item, aspectRatio, multiple, showMetadata, onRemove, onMove, onMeta, canMoveLeft, canMoveRight }: {
  item: MediaItem;
  aspectRatio?: string;
  multiple?: boolean;
  showMetadata?: boolean;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onMeta: (patch: Partial<MediaItem>) => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}) {
  const isEmbed = item.source_type === 'embed';
  const isVideo = item.type === 'video';

  return (
    <div className="group relative overflow-hidden rounded-lg border border-white/10 bg-ink-900/50">
      <div className="relative" style={{ aspectRatio: aspectRatio || '16/9' }}>
        {isVideo && !isEmbed ? (
          <video src={item.url} className="h-full w-full object-cover" poster={item.poster_url || undefined} muted preload="metadata" />
        ) : isVideo && isEmbed ? (
          <iframe src={item.url} className="h-full w-full" title={item.alt || 'Embedded video'} sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen />
        ) : (
          <img src={item.url} alt={item.alt || ''} className="h-full w-full object-cover" loading="lazy" />
        )}
        {/* Type badge */}
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-ink-950/80 px-2 py-0.5 text-[10px] font-bold uppercase backdrop-blur-sm">
          {isVideo ? <Video size={10} className="text-synf-400" /> : <ImageIcon size={10} className="text-acid-400" />}
          <span className="text-white/70">{isEmbed ? 'Embed' : isVideo ? 'Video' : 'Image'}</span>
        </span>
        {/* Remove button */}
        <button onClick={onRemove} className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink-950/80 text-white/60 opacity-0 transition group-hover:opacity-100 hover:text-synf-400" aria-label="Remove">
          <X size={12} />
        </button>
        {/* Reorder buttons */}
        {multiple && (
          <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button onClick={() => onMove(-1)} disabled={!canMoveLeft} className="grid h-6 w-6 place-items-center rounded bg-ink-950/80 text-white/60 disabled:opacity-30 hover:text-white" aria-label="Move left">←</button>
            <button onClick={() => onMove(1)} disabled={!canMoveRight} className="grid h-6 w-6 place-items-center rounded bg-ink-950/80 text-white/60 disabled:opacity-30 hover:text-white" aria-label="Move right">→</button>
          </div>
        )}
      </div>
      {/* Metadata */}
      {showMetadata && (
        <div className="space-y-1.5 p-2">
          <input className="input-xs w-full" placeholder="Caption" value={item.caption || ''} onChange={e => onMeta({ caption: e.target.value })} />
          <input className="input-xs w-full" placeholder="Alt text" value={item.alt || ''} onChange={e => onMeta({ alt: e.target.value })} />
          {item.original_filename && <p className="truncate text-[10px] text-ink-500">{item.original_filename}</p>}
        </div>
      )}
      {!showMetadata && item.original_filename && (
        <p className="truncate px-2 py-1 text-[10px] text-ink-500">{item.original_filename}</p>
      )}
    </div>
  );
}


