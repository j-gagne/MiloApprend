import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CompletionBoard } from '../src/game/complete-word.ts';
import { createAnswerBank, availableAnswers, placementTexts, placeOccurrence, removeOccurrence } from '../src/game/answer-bank.ts';

const board: CompletionBoard = {
  segments: ['la', 'la', 'va'],
  slots: [{ segmentIndex: 0, expected: 'la' }, { segmentIndex: 1, expected: 'la' }, { segmentIndex: 2, expected: 'va' }],
  choices: [{ text: 'la', kind: 'syllable' }, { text: 'va', kind: 'syllable' }],
};
const bank = createAnswerBank(board);
const las = bank.filter((answer) => answer.text === 'la');
const va = bank.find((answer) => answer.text === 'va')!;

test('placing and removing returns the exact occurrence', () => {
  const result = placeOccurrence(board, bank, {}, 0, las[0].id);
  assert.equal(result.accepted, true);
  assert.equal(availableAnswers(bank, result.placements).some((a) => a.id === las[0].id), false);
  assert.deepEqual(availableAnswers(bank, removeOccurrence(result.placements, 0)), bank);
});

test('equal texts are independent; existing duplicate choices are not multiplied', () => {
  const duplicates = createAnswerBank({ ...board, choices: [board.choices[0], board.choices[0], board.choices[1]] });
  assert.equal(duplicates.length, 3);
  assert.equal(new Set(duplicates.map((a) => a.id)).size, 3);
  const first = placeOccurrence(board, bank, {}, 0, las[0].id);
  assert.deepEqual(availableAnswers(bank, first.placements).filter((a) => a.text === 'la'), [las[1]]);
  const second = placeOccurrence(board, bank, first.placements, 1, las[1].id);
  assert.deepEqual(placementTexts(bank, second.placements), { 0: 'la', 1: 'la' });
  assert.equal(availableAnswers(bank, second.placements).length, 1);
});

test('replacement releases the old occurrence and consumes the new one', () => {
  // Inventory exchange remains atomic; the destination must accept the incoming text.
  const result = placeOccurrence(board, bank, { 2: las[0].id }, 2, va.id);
  assert.equal(result.accepted, true);
  assert.deepEqual(result.placements, { 2: va.id });
  assert.deepEqual(availableAnswers(bank, result.placements), las);
  const sameText = placeOccurrence(board, bank, { 0: las[0].id }, 0, las[1].id);
  assert.equal(availableAnswers(bank, sameText.placements).some((a) => a.id === las[0].id), true);
});

test('moving, replacing and removing never lose or duplicate an occurrence', () => {
  let placements = placeOccurrence(board, bank, {}, 0, las[0].id).placements;
  placements = placeOccurrence(board, bank, placements, 1, las[1].id).placements;
  placements = placeOccurrence(board, bank, placements, 1, las[0].id, 0).placements;
  assert.equal(placements[0], undefined);
  assert.equal(placements[1], las[0].id);
  const all = [...availableAnswers(bank, placements).map((a) => a.id), ...Object.values(placements).filter(Boolean)];
  assert.equal(new Set(all).size, bank.length);
  assert.equal(all.length, bank.length);
  assert.deepEqual(availableAnswers(bank, removeOccurrence(placements, 1)), bank);
});

test('incorrect placement/replacement/move and stale occurrences leave inventory intact', () => {
  const placements = { 0: las[0].id };
  for (const result of [
    placeOccurrence(board, bank, placements, 0, va.id),
    placeOccurrence(board, bank, placements, 2, las[0].id, 0),
    placeOccurrence(board, bank, placements, 1, las[0].id),
    placeOccurrence(board, bank, placements, 1, 'unknown'),
    placeOccurrence(board, bank, placements, 1, las[1].id, 0),
  ]) {
    assert.equal(result.accepted, false);
    assert.equal(result.placements, placements);
  }
});

test('existing LAVAGE multi-slot completion preserves validation', () => {
  const lavage: CompletionBoard = { ...board, segments: ['la', 'va', 'ge'], slots: [{ segmentIndex: 0, expected: 'la' }, { segmentIndex: 1, expected: 'va' }] };
  const answers = createAnswerBank(lavage);
  const first = placeOccurrence(lavage, answers, {}, 0, answers[0].id);
  assert.equal(first.complete, false);
  const last = placeOccurrence(lavage, answers, first.placements, 1, answers[1].id);
  assert.equal(last.complete, true);
  assert.equal(availableAnswers(answers, last.placements).length, 0);
});
