import { useMemo } from 'react';
import { useStore, useWardrobe, today } from '../lib/store.tsx';
import { CARE_LABEL } from '../lib/types.ts';
import { imgUrl } from '../lib/data/index.ts';
import { Icon, ItemTile, Thumb, fmtDate, daysFrom } from '../components/ui.tsx';

export function Home() {
  const s = useStore();
  const { items } = useWardrobe();
  const review = s.data.items.filter((i) => i.status === 'review' && !i.deleted_at);
  const attention = useMemo(() => items
    .filter((i) => i.care_status !== 'in_wardrobe')
    .sort((a, b) => (a.care_due ?? '9999').localeCompare(b.care_due ?? '9999')), [items]);
  const upcoming = s.data.events.filter((e) => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const favs = items.filter((i) => i.favorite).slice(0, 8);
  const looks = s.data.looks.filter((l) => !l.deleted_at).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 4);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const byId = new Map(s.data.items.map((i) => [i.id, i]));

  return (
    <div>
      <section className="hero">
        <p className="mute" style={{ margin: 0 }}>{hello}</p>
        <h1>{s.profile ? `${s.profile.name}` : 'Your wardrobe'}</h1>
        <p className="mute">{items.length} pieces · {s.data.looks.filter((l) => !l.deleted_at).length} looks · {upcoming.length ? `next event ${fmtDate(upcoming[0].date)}` : 'no events planned'}</p>
      </section>

      <div className="menu" style={{ marginBottom: 18 }}>
        <a href="#/studio?shuffle=Daily" data-testid="home-what-to-wear"><Icon name="sparkle" />What should I wear today?</a>
        <a href="#/add" data-testid="home-add"><Icon name="camera" />Add photos</a>
        <a href="#/plan?new=1" data-testid="home-plan"><Icon name="calendar" />Plan an event</a>
        <a href="#/closet" data-testid="home-closet"><Icon name="closet" />Browse closet</a>
      </div>

      {(attention.length > 0 || review.length > 0) && (
        <section className="section" aria-labelledby="attn-h">
          <div className="section-head"><h2 id="attn-h">Needs attention</h2><a className="btn small" href="#/care" data-testid="home-care">See all</a></div>
          <div className="strip">
            {review.length > 0 && (
              <a className="attn" href="#/review" data-testid="home-review">
                <Thumb item={review[0]} alt="" />
                <span><strong>{review.length} new photo{review.length === 1 ? '' : 's'}</strong><br /><span className="small">Check the tags</span></span>
              </a>
            )}
            {attention.map((i) => {
              const d = i.care_due ? daysFrom(i.care_due) : null;
              return (
                <a key={i.id} className="attn" href={`#/piece/${i.id}`} data-testid={`home-attn-${i.id}`}>
                  <Thumb item={i} alt="" />
                  <span><strong>{i.name}</strong><br />
                    <span className="small">{CARE_LABEL[i.care_status]}{i.care_status === 'lent' && i.lent_to ? ` to ${i.lent_to}` : i.care_contact ? ` · ${i.care_contact}` : ''}
                      {d !== null && <> · {d < 0 ? <b>overdue {-d} day{d === -1 ? '' : 's'}</b> : d === 0 ? <b>due today</b> : `due in ${d} day${d === 1 ? '' : 's'}`}</>}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="up-h">
        <div className="section-head"><h2 id="up-h">Coming up</h2><a className="btn small" href="#/plan" data-testid="home-plan-all">Calendar</a></div>
        {upcoming.length === 0 ? <p className="mute">No events yet. <a href="#/plan?new=1" data-testid="home-plan-empty">Add a wedding, puja or dinner</a> and plan what to wear.</p> : (
          <div className="list">
            {upcoming.map((e) => {
              const look = s.data.looks.find((l) => l.id === e.look_id);
              const first = look ? byId.get(look.item_ids[0]) : undefined;
              return (
                <a key={e.id} className="listrow" href={`#/event/${e.id}`} data-testid={`home-event-${e.id}`}>
                  {first ? <Thumb item={first} alt="" /> : <span className="iconbtn" style={{ background: 'var(--chip)' }}><Icon name="calendar" /></span>}
                  <span className="grow"><span className="t">{e.title}</span><br /><span className="small mute">{fmtDate(e.date)} · {e.occasion}{look ? ` · ${look.name}` : ' · no outfit yet'}</span></span>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {looks.length > 0 && (
        <section className="section" aria-labelledby="looks-h">
          <div className="section-head"><h2 id="looks-h">Recent looks</h2><a className="btn small" href="#/looks" data-testid="home-looks">All looks</a></div>
          <div className="grid">
            {looks.map((l) => {
              const first = byId.get(l.item_ids[0]);
              return (
                <a key={l.id} className="tile" href={`#/look/${l.id}`} data-testid={`home-look-${l.id}`}>
                  {l.board_url ? <img className="ph" src={imgUrl(l.board_url)} alt="" loading="lazy" /> : first ? <Thumb item={first} className="ph" alt="" /> : <div className="ph" />}
                  <span className="meta"><span className="name">{l.name}</span><span className="small mute">{l.occasion}{l.score != null ? ` · ${l.score}/10` : ''}</span></span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="fav-h">
        <div className="section-head"><h2 id="fav-h">Favourites</h2><a className="btn small" href="#/closet?q=favourites" data-testid="home-favs">See all</a></div>
        {favs.length ? <div className="grid">{favs.map((i) => <ItemTile key={i.id} item={i} href={`#/piece/${i.id}`} testid={`home-fav-${i.id}`} />)}</div>
          : <p className="mute">Tap the heart on any piece to keep it here.</p>}
      </section>
    </div>
  );
}
