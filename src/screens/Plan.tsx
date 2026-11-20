import { useState } from 'react';
import { useStore, today } from '../lib/store.tsx';
import { navigate, useRoute } from '../lib/router.ts';
import { Empty, Icon, Sheet, fmtDate } from '../components/ui.tsx';
import { EventForm } from '../components/EventForm.tsx';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Plan() {
  const s = useStore();
  const { query } = useRoute();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [sel, setSel] = useState<string | null>(null);
  const creating = query.get('new') === '1';
  const events = s.data.events.filter((e) => !!e.date).map((e) => ({ ...e, date: e.date! })).sort((a, b) => a.date.localeCompare(b.date));
  const t = today();
  const upcoming = events.filter((e) => e.date >= t);
  const past = events.filter((e) => e.date < t).reverse();
  const shown = sel ? events.filter((e) => e.date === sel) : null;

  const first = new Date(month); const offset = (first.getDay() + 6) % 7;
  const start = new Date(first); start.setDate(1 - offset);
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const has = new Set(events.map((e) => e.date));
  const looks = new Map(s.data.looks.map((l) => [l.id, l]));

  const Row = ({ e }: { e: (typeof events)[number] }) => (
    <a className="listrow" href={`#/event/${e.id}`} data-testid={`event-${e.id}`}>
      <span className="iconbtn" style={{ background: e.worn ? 'var(--tint)' : 'var(--chip)' }}><Icon name={e.worn ? 'check' : 'calendar'} /></span>
      <span className="grow"><span className="t">{e.title}</span><br />
        <span className="small mute">{fmtDate(e.date)} · {e.occasion}{e.look_id ? ` · ${looks.get(e.look_id)?.name ?? 'look'}` : ' · no outfit yet'}{e.worn ? ' · worn' : ''}</span></span>
    </a>
  );

  return (
    <div>
      <div className="row between">
        <h1>Plan</h1>
        <div className="row">
          <a className="btn small" href="#/trips" data-testid="plan-trips"><Icon name="plane" /> Trips</a>
          <button className="btn primary" data-testid="plan-new" onClick={() => navigate('/plan?new=1')}><Icon name="plus" /> New event</button>
        </div>
      </div>

      <section className="card section" aria-label="Calendar">
        <div className="row between" style={{ marginBottom: 8 }}>
          <button className="iconbtn" aria-label="Previous month" data-testid="cal-prev" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><Icon name="back" /></button>
          <h2 style={{ margin: 0 }} aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <button className="iconbtn" aria-label="Next month" data-testid="cal-next" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="back" /></span></button>
        </div>
        <div className="calendar">
          {DOW.map((d) => <span key={d} className="dow" aria-hidden="true">{d}</span>)}
          {days.map((d) => {
            const k = iso(d);
            const cls = [d.getMonth() !== month.getMonth() ? 'other' : '', k === t ? 'today' : '', has.has(k) ? 'has' : '', sel === k ? 'sel' : ''].join(' ');
            return <button key={k} className={cls} aria-label={`${fmtDate(k)}${has.has(k) ? ', has events' : ''}`} aria-pressed={sel === k} data-testid={`cal-day-${k}`} onClick={() => setSel(sel === k ? null : k)}>{d.getDate()}</button>;
          })}
        </div>
      </section>

      {shown ? (
        <section className="section">
          <div className="section-head"><h2>{fmtDate(sel!)}</h2><button className="btn small" data-testid="plan-add-on-day" onClick={() => navigate(`/plan?new=1&date=${sel}`)}><Icon name="plus" /> Add here</button></div>
          {shown.length ? <div className="list">{shown.map((e) => <Row key={e.id} e={e} />)}</div> : <p className="mute">Nothing planned on this day.</p>}
        </section>
      ) : (
        <>
          <section className="section">
            <h2>Upcoming</h2>
            {upcoming.length ? <div className="list">{upcoming.map((e) => <Row key={e.id} e={e} />)}</div>
              : <Empty title="No events coming up" action={<button className="btn primary" data-testid="plan-empty-new" onClick={() => navigate('/plan?new=1')}>Add an event</button>}>Add weddings, pujas or dinners and plan what to wear.</Empty>}
          </section>
          {past.length > 0 && <section className="section"><h2>Past</h2><div className="list">{past.slice(0, 20).map((e) => <Row key={e.id} e={e} />)}</div></section>}
        </>
      )}

      {creating && (
        <Sheet title="New event" onClose={() => navigate('/plan', { replace: true })} marker="event-sheet">
          <EventForm lookId={query.get('look')} date={query.get('date') ?? undefined} onDone={async (e) => { await s.saveEvent(e); s.toast(`“${e.title}” added`); navigate(`/event/${e.id}`, { replace: true }); }} />
        </Sheet>
      )}
    </div>
  );
}
