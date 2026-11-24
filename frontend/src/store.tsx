import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setCsrf, type Block, type Content, type Schema } from './api';

type Store = {
  ready: boolean;
  error: string;
  blocks: Record<string, Block>;
  admin: boolean;
  schemas: Record<string, Schema>;
  editing: string | null;
  edit: (slug: string | null) => void;
  privacyOpen: boolean;
  openPrivacy: (open: boolean) => void;
  save: (slug: string, data: Block) => Promise<void>;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('Store is not provided');
  return s;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [privacyOpen, openPrivacy] = useState(false);
  const edit = useCallback((slug: string | null) => { setEditing(slug); if (slug) openPrivacy(false); }, []);

  const reload = useCallback(async () => {
    try {
      const c = await api.content();
      setCsrf(c.csrf);
      setContent(c);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const save = useCallback(async (slug: string, data: Block) => {
    const res = await api.saveBlock(slug, data);
    setContent(c => (c ? { ...c, blocks: { ...c.blocks, [slug]: res.data } } : c));
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setCsrf('');
    edit(null);
    await reload();
  }, [reload]);

  const value: Store = {
    ready: !!content,
    error,
    blocks: content?.blocks ?? {},
    admin: !!content?.admin,
    schemas: content?.schemas ?? {},
    editing, edit, privacyOpen, openPrivacy, save, reload, logout,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
