import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Brand } from './Logo';
import { EditButton } from './EditButton';

export function Header() {
  const { blocks } = useStore();
  const s = blocks.site ?? {};
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(-1);
  const ref = useRef<HTMLElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const nav: { label: string; href: string }[] = s.nav ?? [];

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const bottom = ref.current?.getBoundingClientRect().bottom ?? 0;
      let found = -1;
      nav.forEach((n, i) => {
        const el = n.href.startsWith('#') && n.href.length > 1 ? document.querySelector(n.href) : null;
        if (el && el.getBoundingClientRect().top <= bottom + 24) found = i;
      });
      setCurrent(found);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [nav.length, nav.map(n => n.href).join('|')]);

  return (
    <header
      ref={ref}
      className={`site-header ${open ? 'menu-open' : ''}`}
      onKeyDown={e => { if (e.key === 'Escape' && open) { setOpen(false); btn.current?.focus(); } }}
    >
      <div className="header-inner container">
        <Brand />
        <nav className="primary-nav" id="primary-nav" aria-label={s.ui?.nav_label} onClick={e => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
          {nav.map((n, i) => (
            <a key={i} href={n.href} aria-current={i === current ? 'location' : undefined}>{n.label}</a>
          ))}
        </nav>
        <div className="header-actions">
          <a className="header-email" href={`mailto:${s.email}`}>{s.email}</a>
          <a className="btn btn-primary btn-sm" href={s.cta_href} data-short={s.cta_mobile_label}><span>{s.cta_label}</span></a>
          <EditButton slug="site" variant="inline" />
          <button ref={btn} className="nav-toggle" type="button" aria-controls="primary-nav" aria-expanded={open} aria-label={s.ui?.menu_label} onClick={() => setOpen(o => !o)}>
            <span className="nav-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
