import { getCharacter, type CharacterId } from '../game/characters.ts';
import type { KeyValueStorage } from './parent-store.ts';
export const DEFAULT_PLAYER_NAME = 'Milo';
export const MAX_PLAYER_NAME_LENGTH = 20;
export function normalizePlayerName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  return name && Array.from(name).length <= MAX_PLAYER_NAME_LENGTH ? name : undefined;
}
export interface Progress { completedSessions: number; selectedCharacterId?: CharacterId; playerName?: string }
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
          selectedCharacterId: getCharacter('selectedCharacterId' in value ? value.selectedCharacterId : undefined).id,
          ...('playerName' in value && normalizePlayerName(value.playerName) ? { playerName: normalizePlayerName(value.playerName) } : {}) };
    } catch { /* Le jeu reste disponible si le stockage est bloqué. */ }
    return { completedSessions: 0, selectedCharacterId: getCharacter(undefined).id };
  },
  save(progress) {
    try { storage().setItem(key, JSON.stringify(progress)); return true; }
    catch { return false; }
  },
}; }
export const progressStore = createProgressStore(() => localStorage);
