import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyMathBoard, placeMathTile, mathBoardCorrect } from '../src/game/math-board.ts';
import type { GeneratedMathExercise } from '../src/content/math-model.ts';
const order: GeneratedMathExercise = { id: 'order', introducedInWeek: 10, type: 'ORDER_NUMBERS', tiles: [13, 11, 12], answer: [11, 12, 13] };
test('ordering accepts corrections and swaps without duplicating tiles or accepting excluded numbers', () => {
  let board = emptyMathBoard(order);
  board = placeMathTile(order, board, 12, 0); board = placeMathTile(order, board, 11, 1); board = placeMathTile(order, board, 13, 2);
  assert.equal(mathBoardCorrect(order, board), false);
  assert.equal(placeMathTile(order, board, 99, 0), board);
  assert.equal(placeMathTile(order, board, 11, -1), board);
  board = placeMathTile(order, board, 11, 0);
  assert.deepEqual(board, [11, 12, 13]); assert.equal(mathBoardCorrect(order, board), true);
});
for (const missingIndex of [0, 1, 2]) test(`missing position ${missingIndex} allows retry`, () => {
  const exercise: GeneratedMathExercise = { id: 'missing', type: 'MISSING_NUMBER', introducedInWeek: 10, missingIndex,
    sequence: [11, 12, 13].map((n, i) => i === missingIndex ? null : n), answer: 11 + missingIndex, choices: [11, 12, 13] };
  const wrong = placeMathTile(exercise, emptyMathBoard(exercise), exercise.answer === 11 ? 12 : 11, 0);
  assert.equal(mathBoardCorrect(exercise, wrong), false);
  assert.equal(mathBoardCorrect(exercise, placeMathTile(exercise, wrong, exercise.answer, 0)), true);
});
