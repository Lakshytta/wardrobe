import { useStore, useWardrobe } from '../lib/store.tsx';
import { prettyColour } from '../lib/smarts/colors.ts';
import { Icon, Swatch, Thumb } from '../components/ui.tsx';

export default function PrintCatalogue() {
  const s = useStore();
  const { items, categories } = useWardrobe();
  return (
    <div>
      <div className="row between no-print">
        <h1>Catalogue</h1>
        <button className="btn primary" data-testid="print-now" onClick={() => window.print()}><Icon name="print" /> Print or save as PDF</button>
      </div>
      <p className="mute no-print">A printable list of every piece, grouped by category. Use “Save as PDF” in the print window to keep a copy.</p>
      <h1 className="print-only">{s.profile?.name} — wardrobe catalogue</h1>
      {categories.map((c) => {
        const its = items.filter((i) => i.category_id === c.id);
        if (!its.length) return null;
        return (
          <section key={c.id} className="section">
            <h2>{c.name} <span className="mute small">({its.length})</span></h2>
            <div className="grid print-grid">
              {its.map((i) => (
                <figure key={i.id} className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
                  <Thumb item={i} alt={i.name} />
                  <figcaption style={{ padding: 8 }}>
                    <strong>{i.name}</strong><br />
                    <span className="row" style={{ gap: 4 }}><Swatch name={i.primary_color} />{prettyColour(i.primary_color)}{i.fabric ? ` · ${i.fabric}` : ''}</span>
                    <span className="small mute">{i.occasions.join(', ')}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
