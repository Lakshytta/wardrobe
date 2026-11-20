import { lazy, Suspense, useEffect } from 'react';
import { StoreProvider, useStore } from './lib/store.tsx';
import { useRoute } from './lib/router.ts';
import { Icon, Toasts } from './components/ui.tsx';
import { ProfileSwitcher } from './components/Profiles.tsx';
import { Home } from './screens/Home.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

const Closet = lazy(() => import('./screens/Closet.tsx'));
const Piece = lazy(() => import('./screens/Piece.tsx'));
const Capture = lazy(() => import('./screens/Capture.tsx'));
const Review = lazy(() => import('./screens/Review.tsx'));
const Studio = lazy(() => import('./screens/Studio.tsx'));
const Looks = lazy(() => import('./screens/Looks.tsx'));
const LookDetail = lazy(() => import('./screens/LookDetail.tsx'));
const Plan = lazy(() => import('./screens/Plan.tsx'));
const EventDetail = lazy(() => import('./screens/EventDetail.tsx'));
const Trips = lazy(() => import('./screens/Trips.tsx'));
const TripDetail = lazy(() => import('./screens/TripDetail.tsx'));
const Care = lazy(() => import('./screens/Care.tsx'));
const Insights = lazy(() => import('./screens/Insights.tsx'));
const More = lazy(() => import('./screens/More.tsx'));
const Categories = lazy(() => import('./screens/Categories.tsx'));
const Trash = lazy(() => import('./screens/Trash.tsx'));
const Backup = lazy(() => import('./screens/Backup.tsx'));
const PrintCatalogue = lazy(() => import('./screens/PrintCatalogue.tsx'));

const NAV = [
  { href: '#/', label: 'Home', icon: 'home', match: (p: string) => p === '/', id: 'nav-home' },
  { href: '#/closet', label: 'Closet', icon: 'closet', match: (p: string) => p.startsWith('/closet') || p.startsWith('/piece'), id: 'nav-closet' },
  { href: '#/add', label: 'Add', icon: 'plus', match: (p: string) => p.startsWith('/add') || p.startsWith('/review'), id: 'nav-add' },
  { href: '#/studio', label: 'Match', icon: 'match', match: (p: string) => p.startsWith('/studio') || p.startsWith('/look'), id: 'nav-studio' },
  { href: '#/plan', label: 'Plan', icon: 'calendar', match: (p: string) => p.startsWith('/plan') || p.startsWith('/event') || p.startsWith('/trip'), id: 'nav-plan' },
];

function Screen() {
  const r = useRoute();
  const [a, b] = r.parts;
  useEffect(() => { window.scrollTo(0, 0); }, [r.path]);
  switch (a) {
    case undefined: return <Home />;
    case 'closet': return <Closet />;
    case 'piece': return <Piece id={b} />;
    case 'add': return <Capture />;
    case 'review': return <Review />;
    case 'studio': return <Studio />;
    case 'looks': return <Looks />;
    case 'look': return <LookDetail id={b} />;
    case 'plan': return <Plan />;
    case 'event': return <EventDetail id={b} />;
    case 'trips': return <Trips />;
    case 'trip': return <TripDetail id={b} />;
    case 'care': return <Care />;
    case 'insights': return <Insights />;
    case 'more':
      if (b === 'categories') return <Categories />;
      if (b === 'trash') return <Trash />;
      if (b === 'backup') return <Backup />;
      return <More />;
    case 'print': return <PrintCatalogue />;
    default: return <div className="empty card"><h3>Page not found</h3><a className="btn" href="#/" data-testid="notfound-home">Go home</a></div>;
  }
}

function Shell() {
  const s = useStore();
  const r = useRoute();
  return (
    <div className="app">
      <a href="#main" className="sr-only" data-testid="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header className="topbar">
        <a href="#/" className="brand" data-testid="brand-home" aria-label="Wardrobe home">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#0B6B62" /><path d="M9 9h14v15H9zM16 9v15" stroke="#fff" strokeWidth="1.8" fill="none" /><circle cx="13.5" cy="17" r="1.1" fill="#fff" /><circle cx="18.5" cy="17" r="1.1" fill="#fff" /></svg>
          <span className="hide-xs">Wardrobe</span>
        </a>
        {s.pending > 0 && <span className="tag warn pending" title="Changes saved on this device, waiting for internet">{s.pending} to sync</span>}
        <ProfileSwitcher />
        <a className="iconbtn" href="#/more" aria-label="More options" data-testid="nav-more"><Icon name="menu" /></a>
      </header>
      <nav className="bottomnav" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} className={n.icon === 'plus' ? 'add' : ''} aria-current={n.match(r.path) ? 'page' : undefined} data-testid={n.id}>
            <span className="navicon"><Icon name={n.icon} /></span>{n.label}
          </a>
        ))}
      </nav>
      <main id="main" tabIndex={-1}>
        {!s.ready ? <p className="mute" role="status">Opening your wardrobe…</p>
          : s.error ? <div className="empty card"><h3>Something went wrong</h3><p>{s.error}</p><button className="btn primary" data-testid="reload" onClick={() => location.reload()}>Try again</button></div>
          : <ErrorBoundary resetKey={r.path}><Suspense fallback={<p className="mute" role="status">Loading…</p>}><Screen /></Suspense></ErrorBoundary>}
      </main>
      <Toasts />
    </div>
  );
}

export function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
