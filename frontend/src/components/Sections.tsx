import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import { Arrow, Svg } from './Logo';
import { EditButton } from './EditButton';

const pad = (n: number) => String(n).padStart(2, '0');

export function Services() {
  const { blocks } = useStore();
  const b = blocks.services ?? {};
  return (
    <section className="section editable" id="services" aria-labelledby="services-title">
      <EditButton slug="services" />
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">{b.eyebrow}</p>
          <h2 className="h2" id="services-title">{b.title}</h2>
          <p className="lead">{b.lead}</p>
        </div>
        <div className="services-grid">
          {(b.items ?? []).map((it: any, i: number) => (
            <article className="service reveal" key={i}>
              <div className="service-top">
                <span className="idx">{pad(i + 1)}</span>
                <Svg html={it.icon} className="service-icon" />
              </div>
              <h3>{it.title}<small>{it.subtitle}</small></h3>
              <ul>{(it.points ?? []).map((p: string, j: number) => <li key={j}>{p}</li>)}</ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Process() {
  const { blocks } = useStore();
  const b = blocks.process ?? {};
  return (
    <section className="section editable" id="process" aria-labelledby="process-title">
      <EditButton slug="process" />
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">{b.eyebrow}</p>
          <h2 className="h2" id="process-title">{b.title}</h2>
          <p className="lead">{b.lead}</p>
        </div>
        <ol className="process">
          {(b.steps ?? []).map((s: any, i: number) => (
            <li className="step reveal" key={i}><span className="idx">{pad(i + 1)}</span><h3>{s.title}</h3><p>{s.text}</p></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Docs() {
  const { blocks } = useStore();
  const b = blocks.docs ?? {};
  return (
    <section className="section on-dark editable" id="certificates" aria-labelledby="certificates-title">
      <EditButton slug="docs" />
      <div className="container docs-layout">
        <div className="reveal">
          <p className="eyebrow">{b.eyebrow}</p>
          <h2 className="h2" id="certificates-title" style={{ marginTop: '1rem' }}>{b.title}</h2>
          <p className="lead">{b.lead}</p>
        </div>
        <div className="doc-list">
          {(b.items ?? []).map((d: any, i: number) => (
            <a className="doc reveal" href={d.href || '#contacts'} key={i}>
              <Svg html={d.icon} />
              <div><h3>{d.title}</h3><p>{d.text}</p></div>
              <span className="doc-tag">{d.tag}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Contacts() {
  const { blocks, openPrivacy } = useStore();
  const b = blocks.contacts ?? {};
  const f = b.form ?? {};
  const site = blocks.site ?? {};
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'fail'>('idle');

  const [before, after] = f.consent_link && f.consent?.includes(f.consent_link) ? (f.consent as string).split(f.consent_link) : [f.consent, null];
  const consentText = after === null ? before : (
    <>{before}<button type="button" className="link-btn" onClick={() => openPrivacy(true)}>{f.consent_link}</button>{after}</>
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStatus('sending');
    try {
      await api.sendRequest(Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)])));
      form.reset();
      setStatus('ok');
    } catch {
      setStatus('fail');
    }
  }

  return (
    <section className="section contacts editable" id="contacts" aria-labelledby="contacts-title">
      <EditButton slug="contacts" />
      <div className="container contacts-layout">
        <div className="reveal">
          <p className="eyebrow">{b.eyebrow}</p>
          <h2 className="h2" id="contacts-title" style={{ marginTop: '1rem' }}>{b.title}</h2>
          <p className="lead">{b.lead}</p>
          <dl className="contact-lines">
            <div><dt>{b.email_label}</dt><dd><a href={`mailto:${site.email}`}>{site.email}</a></dd></div>
            <div><dt>{b.phone_label}</dt><dd><a href={site.phone_link}>{site.phone}</a></dd></div>
          </dl>
        </div>
        <form className="contact-form reveal" onSubmit={submit} onChange={() => status !== 'sending' && setStatus('idle')}>
          <p className="form-title">{f.title}</p>
          <label className="field">{f.name_label}<input name="name" autoComplete="name" maxLength={90} required /></label>
          <label className="field">{f.phone_label}<input type="tel" name="phone" autoComplete="tel" maxLength={32} required /></label>
          <label className="field form-wide">{f.company_label}<input name="company" autoComplete="organization" maxLength={120} /></label>
          <label className="field form-wide">{f.message_label}<textarea name="message" rows={4} maxLength={650} required placeholder={f.message_placeholder} /></label>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
          <label className="consent form-wide"><input type="checkbox" required /> <span>{consentText}</span></label>
          <div className="form-actions form-wide">
            <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>{f.submit} <Arrow /></button>
          </div>
          {(status === 'ok' || status === 'fail') && (
            <div className="form-wide form-status"><p role="status">{status === 'ok' ? f.success : f.error}</p></div>
          )}
        </form>
      </div>
    </section>
  );
}

export function Cta() {
  const { blocks } = useStore();
  const b = blocks.cta ?? {};
  return (
    <section className="cta editable" aria-labelledby="cta-title" style={b.bg_url ? { backgroundImage: `url("${b.bg_url}")` } : undefined}>
      <EditButton slug="cta" />
      <div className="container cta-inner">
        <div className="reveal">
          <h2 className="h2" id="cta-title">{b.title}</h2>
          <p>{b.text}</p>
        </div>
        <a className="btn btn-light reveal" href={b.btn_href}>{b.btn_label} <Arrow /></a>
      </div>
    </section>
  );
}
