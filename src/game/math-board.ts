import type { GeneratedMathExercise } from '../content/math-model.ts';

export const mathTiles = (exercise: GeneratedMathExercise): readonly number[] => exercise.type === 'ORDER_NUMBERS' ? exercise.tiles : exercise.choices;
export const emptyMathBoard = (exercise: GeneratedMathExercise): readonly (number | null)[] =>
  Array.from({ length: exercise.type === 'ORDER_NUMBERS' ? exercise.answer.length : 1 }, () => null);
export function placeMathTile(exercise: GeneratedMathExercise, board: readonly (number | null)[], value: number, destination: number): readonly (number | null)[] {
  if (!mathTiles(exercise).includes(value) || !Number.isInteger(destination) || destination < 0 || destination >= board.length) return board;
  const next = [...board];
  const previous = next.indexOf(value);
  if (previous >= 0) next[previous] = next[destination];
  next[destination] = value;
  return next;
}
export function mathBoardCorrect(exercise: GeneratedMathExercise, board: readonly (number | null)[]): boolean {
  const answer = exercise.type === 'ORDER_NUMBERS' ? exercise.answer : [exercise.answer];
  return board.length === answer.length && board.every((value, index) => value === answer[index]);
}
