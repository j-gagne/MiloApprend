import type { SessionProgress } from './session-progress.ts';

// Local visuals only. Replace a visual here without changing selection or persistence.
export const characterCatalog = [
  { id: 'dinosaur', name: 'Dinosaure', visual: { kind: 'dinosaur' } },
  { id: 'lion', name: 'Lion', visual: { kind: 'emoji', value: '🦁' } },
  { id: 'monkey', name: 'Singe', visual: { kind: 'emoji', value: '🐵' } },
  { id: 'tiger', name: 'Tigre', visual: { kind: 'emoji', value: '🐯' } },
  { id: 'unicorn', name: 'Licorne', visual: { kind: 'emoji', value: '🦄' } },
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
