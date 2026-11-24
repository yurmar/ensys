import { useEffect } from 'react';
import { useStore } from './store';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Systems } from './components/Systems';
import { Services, Process, Docs, Contacts, Cta } from './components/Sections';
import { Footer } from './components/Footer';
import { EditModal } from './components/EditModal';
import { AdminBar } from './components/AdminBar';
import { Login } from './components/Login';

export function App() {
  const { ready, error, blocks } = useStore();
  const site = blocks.site;

  useEffect(() => {
    if (!site) return;
    document.title = site.meta_title || site.brand_name;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
    m.setAttribute('content', site.meta_description || '');
  }, [site]);

  // Появление блоков при скролле
  useEffect(() => {
    if (!ready) return;
    const els = [...document.querySelectorAll('.reveal:not(.is-in)')];
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, [ready, blocks]);

  if (location.pathname.replace(/\/+$/, '') === '/enterforadmin') return <Login />;
  if (error) return <p className="boot-error">Не удалось загрузить сайт: {error}</p>;
  if (!ready) return null;

  return (
    <>
      <a className="skip-link" href="#main">{site?.ui?.skip_link}</a>
      <Header />
      <main id="main">
        <Hero />
        <Services />
        <Systems />
        <Process />
        <Docs />
        <Contacts />
        <Cta />
      </main>
      <Footer />
      <EditModal />
      <AdminBar />
    </>
  );
}
