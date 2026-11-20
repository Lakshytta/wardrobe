import { useEffect, useState } from 'react';

export interface Route { path: string; parts: string[]; query: URLSearchParams }

function parse(): Route {
  const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#/, '') || '/';
  const [p, q = ''] = h.split('?');
  const path = p.startsWith('/') ? p : `/${p}`;
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

export function useRoute(): Route {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => { setR(parse()); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const h = to.startsWith('#') ? to : `#${to}`;
  if (opts.replace) history.replaceState(null, '', h);
  else location.hash = h;
  if (opts.replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function back(fallback = '/') {
  if (history.length > 1) history.back(); else navigate(fallback);
}
