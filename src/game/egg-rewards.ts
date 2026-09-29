export const SESSIONS_TO_HATCH = 5;
export interface HatchRecord { id: string; animalId: string; hatchedAt: string }
export interface EggRewards {
  currentEgg: { progress: number; sessionsToHatch: number; pendingAnimalId: string };
  completedSessionIds: string[];
  hatches: HatchRecord[];
  pendingTransition?: { sessionId: string; progress: number; sessionsToHatch: number; animalId: string };
}
export function newEgg() { return { progress: 0, sessionsToHatch: SESSIONS_TO_HATCH, pendingAnimalId: 'dinosaur' }; }
export function emptyEggRewards(): EggRewards { return { currentEgg: newEgg(), completedSessionIds: [], hatches: [] }; }
export function advanceEgg(state: EggRewards, sessionId: string, now: string): EggRewards {
  if (state.completedSessionIds.includes(sessionId)) return state;
  // The UI must acknowledge the previous transition before starting another session.
  if (state.pendingTransition) return state;
  const currentEgg = { ...state.currentEgg, progress: state.currentEgg.progress + 1 };
  const hatch = currentEgg.progress === currentEgg.sessionsToHatch
    ? { id: `hatch:${sessionId}`, animalId: currentEgg.pendingAnimalId, hatchedAt: now } : undefined;
  return { currentEgg, completedSessionIds: [...state.completedSessionIds, sessionId],
    hatches: hatch ? [...state.hatches, hatch] : state.hatches,
    pendingTransition: { sessionId, progress: currentEgg.progress, sessionsToHatch: currentEgg.sessionsToHatch, animalId: currentEgg.pendingAnimalId } };
}
export function acknowledgeEgg(state: EggRewards, sessionId: string): EggRewards {
  if (state.pendingTransition?.sessionId !== sessionId) return state;
  const { pendingTransition: _pending, ...acknowledged } = state;
  return { ...acknowledged,
    currentEgg: state.currentEgg.progress === state.currentEgg.sessionsToHatch ? newEgg() : state.currentEgg };
}
// Five approved artwork states, independently of the configurable session threshold.
export function eggVisualStage(progress: number, total: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.ceil(progress / total * 5))) as 1 | 2 | 3 | 4 | 5;
}
export function isEggRewards(value: unknown): value is EggRewards {
  if (!value || typeof value !== 'object') return false;
  const s = value as EggRewards, egg = s.currentEgg;
  return !!egg && Number.isSafeInteger(egg.progress) && Number.isSafeInteger(egg.sessionsToHatch)
    && egg.sessionsToHatch > 0 && egg.progress >= 0 && egg.progress <= egg.sessionsToHatch && typeof egg.pendingAnimalId === 'string'
    && Array.isArray(s.completedSessionIds) && s.completedSessionIds.every(id => typeof id === 'string')
    && Array.isArray(s.hatches) && s.hatches.every(h => h && typeof h.id === 'string' && typeof h.animalId === 'string' && typeof h.hatchedAt === 'string')
    && (!s.pendingTransition || (typeof s.pendingTransition.sessionId === 'string' && s.completedSessionIds.includes(s.pendingTransition.sessionId)
      && s.pendingTransition.progress === egg.progress && s.pendingTransition.sessionsToHatch === egg.sessionsToHatch && s.pendingTransition.animalId === egg.pendingAnimalId));
}
