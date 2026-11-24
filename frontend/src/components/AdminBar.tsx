import { useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';

type Req = Awaited<ReturnType<typeof api.requests>>['items'];

export function AdminBar() {
  const { admin, logout } = useStore();
  const [items, setItems] = useState<Req | null>(null);
  const [error, setError] = useState('');
  if (!admin) return null;

  async function open() {
    setError('');
    try { setItems((await api.requests()).items); } catch (e) { setError((e as Error).message); setItems([]); }
  }

  return (
    <>
      <div className="admin-bar" role="region" aria-label="Панель администратора">
        <span className="admin-bar-mode">Режим редактирования</span>
        <button type="button" onClick={open}>Заявки</button>
        <button type="button" onClick={() => void logout()}>Выйти</button>
      </div>
      {items && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="req-title">
            <div className="modal-head">
              <div><p className="eyebrow">Форма на сайте</p><h2 id="req-title">Заявки</h2></div>
              <button type="button" className="modal-x" onClick={() => setItems(null)} aria-label="Закрыть">×</button>
            </div>
            <div className="modal-body">
              {error && <p className="modal-error">{error}</p>}
              {!error && items.length === 0 && <p>Заявок пока нет.</p>}
              {items.map(r => (
                <article className="req" key={r.id}>
                  <div className="req-top"><b>{r.name}</b><span className="idx">{r.created_at}</span></div>
                  <p><a href={`tel:${r.phone}`}>{r.phone}</a>{r.company ? ` · ${r.company}` : ''}</p>
                  <p className="req-msg">{r.message}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
