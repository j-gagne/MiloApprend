// Tab-local recovery only. Never read by the effective program or game session.
export const PARENT_DRAFT_PREFIX = 'milo-apprend.parent-draft.v1:';
export const PARENT_NAV_KEY = 'milo-apprend.parent-navigation.v1';
interface Storage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const parentTabs = ['Aperçu', 'Programme', 'Exercices', 'Réglages', 'Test audio'] as const;
export type ParentTab = typeof parentTabs[number];
export interface ParentNavigation {
  active: boolean; tab: ParentTab; editorKey?: string;
}
export function draftIdentity(type: string, id: string, exists: boolean) {
  return `${type}:${exists ? 'edit' : 'new'}:${id}`;
}
export function createParentDraftStore(storage: () => Storage) {
  function read<T>(key: string): T | undefined {
    try { const raw = storage().getItem(key); return raw ? JSON.parse(raw) as T : undefined; } catch { return undefined; }
  }
  function write(key: string, value: unknown) {
    try { storage().setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }
  return {
    load(key: string): Record<string, unknown> | undefined {
      const value = read<{ fields?: Record<string, unknown> }>(PARENT_DRAFT_PREFIX + key);
      return value?.fields && typeof value.fields === 'object' && !Array.isArray(value.fields) ? value.fields : undefined;
    },
    save: (key: string, fields: Record<string, unknown>) => write(PARENT_DRAFT_PREFIX + key, { fields }),
    remove(key: string) { try { storage().removeItem(PARENT_DRAFT_PREFIX + key); } catch { /* Remain usable without storage. */ } },
    navigation(): ParentNavigation {
      const value = read<ParentNavigation>(PARENT_NAV_KEY);
      return value && typeof value.active === 'boolean' && parentTabs.includes(value.tab)
        && (value.editorKey === undefined || typeof value.editorKey === 'string')
        ? value : { active: false, tab: 'Aperçu' };
    },
    navigate: (value: ParentNavigation) => write(PARENT_NAV_KEY, value),
  };
}
export const parentDrafts = createParentDraftStore(() => window.sessionStorage);
