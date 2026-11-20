import { useState } from 'react';
import { useStore } from '../lib/store.tsx';
import { getTheme, setTheme, type Theme } from '../lib/theme.ts';
import { Icon, Sheet } from '../components/ui.tsx';
import { ProfileEditor } from '../components/Profiles.tsx';

export default function More() {
  const s = useStore();
  const [theme, setT] = useState<Theme>(getTheme());
  const [adding, setAdding] = useState(false);
  const review = s.data.items.filter((i) => i.status === 'review' && !i.deleted_at).length;
  const trash = s.data.items.filter((i) => i.status === 'trashed').length + s.data.looks.filter((l) => l.deleted_at).length;
  const links: [string, string, string, string][] = [
    ['#/looks', 'look', 'My looks', 'more-looks'],
    ['#/trips', 'plane', 'Trips & packing', 'more-trips'],
    ['#/care', 'needle', 'Tailor & lending', 'more-care'],
    ['#/insights', 'chart', 'Insights', 'more-insights'],
    ['#/review', 'check', `Check new photos${review ? ` (${review})` : ''}`, 'more-review'],
    ['#/more/categories', 'tag', 'Categories', 'more-categories'],
    ['#/more/trash', 'trash', `Trash${trash ? ` (${trash})` : ''}`, 'more-trash'],
    ['#/more/backup', 'box', 'Backup & restore', 'more-backup'],
    ['#/print', 'print', 'Print catalogue', 'more-print'],
  ];
  return (
    <div>
      <h1>More</h1>
      <nav className="menu" aria-label="More">
        {links.map(([href, icon, label, id]) => <a key={href} href={href} data-testid={id}><Icon name={icon} />{label}</a>)}
        <button data-testid="more-add-profile" onClick={() => setAdding(true)}><Icon name="users" />Add a family member</button>
      </nav>
      <section className="section card">
        <h2>Appearance</h2>
        <div className="chips" role="radiogroup" aria-label="Theme">
          {(['light', 'dark', 'auto'] as Theme[]).map((t) => (
            <button key={t} role="radio" aria-checked={theme === t} className={`chip${theme === t ? ' on' : ''}`} data-testid={`theme-${t}`} onClick={() => { setTheme(t); setT(t); }}>
              {t === 'auto' ? 'Match my phone' : t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </section>
      <section className="section card">
        <h2>About</h2>
        <p className="small">Everyone with the link can open this wardrobe — there is no login. Deleted things go to Trash for 30 days, and you can download a backup any time.</p>
        <p className="small mute">Style tips are worked out on this device from colour, fabric and occasion rules. {s.adapterKind === 'memory' ? 'Demo mode: changes are saved in this browser only.' : s.pending ? `${s.pending} change(s) waiting for internet.` : 'All changes are saved.'}</p>
      </section>
      {adding && <Sheet title="Add a family member" onClose={() => setAdding(false)} testid="more-profile-sheet"><ProfileEditor onDone={async (p) => { setAdding(false); await s.switchProfile(p.id); s.toast(`Now showing ${p.name}'s wardrobe`); }} /></Sheet>}
    </div>
  );
}
