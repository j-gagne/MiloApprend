import { themes } from './themes.ts';
import type { SessionProgress } from './session-progress.ts';

// Local visuals only. Replace a visual here without changing selection or persistence.
export const characterCatalog = [
  { id: 'dinosaur', theme: themes.dinosaur, name: 'Dinosaure', voiceProfile: { pitch: 0.9, rateMultiplier: 1 }, visual: { kind: 'dinosaur' } },
  { id: 'lion', theme: themes.lion, name: 'Lion', voiceProfile: { pitch: 0.8, rateMultiplier: 0.95 }, visual: { kind: 'emoji', value: '🦁' } },
  { id: 'monkey', theme: themes.monkey, name: 'Singe', voiceProfile: { pitch: 1.15, rateMultiplier: 1.05 }, visual: { kind: 'emoji', value: '🐵' } },
  { id: 'tiger', theme: themes.tiger, name: 'Tigre', voiceProfile: { pitch: 0.95, rateMultiplier: 1 }, visual: { kind: 'emoji', value: '🐯' } },
  { id: 'unicorn', theme: themes.unicorn, name: 'Licorne', voiceProfile: { pitch: 1.2, rateMultiplier: 1 }, visual: { kind: 'emoji', value: '🦄' } },
  { id: 'rabbit', theme: themes.rabbit, name: 'Lapin', voiceProfile: { pitch: 1.1, rateMultiplier: 0.98 }, visual: { kind: 'emoji', value: '🐰' } },
] as const;
export type ChildCharacter = typeof characterCatalog[number];
export type CharacterId = ChildCharacter['id'];
export const DEFAULT_CHARACTER_ID: CharacterId = 'dinosaur';

export function getCharacter(id: unknown): ChildCharacter {
  return characterCatalog.find((character) => character.id === id) ?? characterCatalog[0];
}

export function characterPosition(progress: Pick<SessionProgress, 'completedTargets' | 'totalTargets'>): number {
  return progress.totalTargets > 0 ? Math.max(0, Math.min(1, progress.completedTargets / progress.totalTargets)) : 0;
}
