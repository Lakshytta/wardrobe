import { useEffect, useRef, useState } from 'react';
import { useStore, nowIso } from '../lib/store.tsx';
import { navigate } from '../lib/router.ts';
import { uuid } from '../lib/data/adapter.ts';
import { blankItem } from '../lib/data/seed.ts';
import { smarts } from '../lib/smarts/index.ts';
import { processImage } from '../lib/image/browser.ts';
import { phash, findDuplicates } from '../lib/image/phash.ts';
import { validateUpload } from '../lib/image/resize.ts';
import type { Item } from '../lib/types.ts';
import { Icon, Sheet, Thumb } from '../components/ui.tsx';

interface Pending { key: string; src: Blob; preview: string; full: Blob; thumb: Blob; item: Item; dupes: Item[] }

const LAST_CAT = 'last-category';
function lastCat() { try { return localStorage.getItem(LAST_CAT) ?? 'sarees'; } catch { return 'sarees'; } }

export default function Capture() {
  const s = useStore();
  const [category, setCategory] = useState<string>(lastCat);
  const [mode, setMode] = useState<'pick' | 'camera'>('pick');
  const [shots, setShots] = useState<{ blob: Blob; url: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [dupeIdx, setDupeIdx] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camError, setCamError] = useState<string | null>(null);

  const chooseCat = (c: string) => { setCategory(c); try { localStorage.setItem(LAST_CAT, c); } catch { /* */ } };

  const stopCamera = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    setCamError(null);
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
      stream.current = st; setMode('camera');
      setTimeout(() => { if (video.current) { video.current.srcObject = st; void video.current.play(); } }, 0);
    } catch {
      setCamError('The camera is not available. You can pick photos from your gallery instead.');
    }
  };

  const snap = async () => {
    const v = video.current; if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.92));
    setShots((x) => [...x, { blob, url: URL.createObjectURL(blob) }]);
  };

  /** compress → auto-tag → pHash → duplicate check, for a batch of photos */
  const processBatch = async (blobs: Blob[]) => {
    const errs: string[] = [];
    const out: Pending[] = [];
    const existing = s.data.items.filter((i) => i.status !== 'trashed');
    for (let n = 0; n < blobs.length; n++) {
      const b = blobs[n];
      const err = validateUpload(b);
      if (err) { errs.push(`${(b as File).name ?? `Photo ${n + 1}`}: ${err}`); continue; }
      setBusy(`Preparing photo ${n + 1} of ${blobs.length}…`);
      try {
        const p = await processImage(b);
        const tags = await smarts().tagPhoto(p.pixels, { category });
        const hash = phash(p.pixels);
        const id = uuid();
        const item = blankItem({
          id, profile_id: s.profileId, name: tags.name, category_id: category, primary_color: tags.primary_color,
          accent_colors: tags.accent_colors, palette_hex: tags.palette_hex, occasions: tags.occasions, season: tags.season,
          phash: hash, status: 'review', auto_tagged: true, created_at: nowIso(), updated_at: nowIso(),
        });
        const dupes = [...findDuplicates(hash, existing), ...findDuplicates(hash, out.map((o) => o.item))];
        out.push({ key: id, src: b, preview: URL.createObjectURL(p.thumb), full: p.full, thumb: p.thumb, item, dupes });
      } catch {
        errs.push(`${(b as File).name ?? `Photo ${n + 1}`}: this photo could not be opened. Try a JPEG or PNG.`);
      }
    }
    setErrors(errs);
    setBusy(null);
    const firstDupe = out.findIndex((o) => o.dupes.length);
    if (firstDupe >= 0) { setQueue(out); setDupeIdx(firstDupe); }
    else await save(out);
  };

  const save = async (list: Pending[]) => {
    if (!list.length) { setQueue([]); return; }
    for (let n = 0; n < list.length; n++) {
      const p = list[n];
      setBusy(`Saving photo ${n + 1} of ${list.length}…`);
      try {
        const [full, thumb] = await Promise.all([
          s.adapter.uploadImage(s.profileId, p.item.id, 'full', p.full),
          s.adapter.uploadImage(s.profileId, p.item.id, 'thumb', p.thumb),
        ]);
        await s.saveItem({ ...p.item, image_url: full, thumb_url: thumb });
      } catch (e) {
        setErrors((x) => [...x, `Could not save a photo: ${(e as Error).message}`]);
      }
    }
    setBusy(null); setQueue([]); setShots([]); stopCamera();
    navigate('/review');
  };

  const resolveDupe = async (keep: boolean) => {
    const next = queue.map((q, i) => (i === dupeIdx ? { ...q, dupes: [], skip: !keep } : q)) as (Pending & { skip?: boolean })[];
    const nextIdx = next.findIndex((o, i) => i > dupeIdx && o.dupes.length);
    if (nextIdx >= 0) { setQueue(next); setDupeIdx(nextIdx); }
    else { const keepers = next.filter((q) => !q.skip); setQueue([]); await save(keepers); }
  };

  const dupe = queue[dupeIdx];
  const review = s.data.items.filter((i) => i.status === 'review' && !i.deleted_at).length;

  return (
    <div>
      <h1>Add photos</h1>
      {review > 0 && <p><a href="#/review" className="btn small" data-testid="capture-to-review">{review} photo{review === 1 ? '' : 's'} waiting for a check</a></p>}

      <section className="section" aria-labelledby="cat-h">
        <h2 id="cat-h">1. What are you adding?</h2>
        <p className="mute">Pick once — every photo in this batch gets this category.</p>
        <div className="menu" role="radiogroup" aria-label="Category">
          {s.categories.map((c) => (
            <button key={c.id} role="radio" aria-checked={category === c.id} data-testid={`capture-cat-${c.id}`} onClick={() => chooseCat(c.id)}
              style={category === c.id ? { borderColor: 'var(--accent)', background: 'var(--tint)' } : undefined}>
              {category === c.id ? <Icon name="check" /> : <Icon name="tag" />}{c.name}
            </button>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="src-h">
        <h2 id="src-h">2. Take or pick photos</h2>
        {mode === 'pick' ? (
          <div className="row">
            <button className="btn primary" data-testid="capture-camera" onClick={startCamera}><Icon name="camera" /> Use camera</button>
            <button className="btn" data-testid="capture-gallery" onClick={() => fileRef.current?.click()}><Icon name="image" /> Pick from gallery</button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden data-testid="v-capture-file"
              onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) void processBatch(f); }} />
          </div>
        ) : (
          <div className="stack">
            <div className="camera"><video ref={video} playsInline muted aria-label="Camera preview" /></div>
            {shots.length > 0 && <div className="burst" aria-label={`${shots.length} photos taken`}>{shots.map((x, i) => <img key={i} src={x.url} alt={`Photo ${i + 1}`} />)}</div>}
            <div className="row">
              <button className="btn primary" data-testid="camera-snap" onClick={snap}><Icon name="camera" /> Snap</button>
              <button className="btn" data-testid="camera-done" disabled={!shots.length} onClick={() => { stopCamera(); setMode('pick'); void processBatch(shots.map((x) => x.blob)); }}>
                <Icon name="check" /> Done ({shots.length})
              </button>
              <button className="btn ghost" data-testid="camera-cancel" onClick={() => { stopCamera(); setShots([]); setMode('pick'); }}>Cancel</button>
            </div>
            <p className="small mute">Lay each piece flat in good light. Snap as many as you like — they all go into one batch.</p>
          </div>
        )}
        {camError && <p className="warnbox" role="alert" style={{ marginTop: 10 }}>{camError}</p>}
      </section>

      {busy && <p className="okbox" role="status" data-testid="v-capture-busy">{busy}</p>}
      {errors.length > 0 && <div className="warnbox" role="alert">{errors.map((e, i) => <p key={i} style={{ margin: 0 }}>{e}</p>)}</div>}

      {dupe && (
        <Sheet title="Is this already in your wardrobe?" onClose={() => void resolveDupe(false)} testid="dupe-sheet">
          <p>This photo looks very like <strong>{dupe.dupes[0].name}</strong>.</p>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <figure style={{ margin: 0, flex: 1 }}><img src={dupe.preview} alt="New photo" style={{ borderRadius: 12 }} /><figcaption className="small mute">New photo</figcaption></figure>
            <figure style={{ margin: 0, flex: 1 }}><Thumb item={dupe.dupes[0]} alt={dupe.dupes[0].name} /><figcaption className="small mute">Already saved</figcaption></figure>
          </div>
          <div className="row end" style={{ marginTop: 12 }}>
            <button className="btn" data-testid="dupe-skip" onClick={() => void resolveDupe(false)}>Skip this photo</button>
            <button className="btn primary" data-testid="dupe-keep" onClick={() => void resolveDupe(true)}>Add anyway</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
