import type { ContentService } from './service.ts';
import { isAvailable } from './selectors.ts';
import { DEFAULT_QUESTION_COUNT } from '../game/play-settings.ts';
import type { ReadingExercise } from '../game/reading-session.ts';

// Temporary explicit demo source, separate from the Reading screen and school program.
const sequence = [['letter-m'], ['letter-a'], ['letter-m', 'letter-a'], ['syllable-ma'],
  ['letter-l'], ['letter-i'], ['syllable-li'], ['syllable-la'], ['syllable-mi']];
// Authorized preview-only grouping, independent of the pedagogical program.
const phrase: ReadingExercise = { id: 'reading-preview-3', displayedUnits: [
  { display: 'Il', segments: [{ unitId: 'reading-preview-phrase-0', text: 'Il' }] },
  { display: 'a', segments: [{ unitId: 'reading-preview-phrase-1', text: 'a' }] },
  { display: 'vu', segments: [{ unitId: 'reading-preview-phrase-2', text: 'vu' }] },
  { display: 'le', segments: [{ unitId: 'reading-preview-phrase-3', text: 'le' }] },
  { display: 'lila.', segments: [{ unitId: 'reading-preview-phrase-4', text: 'li' }, { unitId: 'reading-preview-phrase-5', text: 'la' }] },
] };
const longPhrase: ReadingExercise = { id: 'reading-preview-long-phrase', displayedUnits: [
  { display: 'Le', segments: [{ unitId: 'reading-preview-long-0', text: 'Le' }] },
  { display: 'lion', segments: [{ unitId: 'reading-preview-long-1', text: 'lion' }] },
  { display: 'se', segments: [{ unitId: 'reading-preview-long-2', text: 'se' }] },
  { display: 'promène', segments: [{ unitId: 'reading-preview-long-3', text: 'promène' }] },
  { display: 'dans', segments: [{ unitId: 'reading-preview-long-4', text: 'dans' }] },
  { display: 'la', segments: [{ unitId: 'reading-preview-long-5', text: 'la' }] },
  { display: 'savane.', segments: [{ unitId: 'reading-preview-long-6', text: 'savane' }] },
] };
export function readingPreviewExercises(service: ContentService, count = DEFAULT_QUESTION_COUNT): readonly ReadingExercise[] {
  const program = service.getProgram();
  const exercises = sequence.flatMap((ids, index) => {
    const units = ids.map(id => program.units.find(unit => unit.id === id));
    if (units.some(unit => !unit || !isAvailable(program, unit, service.activeWeek))) return [];
    return [{ id: `reading-preview-${index}`, displayedUnits: units.map(unit => ({ display: unit!.display,
      segments: [{ unitId: unit!.id, text: unit!.display }] })) }];
  }).map(exercise => exercise.id === phrase.id ? phrase : exercise).slice(0, count);
  // Both explicit layout fixtures stay reachable even with a short Parent session.
  if (!exercises.some(exercise => exercise.id === phrase.id)) exercises.push(phrase);
  return [...exercises, longPhrase];
}
