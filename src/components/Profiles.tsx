import { useState } from 'react';
import { useStore } from '../lib/store.tsx';
import type { Profile } from '../lib/types.ts';
import { Icon, Sheet, TextField, useSubmitOnce } from './ui.tsx';

export const PROFILE_COLOURS = ['#0B6B62', '#7A3F9D', '#B8342E', '#1F2F5C', '#C99A1E', '#C2187A', '#1E7A4A', '#7B5237'];
export const PROFILE_EMOJI = ['🌸', '🌼', '🪷', '🦚', '🌿', '⭐', '🌙', '💎', '👑', '🧵'];

export function ProfileEditor({ initial, onDone }: { initial?: Profile; onDone: (p: Profile) => unknown }) {
  const { saveProfile } = useStore();
  const [saving, submit] = useSubmitOnce();
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PROFILE_COLOURS[1]);
  const [emoji, setEmoji] = useState(initial?.avatar_emoji ?? PROFILE_EMOJI[1]);
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; void submit(async () => onDone(await saveProfile({ ...initial, name: name.trim(), color, avatar_emoji: emoji }))); }}>
      <TextField label="Name" value={name} onChange={setName} testid="profile-name" required placeholder="e.g. Mum" />
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Colour</legend>
        <div className="chips">
          {PROFILE_COLOURS.map((c) => (
            <button type="button" key={c} className="chip" aria-pressed={color === c} aria-label={`Colour ${c}`} data-testid={`profile-color-${c.slice(1)}`} onClick={() => setColor(c)}>
              <span className="swatch big" style={{ background: c }} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Picture</legend>
        <div className="chips">
          {PROFILE_EMOJI.map((em, i) => (
            <button type="button" key={em} className="chip" aria-pressed={emoji === em} aria-label={`Picture ${i + 1}`} data-testid={`profile-emoji-${i}`} onClick={() => setEmoji(em)} style={{ fontSize: '1.3rem' }}>{em}</button>
          ))}
        </div>
      </fieldset>
      <button className="btn primary block" type="submit" data-testid="profile-save" disabled={!name.trim() || saving}>Save</button>
    </form>
  );
}

export function ProfileSwitcher() {
  const { profiles, profile, switchProfile } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const close = () => { setOpen(false); setEditing(null); };
  return (
    <>
      <button className="profile-pill" onClick={() => setOpen(true)} data-testid="profile-switcher" aria-label={`Wardrobe: ${profile?.name ?? 'none'}. Change`}>
        <span className="av" style={{ background: profile?.color ?? 'var(--chip)' }}>{profile?.avatar_emoji ?? '👤'}</span>
        <span className="nm">{profile?.name ?? 'Choose'}</span>
      </button>
      {open && (
        <Sheet title={editing === 'new' ? 'Add a family member' : editing ? `Edit ${editing.name}` : 'Whose wardrobe?'} onClose={close} marker="profiles-sheet">
          {editing ? (
            <ProfileEditor initial={editing === 'new' ? undefined : editing} onDone={async (p) => { if (editing === 'new') await switchProfile(p.id); close(); }} />
          ) : (
            <div className="stack">
              {profiles.map((p) => (
                <div key={p.id} className="row" style={{ flexWrap: 'nowrap' }}>
                  <button className="btn block" style={{ justifyContent: 'flex-start', borderColor: p.id === profile?.id ? 'var(--accent)' : undefined }}
                    data-testid={`profile-pick-${p.id}`} aria-current={p.id === profile?.id} onClick={async () => { close(); await switchProfile(p.id); }}>
                    <span className="av" style={{ background: p.color, width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center' }}>{p.avatar_emoji}</span>
                    {p.name}
                  </button>
                  <button className="iconbtn" aria-label={`Edit ${p.name}`} data-testid={`profile-edit-${p.id}`} onClick={() => setEditing(p)}><Icon name="edit" /></button>
                </div>
              ))}
              <button className="btn primary block" data-testid="profile-add" onClick={() => setEditing('new')}><Icon name="plus" /> Add a family member</button>
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
