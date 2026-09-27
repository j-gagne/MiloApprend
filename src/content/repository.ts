import type { LearningProgram } from './model.ts';
import { initialProgram } from './program.ts';

export interface ContentRepository {
  getProgram(): LearningProgram;
}

// Dépôt en mémoire ; aucune connaissance des composants, activités ou scores.
// Un futur dépôt IndexedDB pourra fournir un instantané chargé au démarrage.
export function createContentRepository(program: LearningProgram): ContentRepository {
  return { getProgram: () => program };
}
export const contentRepository = createContentRepository(initialProgram);
