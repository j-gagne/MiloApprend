import type { ExerciseScope, LearningProgram } from '../content/model.ts';
import type { MathExerciseDefinition } from '../content/math-model.ts';
import { getEligibleMathNumbers } from '../content/mathematics.ts';
import { validateMathExercise } from '../content/math-validation.ts';
import type { ParentData } from './model.ts';
export function saveMathExercise(data: ParentData, program: LearningProgram, week: number, scope: ExerciseScope, exercise: MathExerciseDefinition): ParentData {
  const original = data.mathExercises?.find(item => item.id === exercise.id);
  if (!exercise.id.startsWith('math:parent-activity-') || (!original && program.mathExercises?.some(item => item.id === exercise.id))) throw new Error('Identifiant réservé au programme.');
  const issues = validateMathExercise(exercise, new Set(getEligibleMathNumbers(program, week, scope).map(item => item.value)));
  if (issues.length) throw new Error(issues.map(item => item.message).join(' '));
  return { ...data, mathExercises: [...(data.mathExercises ?? []).filter(item => item.id !== exercise.id), { ...exercise, enabled: original?.enabled ?? true }] };
}
export function removeMathExercise(data: ParentData, id: string): ParentData {
  if (!data.mathExercises?.some(item => item.id === id)) return data;
  return { ...data, mathExercises: data.mathExercises.filter(item => item.id !== id), activityEnabled: Object.fromEntries(Object.entries(data.activityEnabled).filter(([key]) => key !== id)) };
}
