import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { FieldEditor } from './FieldEditor';

export function EditModal() {
  const { editing, edit, blocks, schemas, save } = useStore();
  const schema = editing ? schemas[editing] : undefined;
  const initial = useMemo(() => (editing ? structuredClone(blocks[editing] ?? {}) : {}), [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<Record<string, any>>(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  useEffect(() => { setDraft(initial); setError(''); }, [initial]);

  const close = () => {
    if (dirty && !confirm('Закрыть без сохранения? Изменения будут потеряны.')) return;
    edit(null);
  };

  useEffect(() => {
    if (!editing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; removeEventListener('keydown', onKey); };
  });

  if (!editing || !schema) return null;

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await save(editing!, draft);
      edit(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={box}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Редактирование блока</p>
            <h2 id="modal-title">{schema.title}</h2>
          </div>
          <button type="button" className="modal-x" onClick={close} aria-label="Закрыть">×</button>
        </div>
        <div className="modal-body">
          <FieldEditor fields={schema.fields} value={draft} onChange={setDraft} />
        </div>
        <div className="modal-foot">
          {error && <p className="modal-error" role="alert">{error}</p>}
          <button type="button" className="btn btn-outline btn-sm" onClick={close}>Отмена</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={busy || !dirty}>{busy ? 'Сохраняю…' : 'Сохранить'}</button>
        </div>
      </div>
    </div>
  );
}
