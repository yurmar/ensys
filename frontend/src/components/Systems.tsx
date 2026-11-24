import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { EditButton } from './EditButton';

const pad = (n: number) => String(n).padStart(2, '0');

export function Systems() {
  const { blocks } = useStore();
  const b = blocks.systems ?? {};
  const ui = blocks.site?.ui ?? {};
  const items: { title: string; name: string; works: string[] }[] = b.items ?? [];
  const root = useRef<HTMLElement>(null);
  const sig = JSON.stringify([items.length, b.hint, b.hint_last]);

  // Механика листания перенесена из макета 1:1 (sticky + выезд карточек по скроллу).
  useEffect(() => {
    const systems = root.current!;
    const header = document.querySelector('.site-header') as HTMLElement;
    const pin = systems.querySelector('.systems-pin') as HTMLElement;
    const track = systems.querySelector('.systems-track') as HTMLElement;
    const cards = [...track.children] as HTMLElement[];
    if (!cards.length) return;
    const links = cards.map((card, order) => {
      card.style.setProperty('--card-column', String(order + 1));
      return card.querySelector('a') as HTMLAnchorElement;
    });
    const descriptions = cards.map(card => card.querySelector('.sys-name')!.textContent ?? '');
    const previous = systems.querySelector('#system-prev') as HTMLButtonElement;
    const next = systems.querySelector('#system-next') as HTMLButtonElement;
    const count = systems.querySelector('#system-count') as HTMLElement;
    const detail = systems.querySelector('#system-detail') as HTMLOutputElement;
    const hint = systems.querySelector('.systems-hint') as HTMLElement;
    const progress = systems.querySelector('.systems-progress') as HTMLElement;
    const bars = [...progress.children] as HTMLElement[];
    const pinControls = [systems.querySelector('.systems-controls') as HTMLElement, hint, detail, progress];
    const tallViewport = matchMedia('(min-height: 36rem)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const supportsStack = CSS.supports('grid-template-columns', 'subgrid');
    let scrollStep = 0;
    let currentCard = -1;
    let scrollFrame = 0;

    const n = cards.length;
    const weights = n === 6 ? [1, 0.78, 1.22, 1, 1.7, 2.2] : cards.map((_, i) => 0.8 + 1.4 * Math.pow(n > 1 ? i / (n - 1) : 1, 1.6));
    systems.style.setProperty('--pin-cols', weights.map(w => `${w}fr`).join(' '));

    function setCurrentCard(position: number) {
      if (position === currentCard) return;
      links[currentCard]?.removeAttribute('aria-current');
      cards[currentCard]?.classList.remove('is-current');
      links[position]?.setAttribute('aria-current', 'true');
      cards[position]?.classList.add('is-current');
      currentCard = position;
      previous.disabled = position <= 0;
      next.disabled = position < 0 || position >= cards.length - 1;
      count.innerHTML = position < 0 ? '' : `<b>${pad(position + 1)}</b> / ${pad(cards.length)}`;
      detail.value = descriptions[position] ?? '';
      bars.forEach((bar, i) => { bar.classList.toggle('on', i < position); bar.classList.toggle('now', i === position); });
      hint.textContent = position === cards.length - 1 ? b.hint_last : b.hint;
    }

    function renderScroll() {
      scrollFrame = 0;
      if (!scrollStep) return;
      const headerBottom = header.getBoundingClientRect().bottom;
      const fromStart = headerBottom - systems.getBoundingClientRect().top;
      const position = Math.max(0, Math.min(cards.length - 1, fromStart / scrollStep));
      cards.forEach((card, order) => {
        const remaining = Math.max(0, Math.min(1, order - position));
        const eased = remaining * remaining * (3 - 2 * remaining);
        const settled = fromStart >= order * scrollStep - 0.75;
        card.style.setProperty('--card-slide', `${eased * 100}%`);
        card.classList.toggle('is-settled', settled);
        card.inert = order > 0 && !settled;
      });
      setCurrentCard(Math.min(cards.length - 1, Math.floor(position + 0.75 / scrollStep)));
    }

    function configure() {
      const canPin = supportsStack && tallViewport.matches && !reducedMotion.matches;
      systems.classList.toggle('is-pinned', canPin);
      pinControls.forEach(c => { c.hidden = !canPin; });
      progress.hidden = !canPin;
      (systems.querySelector('.systems-controls') as HTMLElement).hidden = !canPin;
      const available = innerHeight - header.getBoundingClientRect().height;
      if (!canPin || pin.getBoundingClientRect().height > available + 2) {
        systems.classList.remove('is-pinned');
        systems.style.removeProperty('--systems-scroll-distance');
        pinControls.forEach(c => { c.hidden = true; });
        cards.forEach(card => { card.inert = false; });
        scrollStep = 0;
        setCurrentCard(-1);
      } else {
        scrollStep = Math.round(Math.min(430, Math.max(245, innerHeight * 0.41)));
        systems.style.setProperty('--systems-scroll-distance', `${scrollStep * (cards.length - 1)}px`);
      }
      renderScroll();
    }

    function scrollToCard(position: number, behavior: ScrollBehavior = 'smooth') {
      if (!scrollStep || position < 0 || position >= cards.length) return;
      const start = scrollY + systems.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
      window.scrollTo({ top: start + position * scrollStep, behavior });
    }

    const onScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(renderScroll); };
    const onPrev = () => scrollToCard(currentCard - 1);
    const onNext = () => scrollToCard(currentCard + 1);
    const onTrack = (event: MouseEvent) => {
      const position = links.indexOf((event.target as HTMLElement).closest('a') as HTMLAnchorElement);
      if (position < 0 || !scrollStep || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      scrollToCard(position);
    };
    const openLinkedCard = () => {
      const position = links.findIndex(l => l.hash === location.hash);
      if (position >= 0) requestAnimationFrame(() => scrollToCard(position, 'instant' as ScrollBehavior));
    };

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', configure);
    tallViewport.addEventListener('change', configure);
    reducedMotion.addEventListener('change', configure);
    previous.addEventListener('click', onPrev);
    next.addEventListener('click', onNext);
    track.addEventListener('click', onTrack);
    addEventListener('pageshow', openLinkedCard);
    addEventListener('hashchange', openLinkedCard);
    configure();
    openLinkedCard();

    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', configure);
      tallViewport.removeEventListener('change', configure);
      reducedMotion.removeEventListener('change', configure);
      previous.removeEventListener('click', onPrev);
      next.removeEventListener('click', onNext);
      track.removeEventListener('click', onTrack);
      removeEventListener('pageshow', openLinkedCard);
      removeEventListener('hashchange', openLinkedCard);
      cancelAnimationFrame(scrollFrame);
      systems.classList.remove('is-pinned');
      systems.style.removeProperty('--systems-scroll-distance');
    };
  }, [sig]);

  return (
    <section className="systems" id="systems" aria-labelledby="systems-title" ref={root}>
      <div className="systems-pin">
        <EditButton slug="systems" />
        <div className="container">
          <div className="systems-heading">
            <div>
              <p className="eyebrow" style={{ color: 'var(--sky)' }}>{b.eyebrow}</p>
              <h2 className="h2" id="systems-title">{b.title}</h2>
            </div>
            <div className="systems-controls" role="group" aria-label={ui.systems_nav} hidden>
              <button type="button" id="system-prev" aria-label={ui.systems_prev}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M17 10H4M9 4l-6 6 6 6" /></svg></button>
              <output className="systems-count" id="system-count" />
              <button type="button" id="system-next" aria-label={ui.systems_next}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 10h13M11 4l6 6-6 6" /></svg></button>
            </div>
          </div>
          <div className="systems-progress" aria-hidden="true" hidden style={{ gridTemplateColumns: `repeat(${items.length || 1}, 1fr)` }}>
            {items.map((_, i) => <i key={i} />)}
          </div>
          <p className="systems-hint" hidden>{b.hint}</p>
          <div className="systems-viewport">
            <div className="systems-track">
              {items.map((it, i) => (
                <article className="system-card" id={`system-${i + 1}`} key={i}>
                  <div className="sys-head"><span className="sys-idx">{pad(i + 1)}</span><h3><a href={`#system-${i + 1}`}>{it.title}</a></h3><p className="sys-name">{it.name}</p></div>
                  <div className="sys-body" aria-hidden="true"><p className="sys-name">{it.name}</p><ul className="sys-works">{(it.works ?? []).map((w, j) => <li key={j}>{w}</li>)}</ul></div>
                </article>
              ))}
            </div>
          </div>
          <output className="systems-detail" id="system-detail" hidden />
        </div>
      </div>
    </section>
  );
}
