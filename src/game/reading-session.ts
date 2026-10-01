export interface PronunciationSegment {
  readonly unitId: string;
  readonly text: string;
}
export interface DisplayedReadingUnit {
  readonly display: string;
  readonly segments: readonly PronunciationSegment[];
}
export interface ReadingExercise {
  readonly id: string;
  readonly displayedUnits: readonly DisplayedReadingUnit[];
}
export interface ReadingState {
  readonly values: readonly (readonly number[])[];
  readonly reached: readonly (readonly boolean[])[];
}
export const READING_THRESHOLD = 95;
export function createReadingState(exercises: readonly ReadingExercise[]): ReadingState {
  return { values: exercises.map(exercise => exercise.displayedUnits.flatMap(unit => unit.segments.map(() => 0))),
    reached: exercises.map(exercise => exercise.displayedUnits.flatMap(unit => unit.segments.map(() => false))) };
}
export function readingExerciseComplete(state: ReadingState, index: number): boolean {
  const segments = state.reached[index];
  return !!segments?.length && segments.every(Boolean);
}
export function readingSessionComplete(state: ReadingState): boolean {
  return state.reached.length > 0 && state.reached.every((_, index) => readingExerciseComplete(state, index));
}
export function moveReadingSlider(state: ReadingState, exercise: number, segment: number, value: number): ReadingState {
  if (state.values[exercise]?.[segment] === undefined || !Number.isFinite(value)) return state;
  const next = Math.max(0, Math.min(100, value));
  return {
    values: state.values.map((row, i) => i === exercise ? row.map((previous, j) => j === segment ? next : previous) : row),
    reached: state.reached.map((row, i) => i === exercise ? row.map((previous, j) => j === segment ? previous || next >= READING_THRESHOLD : previous) : row),
  };
}
