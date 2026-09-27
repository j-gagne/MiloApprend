import { getCharacter, type CharacterId } from '../game/characters.ts';
import type { KeyValueStorage } from './parent-store.ts';
export interface Progress { completedSessions: number; selectedCharacterId?: CharacterId }
export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): boolean;
}
const key = 'milo-apprend.progress.v1';
export function createProgressStore(storage: () => KeyValueStorage): ProgressStore { return {
  load() {
    try {
      const value: unknown = JSON.parse(storage().getItem(key) ?? 'null');
      if (value && typeof value === 'object' && 'completedSessions' in value
        && typeof value.completedSessions === 'number' && Number.isSafeInteger(value.completedSessions)
        && value.completedSessions >= 0) return { completedSessions: value.completedSessions,
          selectedCharacterId: getCharacter('selectedCharacterId' in value ? value.selectedCharacterId : undefined).id };
    } catch { /* Le jeu reste disponible si le stockage est bloqué. */ }
    return { completedSessions: 0, selectedCharacterId: getCharacter(undefined).id };
  },
  save(progress) {
    try { storage().setItem(key, JSON.stringify(progress)); return true; }
    catch { return false; }
  },
}; }
export const progressStore = createProgressStore(() => localStorage);
