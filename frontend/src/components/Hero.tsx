import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Arrow } from './Logo';
import { EditButton } from './EditButton';

export function Hero() {
  const { blocks } = useStore();
  const h = blocks.hero ?? {};
  const ui = blocks.site?.ui ?? {};
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setReduced(mq.matches);
      const v = video.current;
      if (!v) return;
      v.defaultPlaybackRate = 0.6;
      v.playbackRate = 0.6;
      if (mq.matches) v.pause(); else v.play().catch(() => setPaused(true));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [h.video_url]);

  return (
    <section className="hero on-dark" id="team" aria-labelledby="hero-title" style={h.poster_url ? { backgroundImage: `url("${h.poster_url}")` } : undefined}>
      {h.video_url && (
        <video ref={video} autoPlay muted loop playsInline preload="metadata" poster={h.poster_url} aria-hidden="true"
          onPlay={() => setPaused(false)} onPause={() => setPaused(true)}>
          <source src={h.video_url} type="video/mp4" />
        </video>
      )}
      <EditButton slug="hero" variant="hero" />
      <div className="hero-body container">
        <p className="eyebrow">{h.eyebrow}</p>
        <h1 className="h1 hero-title" id="hero-title">{h.title} <span>{h.title_accent}</span></h1>
        <p className="lead">{h.lead}</p>
        <div className="hero-actions">
          <a className="btn btn-light" href={h.btn_primary_href}>{h.btn_primary_label}<Arrow /></a>
          <a className="btn btn-ghost" href={h.btn_secondary_href}>{h.btn_secondary_label}</a>
        </div>
      </div>
      <div className="hero-facts">
        <ul className="container">
          {(h.facts ?? []).map((f: any, i: number) => (
            <li key={i}><span className="fact-value">{f.value}</span><span className="fact-label">{f.label}</span></li>
          ))}
        </ul>
      </div>
      {h.video_url && !reduced && (
        <button type="button" className="video-toggle" onClick={() => { const v = video.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); }}>
          {paused ? ui.video_play : ui.video_pause}
        </button>
      )}
    </section>
  );
}
