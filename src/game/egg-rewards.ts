import { isVariantId, selectVariant, type VariantId } from './character-variants.ts';
export const SESSIONS_TO_HATCH = 5;
export interface HatchRecord { id: string; animalId: string; variantId?: VariantId; hatchedAt: string }
export interface EggRewards {
  currentEgg: { progress: number; sessionsToHatch: number; pendingAnimalId: string; pendingVariantId?: VariantId };
  completedSessionIds: string[];
  hatches: HatchRecord[];
  pendingTransition?: { sessionId: string; progress: number; sessionsToHatch: number; animalId: string };
}
export function newEgg(animalId = 'dinosaur', hatches: readonly HatchRecord[] = [], rng: () => number = Math.random) {
  return { progress: 0, sessionsToHatch: SESSIONS_TO_HATCH, pendingAnimalId: animalId, pendingVariantId: selectVariant(animalId, hatches, rng) };
}
export function emptyEggRewards(animalId = 'dinosaur', rng: () => number = Math.random): EggRewards { return { currentEgg: newEgg(animalId, [], rng), completedSessionIds: [], hatches: [] }; }
export function advanceEgg(state: EggRewards, sessionId: string, now: string): EggRewards {
  if (state.completedSessionIds.includes(sessionId)) return state;
  // The UI must acknowledge the previous transition before starting another session.
  if (state.pendingTransition) return state;
  const currentEgg = { ...state.currentEgg, pendingVariantId: state.currentEgg.pendingVariantId ?? 'normal', progress: state.currentEgg.progress + 1 };
  const hatch = currentEgg.progress === currentEgg.sessionsToHatch
    ? { id: `hatch:${sessionId}`, animalId: currentEgg.pendingAnimalId, variantId: currentEgg.pendingVariantId, hatchedAt: now } : undefined;
  return { currentEgg, completedSessionIds: [...state.completedSessionIds, sessionId],
    hatches: hatch ? [...state.hatches, hatch] : state.hatches,
    pendingTransition: { sessionId, progress: currentEgg.progress, sessionsToHatch: currentEgg.sessionsToHatch, animalId: currentEgg.pendingAnimalId } };
}
export function acknowledgeEgg(state: EggRewards, sessionId: string, nextAnimalId = 'dinosaur', rng: () => number = Math.random): EggRewards {
  if (state.pendingTransition?.sessionId !== sessionId) return state;
  const { pendingTransition: _pending, ...acknowledged } = state;
  return { ...acknowledged,
    currentEgg: state.currentEgg.progress === state.currentEgg.sessionsToHatch ? newEgg(nextAnimalId, state.hatches, rng) : state.currentEgg };
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
    && (egg.pendingVariantId === undefined || isVariantId(egg.pendingVariantId))
    && Array.isArray(s.completedSessionIds) && s.completedSessionIds.every(id => typeof id === 'string')
    && Array.isArray(s.hatches) && s.hatches.every(h => h && typeof h.id === 'string' && typeof h.animalId === 'string' && typeof h.hatchedAt === 'string'
      && (h.variantId === undefined || isVariantId(h.variantId)))
    && (!s.pendingTransition || (typeof s.pendingTransition.sessionId === 'string' && s.completedSessionIds.includes(s.pendingTransition.sessionId)
      && s.pendingTransition.progress === egg.progress && s.pendingTransition.sessionsToHatch === egg.sessionsToHatch && s.pendingTransition.animalId === egg.pendingAnimalId));
}
