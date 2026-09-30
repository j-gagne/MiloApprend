import { getCharacter, type CharacterId } from '../game/characters.ts';
import type { KeyValueStorage } from './parent-store.ts';
import { advanceEgg, acknowledgeEgg, emptyEggRewards, isEggRewards, type EggRewards } from '../game/egg-rewards.ts';
export const DEFAULT_PLAYER_NAME = 'Milo';
export const MAX_PLAYER_NAME_LENGTH = 20;
export function normalizePlayerName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  return name && Array.from(name).length <= MAX_PLAYER_NAME_LENGTH ? name : undefined;
}
export interface Progress { completedSessions: number; selectedCharacterId?: CharacterId; playerName?: string; eggRewards?: EggRewards }
export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): boolean;
  reset(): { progress: Progress; saved: boolean };
  completeSession(sessionId: string): { progress: Progress; saved: boolean };
  acknowledgeEgg(sessionId: string): { progress: Progress; saved: boolean };
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
          ...('eggRewards' in value && isEggRewards(value.eggRewards) ? { eggRewards: value.eggRewards } : {}),
          ...('playerName' in value && normalizePlayerName(value.playerName) ? { playerName: normalizePlayerName(value.playerName) } : {}) };
    } catch { /* Le jeu reste disponible si le stockage est bloqué. */ }
    return { completedSessions: 0, selectedCharacterId: getCharacter(undefined).id };
  },
  save(progress) {
    try { storage().setItem(key, JSON.stringify(progress)); return true; }
    catch { return false; }
  },
  reset() {
    const progress: Progress = { completedSessions: 0, selectedCharacterId: getCharacter(undefined).id };
    return { progress, saved: this.save(progress) };
  },
  completeSession(sessionId) {
    const progress = this.load();
    const before = progress.eggRewards ?? emptyEggRewards(getCharacter(progress.selectedCharacterId).id);
    const after = advanceEgg(before, sessionId, new Date().toISOString());
    if (after === before) return { progress, saved: before.completedSessionIds.includes(sessionId) };
    const next = { ...progress, completedSessions: progress.completedSessions + 1, eggRewards: after };
    return { progress: next, saved: this.save(next) };
  },
  acknowledgeEgg(sessionId) {
    const progress = this.load();
    if (!progress.eggRewards) return { progress, saved: false };
    const after = acknowledgeEgg(progress.eggRewards, sessionId, getCharacter(progress.selectedCharacterId).id);
    if (after === progress.eggRewards) return { progress, saved: !after.pendingTransition };
    const next = { ...progress, eggRewards: after };
    return { progress: next, saved: this.save(next) };
  },
}; }
export const progressStore = createProgressStore(() => localStorage);
