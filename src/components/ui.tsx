import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Item } from '../lib/types.ts';
import { imgUrl } from '../lib/data/index.ts';
import { swatchCss, prettyColour } from '../lib/smarts/colors.ts';
import { CARE_LABEL } from '../lib/types.ts';
import { useStore } from '../lib/store.tsx';

const P: Record<string, ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10" />,
  closet: <><path d="M4 3h16v18H4zM12 3v18" /><path d="M9.5 11v2M14.5 11v2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  match: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  heartFill: <path fill="currentColor" d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 17-5-5-8 8" /></>,
  shuffle: <path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3" />,
  check: <path d="M5 12.5 10 17l9-10" />,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 11 7.6-3.9M8.2 13l7.6 3.9" /></>,
  download: <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  needle: <path d="M4 20 18 6m0 0 2-2m-2 2 1 3M14 4l-1 2" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></>,
  print: <><path d="M6 9V3h12v6M6 17H4v-7h16v7h-2" /><rect x="6" y="14" width="12" height="7" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.8-1.8-5-4-5.7" /></>,
  box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" /><rect x="13" y="4" width="7" height="7" /><rect x="4" y="13" width="7" height="7" /><rect x="13" y="13" width="7" height="7" /></>,
  single: <rect x="5" y="4" width="14" height="16" rx="2" />,
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  plane: <path d="M10 14 3 11l1-2 8 1 5-6c1-1 3-1 3 0s-1 2-2 3l-6 5 1 8-2 1-3-7" />,
  look: <><path d="M12 3c-2 0-3 1.5-3 3h6c0-1.5-1-3-3-3zM9 6 6 9l2 2v10h8V11l2-2-3-3" /></>,
};

export function Icon({ name, label }: { name: keyof typeof P | string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
      {P[name] ?? null}
    </svg>
  );
}

export function Swatch({ name, big }: { name: string; big?: boolean }) {
  return <span className={`swatch${big ? ' big' : ''}`} style={{ background: swatchCss(name) }} title={prettyColour(name)} />;
}

export function Sheet({ title, onClose, children, marker }: { title: string; onClose: () => void; children: ReactNode; marker?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input,select,textarea,button:not(.iconbtn)') ?? ref.current;
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && ref.current) { // keep focus inside the dialog
        const f = [...ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea')].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.({ preventScroll: true }); };
  }, []);
  return createPortal(
    <div className="backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1} data-testid={marker ? `v-${marker}` : undefined}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Close" data-testid="sheet-close"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty card">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Thumb({ item, className, alt, full }: { item: Pick<Item, 'thumb_url' | 'image_url' | 'name'>; className?: string; alt?: string; full?: boolean }) {
  const src = imgUrl(full ? item.image_url || item.thumb_url : item.thumb_url || item.image_url);
  if (!src) return <div className={className} aria-hidden="true" style={{ background: 'var(--mat)', aspectRatio: '4/3' }} />;
  return <img src={src} alt={alt ?? item.name} className={className} loading="lazy" decoding="async" width={480} height={360} />;
}

export function ItemTile({ item, onClick, href, selected, testid }: { item: Item; onClick?: () => void; href?: string; selected?: boolean; testid: string }) {
  const away = item.care_status && item.care_status !== 'in_wardrobe';
  const inner = (
    <>
      <Thumb item={item} className="ph" alt="" />
      {item.favorite && <span className="fav" aria-label="Favourite"><Icon name="heartFill" /></span>}
      {away && <span className="away tag warn">{CARE_LABEL[item.care_status]}</span>}
      <span className="meta">
        <span className="name">{item.name}</span>
        <span className="row" style={{ gap: 4 }}>
          <Swatch name={item.primary_color} />
          {item.accent_colors.slice(0, 3).map((c) => <Swatch key={c} name={c} />)}
        </span>
      </span>
    </>
  );
  if (href) return <a className={`tile${selected ? ' selected' : ''}`} href={href} data-testid={testid}>{inner}</a>;
  return <button type="button" className={`tile${selected ? ' selected' : ''}`} onClick={onClick} aria-pressed={selected} data-testid={testid}>{inner}</button>;
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone === 'error' ? 'error' : ''}`}>
          <p>{t.text}</p>
          {t.undo && <button className="btn small" data-testid="toast-undo" onClick={() => { t.undo!(); dismissToast(t.id); }}>Undo</button>}
          <button className="iconbtn" aria-label="Dismiss" data-testid="toast-dismiss" onClick={() => dismissToast(t.id)}><Icon name="close" /></button>
        </div>
      ))}
    </div>
  );
}

/** Pinch / double-tap / wheel zoom with pan. */
export function PhotoZoom({ src, alt }: { src: string; alt: string }) {
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ d: number; s: number; x: number; y: number; cx: number; cy: number } | null>(null);
  const clamp = (v: { s: number; x: number; y: number }) => {
    const r = box.current?.getBoundingClientRect();
    const s = Math.max(1, Math.min(4, v.s));
    if (!r) return { s, x: 0, y: 0 };
    return { s, x: Math.min(0, Math.max(r.width * (1 - s), v.x)), y: Math.min(0, Math.max(r.height * (1 - s), v.y)) };
  };
  const zoomAt = (cx: number, cy: number, s: number) => setZ((p) => clamp({ s, x: cx - ((cx - p.x) / p.s) * s, y: cy - ((cy - p.y) / p.s) * s }));
  return (
    <div className="photo-zoom" ref={box}
      onDoubleClick={(e) => { const r = box.current!.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, z.s > 1 ? 1 : 2.5); }}
      onWheel={(e) => { const r = box.current!.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, z.s * (e.deltaY < 0 ? 1.15 : 0.87)); }}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); start.current = null; }}
      onPointerMove={(e) => {
        const prev = pts.current.get(e.pointerId); if (!prev) return;
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const r = box.current!.getBoundingClientRect();
        if (pts.current.size === 2) {
          const [a, b] = [...pts.current.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (!start.current) start.current = { d, s: z.s, x: z.x, y: z.y, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top };
          const st = start.current; const s = st.s * (d / st.d);
          setZ(clamp({ s, x: st.cx - ((st.cx - st.x) / st.s) * s, y: st.cy - ((st.cy - st.y) / st.s) * s }));
        } else if (z.s > 1) setZ((p) => clamp({ ...p, x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
      }}
      onPointerUp={(e) => { pts.current.delete(e.pointerId); start.current = null; }}
      onPointerCancel={(e) => { pts.current.delete(e.pointerId); start.current = null; }}
    >
      <img src={src} alt={alt} draggable={false} style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})` }} />
      <div className="row" style={{ position: 'absolute', right: 8, bottom: 8 }}>
        <button className="iconbtn" style={{ background: 'var(--surface)' }} aria-label="Zoom in" data-testid="zoom-in" onClick={() => { const r = box.current!.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, z.s * 1.5); }}><Icon name="plus" /></button>
        <button className="iconbtn" style={{ background: 'var(--surface)' }} aria-label="Reset zoom" data-testid="zoom-reset" onClick={() => setZ({ s: 1, x: 0, y: 0 })}><Icon name="single" /></button>
      </div>
    </div>
  );
}

export function TextField({ label, value, onChange, testid, type = 'text', hint, required, placeholder, list }: {
  label: string; value: string; onChange: (v: string) => void; testid: string; type?: string; hint?: string; required?: boolean; placeholder?: string; list?: string;
}) {
  return (
    <label className="field">
      {label}
      {hint && <span className="hint">{hint}</span>}
      <input type={type} value={value} required={required} placeholder={placeholder} list={list} onChange={(e) => onChange(e.target.value)} data-testid={testid} />
    </label>
  );
}

export function SelectField({ label, value, onChange, options, testid }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; testid: string }) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Toggle-chip multi select. */
export function ChipSelect({ options, value, onChange, testidPrefix, render }: { options: string[]; value: string[]; onChange: (v: string[]) => void; testidPrefix: string; render?: (o: string) => ReactNode }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button type="button" key={o} className="chip" aria-pressed={on} data-testid={`${testidPrefix}-${slug(o)}`}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>
            {render ? render(o) : o}
          </button>
        );
      })}
    </div>
  );
}

export function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export function fmtDate(d: string | null | undefined) {
  if (!d) return '';
  const t = new Date(`${d.slice(0, 10)}T12:00:00`);
  return t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysFrom(d: string, from = new Date().toISOString().slice(0, 10)) {
  return Math.round((Date.parse(d.slice(0, 10)) - Date.parse(from)) / 86400000);
}

/**
 * Guards a form against double submission (a double-tap on Save would otherwise
 * create the record twice, because each submit mints a fresh id).
 * Returns [pending, run]: run(fn) ignores calls while an earlier one is still in flight.
 */
export function useSubmitOnce() {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const run = async (fn: () => unknown) => {
    if (busy.current) return;
    busy.current = true; setPending(true);
    try { await fn(); } finally { busy.current = false; setPending(false); }
  };
  return [pending, run] as const;
}
