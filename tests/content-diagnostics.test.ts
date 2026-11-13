import assert from 'node:assert/strict';
import test from 'node:test';
import { createDiagnosticReporter } from '../src/services/content-diagnostics.ts';
import { initialProgram } from '../src/content/program.ts';
import { buildSeedProgram, type SeedWeek } from '../src/content/seed-bank.ts';
import { validateProgram, validateCompleteWordVariant } from '../src/content/validation.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { getCompleteWordChallenges, wordToChallenge } from '../src/game/complete-word-content.ts';
import { effectiveProgram, emptyParentData } from '../src/parent/model.ts';

test('identical diagnostics log once; distinct paths/messages and errors remain visible', () => {
  const warnings: string[] = [], errors: string[] = [];
  const report = createDiagnosticReporter({ warn: message => warnings.push(message), error: message => errors.push(message) });
  const issue = { severity: 'warning' as const, code: 'unconfirmed-segment', path: 'word.segments[0]', message: 'Visible only' };
  report('session', issue);
  report('session', { ...issue });
  report('session', { ...issue, path: 'word.segments[1]' });
  report('session', { ...issue, message: 'Changed' });
  report('session', { ...issue, severity: 'error' });
  report('session', { ...issue, severity: 'error' });
  assert.equal(warnings.length, 3);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /session:error:unconfirmed-segment.*word.segments\[0\]/);
});

test('repeated introductions are invalid; explicit review preserves unique IDs and labels', () => {
  const week: SeedWeek = { number: 1, label: '1', letters: [], syllables: ['ach'], toolWords: [], words: [], sentences: [] };
  const repeated = buildSeedProgram('test', [week, { ...week, number: 2 }]);
  assert.ok(validateProgram(repeated).some(issue => issue.code === 'duplicate-id'));
  const review = buildSeedProgram('test', [week, { ...week, number: 2, syllables: [], reviewedUnitIds: ['syllable-ach'] }]);
  assert.deepEqual(validateProgram(review), []);
  assert.deepEqual(review.units.map(unit => [unit.id, unit.display, unit.introducedInWeek]), [['syllable-ach', 'ach', 1]]);
});

test('bonbon valid answer placement preserves both on answers; invalid position still rejected', () => {
  const word = initialProgram.units.find(unit => unit.id === 'practice-bonbon');
  assert.ok(word?.type === 'word');
  const variant = word.completeWord![0];
  const service = createContentService(createContentRepository(initialProgram), word.introducedInWeek);
  assert.equal(variant.answerPosition, 1);
  const result = wordToChallenge(service, word, variant);
  assert.ok(result.challenge);
  assert.equal(result.challenge.slots.length, 2);
  assert.ok(result.challenge.choices.some(choice => choice.text === 'on'));
  assert.ok(validateCompleteWordVariant(initialProgram, word, { ...variant, answerPosition: 2 }, service.activeWeek)
    .some(issue => issue.code === 'invalid-answer-position'));
});

test('a malformed foret literal is rejected; correcting its text does not confirm a unit', () => {
  const week: SeedWeek = { number: 1, label: '1', letters: [], syllables: ['fo', 'rê'], toolWords: [], sentences: [],
    words: [{ id: 'practice-foret', display: 'forêt', segmentations: [{ id: 'initial', segments: [
      { unitId: 'syllable-fo' }, { unitId: 'syllable-rê' }, { literal: 'letter-t', note: 'Visible only' },
    ] }] }] };
  const malformed = buildSeedProgram('test', [week]);
  assert.ok(validateProgram(malformed).some(issue => issue.code === 'segmentation-mismatch'));
  const corrected = buildSeedProgram('test', [{ ...week, words: [{ ...week.words[0], segmentations: [{ id: 'initial', segments: [
    { unitId: 'syllable-fo' }, { unitId: 'syllable-rê' }, { literal: 't', note: 'Visible only' },
  ] }] }] }]);
  assert.equal(validateProgram(corrected).some(issue => issue.severity === 'error'), false);
  assert.ok(validateProgram(corrected).some(issue => issue.code === 'unconfirmed-segment'));
  assert.equal(corrected.units.some(unit => unit.id === 'letter-t'), false);
});

test('disabled overrides filter only that exercise, without session errors or hiding malformed content', () => {
  const service = (program: typeof initialProgram) => createContentService(createContentRepository(program), 8);
  const before = getCompleteWordChallenges(service(initialProgram));
  assert.ok(before.challenges.length);
  const id = before.challenges[0].id;
  const program = effectiveProgram(initialProgram, { ...emptyParentData(), activityEnabled: { [id]: false } });
  const after = getCompleteWordChallenges(service(program));
  assert.deepEqual(after.challenges.map(item => item.id), before.challenges.filter(item => item.id !== id).map(item => item.id));
  assert.equal(after.issues.some(issue => issue.code === 'disabled-exercise'), false);
  const word = initialProgram.units.find(unit => unit.id === 'practice-bonbon');
  assert.ok(word?.type === 'word');
  const invalid = { ...initialProgram, units: initialProgram.units.map(unit => unit.id === word.id
    ? { ...word, completeWord: [{ ...word.completeWord![0], enabled: false, answerPosition: 99 }] } : unit) };
  const issues = validateProgram(invalid);
  assert.equal(issues.some(issue => issue.code === 'disabled-exercise'), false);
  assert.ok(issues.some(issue => issue.code === 'invalid-answer-position'));
  assert.ok(validateCompleteWordVariant(invalid, word, { ...word.completeWord![0], enabled: false }, 8)
    .some(issue => issue.code === 'disabled-exercise'));
});
