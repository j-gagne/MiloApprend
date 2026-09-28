import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { parentDrafts } from '../../services/parent-drafts';

interface DraftContext { fields: Record<string, unknown>; write: (field: string, value: unknown) => void }
const Context = createContext<DraftContext | undefined>(undefined);
export function ParentDraft({ id, onDirty, children, editor }: { id: string; onDirty: () => void; children: ReactNode; editor?: unknown }) {
  const [restored] = useState(() => parentDrafts.load(id));
  const fields = useRef(restored ?? {});
  const [failed, setFailed] = useState(false);
  const notify = useRef(onDirty); notify.current = onDirty;
  useEffect(() => { if (restored) notify.current(); }, [restored]);
  function write(field: string, value: unknown) {
    fields.current = { ...fields.current, $editor: editor, [field]: value };
    // Synchronous in the input handler: no debounce, unload handler or unmount cleanup.
    setFailed(!parentDrafts.save(id, fields.current)); notify.current();
  }
  return <Context.Provider value={{ fields: fields.current, write }}>
    {restored && <p role="status" className="parent-notice">Brouillon restauré</p>}
    {failed && <p role="status" className="parent-errors">Brouillon non protégé : stockage de cet onglet indisponible.</p>}
    {children}
  </Context.Provider>;
}

// Also usable by nested block editors. Missing optional values are stored as null.
export function useDraftField<T>(field: string, initial: T): [T, (value: T) => void] {
  const context = useContext(Context);
  const [value, setValue] = useState<T>(() => {
    if (!context || !(field in context.fields)) return initial;
    const saved = context.fields[field];
    return saved === null ? undefined as T : saved as T;
  });
  const change = (next: T) => { context?.write(field, next === undefined ? null : next); setValue(next); };
  return [value, change];
}
