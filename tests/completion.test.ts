import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProgram } from '../src/content/program.ts';
import type { CompletionActivity, Word } from '../src/content/model.ts';
import { sentenceActivity, sentenceProgram } from './fixtures/sentence-activity.ts';
import { validateCompletionActivity, validateCompleteWordVariant, validateProgram } from '../src/content/validation.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { getCompleteWordChallenges } from './helpers/explicit-service.ts';
import { activityToExercise } from '../src/game/completion-content.ts';
import { isComplete, isSlotCorrect, placeAnswer } from '../src/game/complete-word.ts';

const serviceFor = (program = initialProgram) => createContentService(createContentRepository(program));
const challenges = getCompleteWordChallenges(serviceFor()).challenges;
const lama = challenges.find((item) => item.variantId === 'deux-emplacements')!;

test('les 21 variantes historiques restent valides et normalisées sans migration des données', () => {
  const legacy = challenges.filter((item) => item.id !== lama.id);
  assert.equal(legacy.length, 21);
  for (const challenge of legacy) {
    assert.deepEqual(challenge.slots, [{ segmentIndex: challenge.missingIndex, expected: challenge.segments[challenge.missingIndex] }]);
    assert.equal(placeAnswer(challenge, {}, challenge.missingIndex, challenge.slots[0].expected).complete, true);
  }
  assert.equal(initialProgram.units.filter((unit) => unit.type === 'word')
    .flatMap((word) => word.completeWord ?? []).filter((variant) => variant.missingSegmentIndex !== undefined).length, 21);
});

test('LAMA attend LA en case 0 et MA en case 1, quel que soit l’ordre des dépôts', () => {
  assert.deepEqual(lama.slots, [{ segmentIndex: 0, expected: 'la' }, { segmentIndex: 1, expected: 'ma' }]);
  assert.deepEqual(lama.choices.map((choice) => choice.text), ['la', 'ma', 'li', 'mu']);
  assert.equal(isSlotCorrect(lama, 0, 'ma'), false);
  assert.equal(isSlotCorrect(lama, 1, 'la'), false);
  assert.equal(isSlotCorrect(lama, 9, 'la'), false);
  for (const order of [[0, 1], [1, 0]]) {
    const first = placeAnswer(lama, {}, order[0], lama.segments[order[0]]);
    assert.equal(first.accepted, true);
    assert.equal(first.complete, false);
    const wrong = placeAnswer(lama, first.placements, order[1], 'li');
    assert.equal(wrong.accepted, false);
    assert.deepEqual(wrong.placements, first.placements);
    const last = placeAnswer(lama, first.placements, order[1], lama.segments[order[1]]);
    assert.equal(last.complete, true);
  }
  assert.equal(isComplete(lama, { 0: 'ma', 1: 'la' }), false);
});

test('trois emplacements et même réponse réutilisée ne dépendent pas de l’ordre', () => {
  const savane = challenges.find((item) => item.word === 'savane')!;
  const board = { ...savane, slots: savane.segments.map((expected, segmentIndex) => ({ expected, segmentIndex })),
    choices: savane.segments.map((text) => ({ text, kind: 'syllable' as const })) };
  let placements = placeAnswer(board, {}, 2, 'ne').placements;
  placements = placeAnswer(board, placements, 0, 'sa').placements;
  assert.equal(isComplete(board, placements), false);
  assert.equal(placeAnswer(board, placements, 1, 'va').complete, true);
  const repeated = { segments: ['mé', 'mé'], choices: [{ text: 'mé', kind: 'syllable' as const }],
    slots: [{ segmentIndex: 0, expected: 'mé' }, { segmentIndex: 1, expected: 'mé' }] };
  assert.equal(placeAnswer(repeated, { 0: 'mé' }, 1, 'mé').complete, true);
});

test('configuration multi refuse indices vides, doublons, hors limites et formes ambiguës', () => {
  const word = initialProgram.units.find((unit): unit is Word => unit.type === 'word' && unit.id === 'word-lama')!;
  const original = word.completeWord![1];
  for (const indexes of [[], [0, 0], [-1], [2], [0.5]]) {
    const variant = { ...original, missingSegmentIndexes: indexes };
    assert.ok(validateCompleteWordVariant(initialProgram, word, variant, 5).some((issue) => issue.code === 'invalid-missing-index'));
  }
  assert.ok(validateCompleteWordVariant(initialProgram, word, { ...original, missingSegmentIndex: 0 }, 5)
    .some((issue) => issue.code === 'ambiguous-missing-index'));
  assert.ok(validateCompleteWordVariant(initialProgram, word, { ...original, distractorUnitIds: ['syllable-ma'] }, 5)
    .some((issue) => issue.code === 'duplicate-choice'));
});

test('phrase distincte typée, segmentation exacte avec ponctuation, même moteur de correction', () => {
  assert.deepEqual(validateProgram(sentenceProgram).filter((issue) => issue.severity === 'error'), []);
  const result = activityToExercise(serviceFor(sentenceProgram), sentenceActivity);
  assert.ok(result.exercise);
  assert.equal(result.exercise.target.type, 'sentence');
  assert.equal(result.exercise.target.text, 'Il a lu.');
  assert.equal(result.exercise.segments.join(''), 'Il a lu.');
  assert.equal(placeAnswer(result.exercise, {}, 4, 'lu').complete, false);
  assert.equal(placeAnswer(result.exercise, { 4: 'lu' }, 0, 'Il').complete, true);
  assert.equal(getCompleteWordChallenges(serviceFor(sentenceProgram)).challenges.length, 23);
  assert.equal(initialProgram.activities, undefined);
});

test('phrase : cible, séparateurs et disponibilités sont validés sans contourner les règles', () => {
  const invalid = (activity: CompletionActivity, week = 5, program = initialProgram) => {
    const configured = { ...program, activities: [activity] };
    const result = activityToExercise(createContentService(createContentRepository(configured), week), activity);
    assert.equal(result.exercise, undefined);
    return validateCompletionActivity(configured, activity, week).map((issue) => issue.code);
  };
  assert.ok(invalid({ ...sentenceActivity, missingSegmentIndexes: [1] }).includes('unconfirmed-answer'));
  assert.ok(invalid({ ...sentenceActivity, targetId: 'letter-a' }).includes('invalid-target'));
  assert.ok(invalid({ ...sentenceActivity, enabled: false }).includes('disabled-exercise'));
  assert.ok(invalid(sentenceActivity, 2).includes('future-reference'));
  assert.ok(invalid({ ...sentenceActivity, distractorUnitIds: ['syllable-na'] }, 3).includes('future-reference'));
  assert.ok(invalid(sentenceActivity, 5, { ...initialProgram, units: initialProgram.units.map((unit) =>
    unit.id === 'syllable-lu' ? { ...unit, enabled: false } : unit) }).includes('disabled-reference'));
  assert.ok(invalid({ ...sentenceActivity, segmentation: { id: 'bad', segments: [{ separator: 'Il a lu.' }] } })
    .includes('invalid-separator'));
});
