import { useStore } from '../store';

export function EditButton({ slug, variant = '' }: { slug: string; variant?: '' | 'hero' | 'inline' }) {
  const { admin, schemas, edit } = useStore();
  if (!admin || !schemas[slug]) return null;
  const title = `Редактировать: ${schemas[slug].title}`;
  return (
    <button type="button" className={`edit-btn ${variant ? `edit-btn--${variant}` : ''}`} onClick={() => edit(slug)} aria-label={title} title={title}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13.5 3.5l3 3L7 16H4v-3z" /><path d="M11.5 5.5l3 3" />
      </svg>
    </button>
  );
}
