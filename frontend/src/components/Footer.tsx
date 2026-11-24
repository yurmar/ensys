import { useStore } from '../store';
import { Brand } from './Logo';
import { EditButton } from './EditButton';

export function Footer() {
  const { blocks, openPrivacy } = useStore();
  const f = blocks.footer ?? {};
  const site = blocks.site ?? {};
  return (
    <footer className="site-footer editable">
      <EditButton slug="footer" />
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand variant="white" />
            <p style={{ marginTop: '1.25rem', maxWidth: '34ch' }}>{f.description}</p>
          </div>
          <div>
            <h4>{f.links_title}</h4>
            <ul>{(f.links ?? []).map((l: any, i: number) => <li key={i}><a href={l.href}>{l.label}</a></li>)}</ul>
          </div>
          <div>
            <h4>{f.requisites_title}</h4>
            <ul>
              {(f.requisites ?? []).map((r: any, i: number) => (
                <li key={i}>{r.label ? `${r.label} ` : ''}{r.pending ? <span className="ph">{r.value}</span> : r.value}</li>
              ))}
              <li><a href={`mailto:${site.email}`}>{site.email}</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{f.copyright}</span>
          {f.credit_href && <span>{f.credit_text} <a href={f.credit_href} target="_blank" rel="noopener noreferrer">{f.credit_label}</a></span>}
          <button type="button" className="link-btn" onClick={() => openPrivacy(true)}>{f.privacy_label}</button>
        </div>
      </div>
    </footer>
  );
}
