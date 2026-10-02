import type { ContentRepository } from './repository.ts';
import { contentRepository } from './repository.ts';
import { activeWeek } from './settings.ts';
import * as selectors from './selectors.ts';
import { validateProgram } from './validation.ts';
import type { ExerciseScope } from './model.ts';
import { readingCatalog } from './reading-catalog.ts';

export function createContentService(repository: ContentRepository, week = activeWeek, exerciseScope: ExerciseScope = { mode: 'all', selectedWeeks: [] }) {
  return {
    exerciseScope,
    activeWeek: week,
    getProgram: () => repository.getProgram(),
    getReadingExercises: () => readingCatalog(repository.getProgram(), week, exerciseScope),
    getAvailableLetters: (at = week) => selectors.getAvailableLetters(repository.getProgram(), at),
    getAvailableGraphemes: (at = week) => selectors.getAvailableGraphemes(repository.getProgram(), at),
    getAvailableSounds: (at = week) => selectors.getAvailableSounds(repository.getProgram(), at),
    getAvailableSyllables: (at = week) => selectors.getAvailableSyllables(repository.getProgram(), at),
    getAvailableWords: (at = week) => selectors.getAvailableWords(repository.getProgram(), at),
    getAvailableToolWords: (at = week) => selectors.getAvailableToolWords(repository.getProgram(), at),
    getAvailableSentences: (at = week) => selectors.getAvailableSentences(repository.getProgram(), at),
    validate: () => {
      const program = repository.getProgram();
      const issues = validateProgram(program);
      if (!selectors.isValidWeek(program, week)) issues.push({ severity: 'error', code: 'invalid-week',
        path: 'activeWeek', message: `Semaine active ${week} inconnue.` });
      return issues;
    },
  };
}
export type ContentService = ReturnType<typeof createContentService>;
export const contentService = createContentService(contentRepository);
