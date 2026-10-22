import { useRef, useState } from 'react';
import { Upload, X, Loader2, Link2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) return 'Only JPG, PNG, WebP, or GIF images are supported';
  if (file.size > MAX_SIZE) return 'Portrait must be 5 MB or smaller';
  return null;
}

function parseHttpUrl(value: string): URL | null {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u;
  } catch {
    return null;
  }
}

export function PortraitUploader({ name, url, canEdit, onUploaded, onRemoved }: {
  name: string;
  url: string | null;
  canEdit: boolean;
  onUploaded: (publicUrl: string) => Promise<boolean>;
  onRemoved: () => Promise<boolean>;
}) {
  const [preview, setPreview] = useState(url);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<'drop' | 'url'>('drop');
  const [urlValue, setUrlValue] = useState('');
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  async function handleFile(file: File) {
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError('');
    setSaved(false);
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    const path = `portraits/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from('site-assets').upload(path, file, { upsert: false });
    if (upErr) {
      setError(upErr.message.includes('exceeded') || upErr.message.includes('size') ? 'File is too large or storage rejected the upload' : 'Upload failed. Please retry.');
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from('site-assets').getPublicUrl(path);
    if (!pub?.publicUrl) {
      setError('Upload succeeded but the image could not be linked. Please retry.');
      setUploading(false);
      return;
    }
    const ok = await onUploaded(pub.publicUrl);
    if (ok) {
      setPreview(pub.publicUrl);
      setBroken(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError('Portrait uploaded but could not be saved to the profile. Press retry.');
    }
    setUploading(false);
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = parseHttpUrl(urlValue);
    if (!u) { setError('Enter a valid HTTP or HTTPS image URL'); return; }
    setError('');
    setSaved(false);
    const ok = await onUploaded(u.toString());
    if (ok) {
      setPreview(u.toString());
      setBroken(false);
      setMode('drop');
      setUrlValue('');
    }
  }

  async function handleRemove() {
    setError('');
    const ok = await onRemoved();
    if (ok) { setPreview(null); setBroken(false); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploading || !canEdit) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative shrink-0">
          {preview && !broken ? (
            <img
              src={preview}
              alt={`Portrait of ${name}`}
              onError={() => setBroken(true)}
              className="h-24 w-24 rounded-2xl border-2 border-synf-500/30 object-cover"
            />
          ) : preview && broken ? (
            <div className="relative grid h-24 w-24 place-items-center rounded-2xl border-2 border-gold-400/40 bg-gold-400/5 font-display text-2xl font-bold text-gold-400">
              {initials}
            </div>
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-2xl border-2 border-synf-500/30 bg-synf-500/10 font-display text-2xl font-bold text-synf-300">
              {initials}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/60">
              <Loader2 size={20} className="animate-spin text-synf-300" />
            </div>
          )}
        </div>

        {canEdit && (
          <div className="min-w-0 flex-1">
            {mode === 'drop' ? (
              <div
                role="button"
                tabIndex={0}
                aria-label="Drag a portrait here or browse files"
                onClick={() => !uploading && fileRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`grid min-h-[80px] cursor-pointer place-items-center rounded-xl border-2 border-dashed p-3 text-center transition ${
                  dragOver ? 'border-synf-400 bg-synf-500/10' : 'border-white/15 bg-ink-900/50 hover:border-synf-500/50'
                } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className="text-xs text-white/60">
                  <Upload size={16} className="mx-auto mb-1 text-synf-400" />
                  Drag a portrait here or <span className="font-semibold text-synf-300 underline">browse files</span>
                  <div className="mt-1 text-[10px] text-ink-500">JPG, PNG, WebP, or GIF up to 5 MB</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUrlSubmit} className="space-y-2">
                <label className="label" htmlFor="portrait-url">Image URL</label>
                <div className="flex gap-2">
                  <input
                    id="portrait-url"
                    className="input flex-1"
                    type="text"
                    inputMode="url"
                    placeholder="https://example.com/portrait.jpg"
                    value={urlValue}
                    onChange={e => setUrlValue(e.target.value)}
                  />
                  <button type="submit" className="btn-primary px-3">Preview</button>
                </div>
                <p className="text-[10px] text-ink-500">Only HTTP/HTTPS URLs. The image preview is validated before saving.</p>
              </form>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <button onClick={() => { setMode(m => m === 'url' ? 'drop' : 'url'); setError(''); }} className="flex items-center gap-1 text-synf-300 hover:text-synf-200" type="button">
                <Link2 size={12} /> {mode === 'url' ? 'Use file upload' : 'Use image URL'}
              </button>
              {preview && !uploading && (
                <>
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-white/50 hover:text-white" type="button">
                    <RefreshCw size={12} /> Replace
                  </button>
                  <button onClick={handleRemove} className="flex items-center gap-1 text-white/50 hover:text-red-400" type="button">
                    <X size={12} /> Remove
                  </button>
                </>
              )}
              {saved && <span className="text-acid-400">Portrait updated</span>}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-2 text-xs text-synf-300">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}
      {broken && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-gold-400/30 bg-gold-400/10 p-2 text-xs text-gold-300">
          <AlertCircle size={14} className="shrink-0" /> The image could not be loaded from its source. Showing initials instead. Replace or remove the portrait to fix this.
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}
