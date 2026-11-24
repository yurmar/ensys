import type { Field } from '../api';

type Props = { fields: Field[]; value: Record<string, any>; onChange: (v: Record<string, any>) => void };

function emptyFor(fields: Field[]): Record<string, any> {
  const o: Record<string, any> = {};
  for (const f of fields) {
    o[f.key] = f.type === 'list' || f.type === 'strlist' ? [] : f.type === 'bool' ? false : f.type === 'group' ? emptyFor(f.fields!) : '';
  }
  return o;
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

export function FieldEditor({ fields, value, onChange }: Props) {
  const set = (key: string, v: any) => onChange({ ...value, [key]: v });
  return (
    <div className="ed-fields">
      {fields.map(f => {
        const v = value?.[f.key];
        switch (f.type) {
          case 'text':
          case 'url':
            return (
              <label className="field" key={f.key}>{f.label}
                <input value={v ?? ''} maxLength={f.max ?? 300} onChange={e => set(f.key, e.target.value)} />
              </label>
            );
          case 'textarea':
            return (
              <label className="field" key={f.key}>{f.label}
                <textarea rows={3} value={v ?? ''} maxLength={f.max ?? 3000} onChange={e => set(f.key, e.target.value)} />
              </label>
            );
          case 'svg':
            return (
              <label className="field" key={f.key}>{f.label}
                <div className="ed-svg">
                  <textarea rows={4} spellCheck={false} value={v ?? ''} onChange={e => set(f.key, e.target.value)} />
                  <div className="ed-svg-preview" aria-hidden="true" dangerouslySetInnerHTML={{ __html: v && /^<svg/i.test(v) && !/<script|\son\w+=/i.test(v) ? v : '' }} />
                </div>
              </label>
            );
          case 'bool':
            return (
              <label className="ed-check" key={f.key}>
                <input type="checkbox" checked={!!v} onChange={e => set(f.key, e.target.checked)} /> <span>{f.label}</span>
              </label>
            );
          case 'group':
            return (
              <fieldset className="ed-group" key={f.key}>
                <legend>{f.label}</legend>
                <FieldEditor fields={f.fields!} value={v ?? {}} onChange={nv => set(f.key, nv)} />
              </fieldset>
            );
          case 'strlist': {
            const arr: string[] = v ?? [];
            return (
              <fieldset className="ed-group" key={f.key}>
                <legend>{f.label}</legend>
                {arr.map((s, i) => (
                  <div className="ed-row" key={i}>
                    <input aria-label={`${f.label} ${i + 1}`} value={s} onChange={e => set(f.key, arr.map((x, k) => (k === i ? e.target.value : x)))} />
                    <RowTools onUp={() => set(f.key, move(arr, i, -1))} onDown={() => set(f.key, move(arr, i, 1))} onDelete={() => set(f.key, arr.filter((_, k) => k !== i))} />
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => set(f.key, [...arr, ''])}>+ Добавить</button>
              </fieldset>
            );
          }
          case 'list': {
            const arr: Record<string, any>[] = v ?? [];
            return (
              <fieldset className="ed-group" key={f.key}>
                <legend>{f.label}</legend>
                {arr.map((item, i) => (
                  <div className="ed-item" key={i}>
                    <div className="ed-item-head">
                      <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                      <RowTools onUp={() => set(f.key, move(arr, i, -1))} onDown={() => set(f.key, move(arr, i, 1))} onDelete={() => set(f.key, arr.filter((_, k) => k !== i))} />
                    </div>
                    <FieldEditor fields={f.fields!} value={item} onChange={nv => set(f.key, arr.map((x, k) => (k === i ? nv : x)))} />
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => set(f.key, [...arr, emptyFor(f.fields!)])}>+ Добавить</button>
              </fieldset>
            );
          }
        }
      })}
    </div>
  );
}

function RowTools({ onUp, onDown, onDelete }: { onUp: () => void; onDown: () => void; onDelete: () => void }) {
  return (
    <span className="ed-tools">
      <button type="button" onClick={onUp} aria-label="Выше" title="Выше">↑</button>
      <button type="button" onClick={onDown} aria-label="Ниже" title="Ниже">↓</button>
      <button type="button" onClick={onDelete} aria-label="Удалить" title="Удалить" className="ed-del">×</button>
    </span>
  );
}
