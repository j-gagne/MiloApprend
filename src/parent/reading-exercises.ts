import type { LearningProgram } from '../content/model.ts';
import type { ReadingExerciseDefinition } from '../content/reading-model.ts';
import { parentReadingCatalog } from '../content/reading-catalog.ts';
import type { ParentData } from './model.ts';

/** Use the catalog's validation and cumulative availability, without the session week filter. */
export function readingExerciseError(program: LearningProgram, week: number, exercise: ReadingExerciseDefinition): string | undefined {
  const { entries, issues } = parentReadingCatalog({ ...program, readingExercises: [exercise] }, week);
  const entry = entries.find(item => item.exercise.id === exercise.id);
  if (!entry) return issues[0]?.message ?? 'Ajoutez au moins un contenu à la page.';
  if (!entry.available) return 'Choisissez des contenus disponibles pour la semaine active.';
}

export function addReadingExercise(data: ParentData, program: LearningProgram, week: number,
  exercise: ReadingExerciseDefinition): ParentData | undefined {
  if (!exercise.id.startsWith('reading:parent-activity-')
    || (program.readingExercises?.some(item => item.id === exercise.id)
      && !data.readingExercises?.some(item => item.id === exercise.id))
    || readingExerciseError(program, week, exercise)) return undefined;
  // Parent applies changes in memory even when persistence fails; retry the same creator ID.
  return { ...data, readingExercises: [
    ...(data.readingExercises ?? []).filter(item => item.id !== exercise.id), { ...exercise, enabled: true },
  ] };
}

export function updateReadingExercise(data: ParentData, program: LearningProgram, week: number,
  exercise: ReadingExerciseDefinition): ParentData | undefined {
  const original = data.readingExercises?.find(item => item.id === exercise.id);
  if (!original || readingExerciseError(program, week, exercise)) return undefined;
  return { ...data, readingExercises: data.readingExercises!.map(item => item.id === original.id
    ? { ...exercise, id: original.id, enabled: original.enabled } : item) };
}

export function removeReadingExercise(data: ParentData, id: string): ParentData {
  if (!data.readingExercises?.some(item => item.id === id)) return data;
  return { ...data, readingExercises: data.readingExercises.filter(item => item.id !== id),
    activityEnabled: Object.fromEntries(Object.entries(data.activityEnabled).filter(([key]) => key !== id)) };
}
