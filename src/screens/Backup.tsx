import { useRef, useState } from 'react';
import { useStore } from '../lib/store.tsx';
import { makeBackup, parseBackup, rehome, type Backup as B } from '../lib/backup.ts';
import { downloadText } from '../components/ItemForm.tsx';
import { Icon, Sheet } from '../components/ui.tsx';

export default function Backup() {
  const s = useStore();
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<B | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const exportNow = () => {
    if (!s.profile) return;
    const b = makeBackup({ profile: s.profile, categories: s.categories, ...s.data });
    downloadText(`wardrobe-${s.profile.name.replace(/\W+/g, '-').toLowerCase()}-${b.exported_at.slice(0, 10)}.json`, JSON.stringify(b, null, 1), 'application/json');
    s.toast('Backup downloaded');
  };
  const restore = async () => {
    if (!pending) return;
    setBusy(true);
    const b = rehome(pending, s.profileId);
    for (const c of b.categories) if (!s.categories.some((x) => x.id === c.id)) await s.saveCategory(c);
    for (const i of b.items) await s.put('items', i);
    for (const l of b.looks) await s.put('looks', l);
    for (const e of b.events) await s.put('events', e);
    for (const w of b.wears) await s.put('wears', w);
    for (const t of b.trips) await s.put('trips', t);
    setBusy(false); setPending(null);
    s.toast(`Restored ${b.items.length} pieces, ${b.looks.length} looks and ${b.events.length} events`);
  };
  return (
    <div>
      <h1>Backup &amp; restore</h1>
      <section className="section card stack">
        <h2>Download a backup</h2>
        <p>Saves everything in <strong>{s.profile?.name}</strong>'s wardrobe — pieces, looks, events, wears and trips — as one file. Photos stay online; the backup keeps their links.</p>
        <button className="btn primary" data-testid="backup-export" onClick={exportNow}><Icon name="download" /> Download backup</button>
      </section>
      <section className="section card stack">
        <h2>Restore from a backup</h2>
        <p>Adds the pieces from a backup file into <strong>{s.profile?.name}</strong>'s wardrobe. Anything with the same name ID is updated; nothing is deleted.</p>
        <button className="btn" data-testid="backup-import" onClick={() => file.current?.click()}><Icon name="box" /> Choose backup file</button>
        <input ref={file} type="file" accept="application/json,.json" hidden data-testid="v-backup-file" onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
          const r = parseBackup(await f.text());
          if (typeof r === 'string') { setErr(r); setPending(null); } else { setErr(null); setPending(r); }
        }} />
        {err && <p className="warnbox" role="alert">{err}</p>}
      </section>
      {pending && (
        <Sheet title="Restore this backup?" onClose={() => setPending(null)} testid="restore-sheet">
          <p>From <strong>{pending.profile?.name}</strong>, saved {new Date(pending.exported_at).toLocaleString()}:</p>
          <ul><li>{pending.items.length} pieces</li><li>{pending.looks.length} looks</li><li>{pending.events.length} events</li><li>{pending.wears.length} wears</li><li>{pending.trips.length} trips</li></ul>
          <div className="row end">
            <button className="btn" data-testid="restore-cancel" onClick={() => setPending(null)}>Cancel</button>
            <button className="btn primary" data-testid="restore-confirm" disabled={busy} onClick={restore}>{busy ? 'Restoring…' : 'Restore'}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
