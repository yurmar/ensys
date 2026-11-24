import { useEffect } from 'react';
import { useStore } from '../store';
import { EditButton } from './EditButton';

export function PrivacyModal() {
  const { privacyOpen, openPrivacy, blocks } = useStore();
  const p = blocks.privacy;

  useEffect(() => {
    if (!privacyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') openPrivacy(false); };
    addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; removeEventListener('keydown', onKey); };
  }, [privacyOpen, openPrivacy]);

  if (!privacyOpen || !p) return null;
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) openPrivacy(false); }}>
      <div className="modal modal--doc" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{p.updated}</p>
            <h2 id="privacy-title">{p.title}</h2>
          </div>
          <span className="modal-head-tools">
            <EditButton slug="privacy" variant="inline" />
            <button type="button" className="modal-x" onClick={() => openPrivacy(false)} aria-label={p.close_label}>×</button>
          </span>
        </div>
        <div className="modal-body doc-text">
          {(p.sections ?? []).map((s: any, i: number) => (
            <section key={i}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </section>
          ))}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openPrivacy(false)}>{p.close_label}</button>
        </div>
      </div>
    </div>
  );
}
