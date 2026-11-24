import { useStore } from '../store';

export function Brand({ variant = 'color' }: { variant?: 'color' | 'white' }) {
  const { blocks } = useStore();
  const s = blocks.site ?? {};
  return (
    <a className="brand" href="#top" aria-label={s.ui?.home_label}>
      <img src={`/assets/ensys-mark-${variant}.svg`} alt="" width="854" height="599" />
      <span className="brand-text">
        <span className="brand-name">{s.brand_name}</span>
        <span className="brand-sub">{s.brand_sub}</span>
      </span>
    </a>
  );
}

export function Arrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 10h13M11 4l6 6-6 6" />
    </svg>
  );
}

export function Svg({ html, className }: { html?: string; className?: string }) {
  if (!html) return null;
  const withClass = className ? html.replace(/^<svg/i, `<svg class="${className}"`) : html;
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: withClass }} />;
}
