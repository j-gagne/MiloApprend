import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSeedProgram, type SeedWeek } from '../src/content/seed-bank.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { activityCatalog } from '../src/content/activity-catalog.ts';
import { wholeWordReadingId, type ReadingExerciseDefinition } from '../src/content/reading-model.ts';
import type { ExerciseScope, LearningProgram } from '../src/content/model.ts';
import { effectiveProgram, emptyParentData } from '../src/parent/model.ts';
import { parseParentData } from '../src/services/parent-store.ts';
import { loadBaseProgram } from '../src/content/remote-program.ts';
import { createReadingState, moveReadingSlider, readingExerciseComplete } from '../src/game/reading-session.ts';

const wholeId = wholeWordReadingId('word-savane');
const segmented: ReadingExerciseDefinition = { id: 'reading:savane:segmented', targetId: 'word-savane',
  displayedUnits: [{ unitId: 'word-savane', segmentUnitIds: ['syllable-sa', 'syllable-va', 'syllable-ne'] }] };
const bank: readonly SeedWeek[] = [
  { number: 1, label: '1', letters: [], syllables: ['sa', 'va', 'ne'], toolWords: [], words: [], sentences: [] },
  { number: 2, label: '2', letters: [], syllables: [], toolWords: [], sentences: [], words: [
    { id: 'word-savane', display: 'savane', readingSequence: [{ text: 'sav' }, { text: 'ane' }],
      segmentations: [{ id: 'construction', segments: ['sa', 'va', 'ne'].map(text => ({ unitId: `syllable-${text}` })) }] },
  ] },
];
const base = buildSeedProgram('reading-test', bank);
const service = (program: LearningProgram = base, week = 2,
  scope: ExerciseScope = { mode: 'all', selectedWeeks: [] }) => createContentService(createContentRepository(program), week, scope);

test('one shared word produces a whole-word Reading exercise, independent of construction and audio sequence', () => {
  const before = JSON.stringify(base);
  assert.deepEqual(service().getReadingExercises(), { issues: [], exercises: [{ id: wholeId,
    targetId: 'word-savane', introducedInWeek: 2,
    displayedUnits: [{ display: 'savane', segments: [{ unitId: 'word-savane', text: 'savane' }] }] }] });
  assert.equal(JSON.stringify(base), before);
  assert.equal(base.units.filter(unit => unit.id === 'word-savane').length, 1);
});

test('two Reading variants reference one word; configuration never changes Complete Word', () => {
  const before = activityCatalog(base, 2);
  assert.ok(before.length > 0);
  const program = { ...base, readingExercises: [segmented] };
  const result = service(program).getReadingExercises();
  assert.deepEqual(result.issues, []);
  assert.equal(result.exercises.length, 2);
  assert.ok(result.exercises.every(exercise => exercise.targetId === 'word-savane'));
  assert.deepEqual(result.exercises.find(exercise => exercise.id === segmented.id)?.displayedUnits[0]?.segments
    .map(segment => segment.text), ['sa', 'va', 'ne']);
  assert.deepEqual(activityCatalog(program, 2), before);
  assert.deepEqual(program.units, base.units);
  const replacement = service({ ...base, readingExercises: [{ ...segmented, id: wholeId }] }).getReadingExercises();
  assert.equal(replacement.exercises.length, 1);
  assert.equal(replacement.exercises[0]?.displayedUnits[0]?.segments.length, 3);
});

test('Reading enabled state is independent and uses existing persisted Parent exercise overrides', () => {
  const parent = emptyParentData();
  parent.activityEnabled = { [segmented.id]: false };
  const loaded = parseParentData(JSON.stringify(parent))!;
  const program = effectiveProgram({ ...base, readingExercises: [segmented] }, loaded);
  assert.deepEqual(service(program).getReadingExercises().exercises.map(exercise => exercise.id), [wholeId]);
  assert.equal(service(program).getAvailableWords().length, 1);
  assert.deepEqual(activityCatalog(program, 2), activityCatalog(effectiveProgram(base, loaded), 2));
  const disabled = { ...base, readingExercises: [{ ...segmented, enabled: false }] };
  assert.deepEqual(service(disabled).getReadingExercises().exercises.map(exercise => exercise.id), [wholeId]);
  assert.equal(service({ ...disabled, activityEnabled: { [segmented.id]: true } }).getReadingExercises().exercises.length, 2);
  assert.equal(service({ ...disabled, activityEnabled: { [wholeId]: false } }).getReadingExercises().exercises.length, 0);
});

test('shared content disabled by Parent removes every Reading variant', () => {
  const parent = emptyParentData();
  parent.unitEnabled = { 'word-savane': false };
  const program = effectiveProgram({ ...base, readingExercises: [segmented] }, parent);
  assert.deepEqual(service(program).getReadingExercises().exercises, []);
});

test('active week is cumulative; selected weeks filter target introduction only', () => {
  const program = { ...base, readingExercises: [segmented] };
  assert.equal(service(program, 1).getReadingExercises().exercises.length, 0);
  assert.equal(service(program, 2, { mode: 'selected-weeks', selectedWeeks: [1] }).getReadingExercises().exercises.length, 0);
  assert.equal(service(program, 2, { mode: 'selected-weeks', selectedWeeks: [2] }).getReadingExercises().exercises.length, 2);
  assert.equal(service(program, 2, { mode: 'selected-weeks', selectedWeeks: [] }).getReadingExercises().exercises.length, 0);
  assert.equal(service(program, 99).getReadingExercises().exercises.length, 0);
  const unavailableSegment = { ...program, units: program.units.map(unit => unit.id === 'syllable-sa' ? { ...unit, enabled: false } : unit) };
  assert.deepEqual(service(unavailableSegment).getReadingExercises().exercises.map(exercise => exercise.id), [wholeId]);
});

test('remote definitions, Parent custom words and overrides flow through the effective repository', async () => {
  const remote = await loadBaseProgram(async () => new Response(JSON.stringify({ schemaVersion: 1,
    programId: 'remote-reading', weeks: bank.map(week => week.number === 2 ? { ...week, readingExercises: [segmented] } : week) })));
  assert.equal(remote.id, 'remote-reading');
  assert.deepEqual(remote.readingExercises, [segmented]);
  const parent = emptyParentData();
  parent.customWeeks = [{ id: 'parent-week-test', number: 3, label: 'Parent' }];
  parent.customUnits = [{ id: 'parent-word-test', type: 'word', display: 'savane', audioText: 'autre prononciation',
    text: 'savane', enabled: true, introducedInWeek: 3, segmentations: [], tags: ['practice'] }];
  parent.unitEnabled = { 'word-savane': false };
  const effective = effectiveProgram(remote, parseParentData(JSON.stringify(parent))!);
  assert.deepEqual(service(effective, 3).getReadingExercises().exercises.map(exercise => exercise.targetId), ['parent-word-test']);
  assert.equal(service(effective, 3).getReadingExercises().exercises[0]?.displayedUnits[0]?.segments[0]?.text, 'savane');
  assert.equal(service(effective, 2).getReadingExercises().exercises.length, 0);
});

test('malformed, missing, mismatched or duplicate explicit definitions are excluded with diagnostics', () => {
  for (const definitions of [
    [{ id: wholeId, targetId: 'missing' }],
    [{ ...segmented, id: wholeId, displayedUnits: [] }],
    [{ ...segmented, id: wholeId, displayedUnits: [{ unitId: 'word-savane', segmentUnitIds: ['syllable-sa'] }] }],
    [{ id: wholeId, targetId: 'word-savane' }, { id: wholeId, targetId: 'word-savane' }],
  ]) {
    const result = service({ ...base, readingExercises: definitions }).getReadingExercises();
    assert.equal(result.exercises.length, 0);
    assert.ok(result.issues.length > 0);
  }
});

const compound: ReadingExerciseDefinition = { id: 'reading:m-a-ma', enabled: true,
  displayedUnits: [{ unitId: 'letter-m' }, { unitId: 'letter-a' }, { unitId: 'syllable-ma' }] };
const combinedBase = buildSeedProgram('combined', [
  { ...bank[0], letters: ['m', 'a'] },
  { ...bank[1], syllables: ['ma'] },
]);

test('mixed shared targets form one page with three independent requirements; a letter can also stand alone', () => {
  const program = { ...combinedBase, readingExercises: [compound,
    { id: 'reading:m', displayedUnits: [{ unitId: 'letter-m' }] }] };
  const result = service(program).getReadingExercises();
  assert.deepEqual(result.issues, []);
  const pages = result.exercises.filter(exercise => exercise.id === compound.id);
  assert.equal(pages.length, 1);
  assert.deepEqual(pages[0].displayedUnits, [
    { display: 'm', segments: [{ unitId: 'letter-m', text: 'm' }] },
    { display: 'a', segments: [{ unitId: 'letter-a', text: 'a' }] },
    { display: 'ma', segments: [{ unitId: 'syllable-ma', text: 'ma' }] },
  ]);
  assert.equal(pages[0].introducedInWeek, 2);
  let state = createReadingState(pages);
  assert.equal(state.reached.length, 1);
  for (const index of [0, 1]) state = moveReadingSlider(state, 0, index, 100);
  assert.equal(readingExerciseComplete(state, 0), false);
  assert.equal(readingExerciseComplete(moveReadingSlider(state, 0, 2, 100), 0), true);
  assert.deepEqual(result.exercises.find(exercise => exercise.id === 'reading:m')?.displayedUnits,
    [pages[0].displayedUnits[0]]);
});

test('compound page requires every effective target, including selected weeks; disabling only the page preserves content', () => {
  const program = { ...combinedBase, readingExercises: [compound] };
  const hasPage = (candidate: LearningProgram, week = 2, selectedWeeks = [1, 2]) =>
    service(candidate, week, { mode: 'selected-weeks', selectedWeeks }).getReadingExercises().exercises.some(exercise => exercise.id === compound.id);
  assert.equal(hasPage(program), true);
  assert.equal(hasPage(program, 1), false);
  assert.equal(hasPage(program, 2, [1]), false);
  assert.equal(hasPage(program, 2, [2]), false);
  for (const id of ['letter-m', 'letter-a', 'syllable-ma']) {
    const parent = { ...emptyParentData(), unitEnabled: { [id]: false } };
    assert.equal(hasPage(effectiveProgram(program, parent)), false);
    assert.equal(hasPage({ ...program, units: program.units.filter(unit => unit.id !== id) }), false);
  }
  const disabled = effectiveProgram(program, { ...emptyParentData(), activityEnabled: { [compound.id]: false } });
  assert.equal(hasPage(disabled), false);
  assert.deepEqual(disabled.units, effectiveProgram(program, emptyParentData()).units);
  assert.deepEqual(activityCatalog(disabled, 2), activityCatalog(combinedBase, 2));
});

test('a phrase page references explicit portions of one shared Sentence, without duplicating words or punctuation sliders', () => {
  const sentence = { id: 'sentence-savane', type: 'sentence' as const,
    display: 'Le lion se promène dans la savane.', audioText: '', introducedInWeek: 2, enabled: true };
  const ranges: readonly (readonly [number, number])[] = [[0, 2], [3, 7], [8, 10], [11, 18], [19, 23], [24, 26], [27, 34]];
  const definition: ReadingExerciseDefinition = { id: 'reading:phrase', displayedUnits:
    ranges.map(range => ({ unitId: sentence.id, range })) };
  const program = { ...base, units: [...base.units, sentence], readingExercises: [definition] };
  const result = service(program).getReadingExercises();
  assert.deepEqual(result.issues, []);
  const page = result.exercises.find(exercise => exercise.id === definition.id)!;
  assert.equal(page.displayedUnits.map(unit => unit.display).join(' '), sentence.display);
  assert.deepEqual(page.displayedUnits.flatMap(unit => unit.segments.map(segment => segment.text)),
    ['Le', 'lion', 'se', 'promène', 'dans', 'la', 'savane']);
  assert.equal(program.units.filter(unit => unit.type === 'word').length, 1);
  const invalid = service({ ...program, readingExercises: [{ ...definition,
    displayedUnits: [{ unitId: sentence.id, range: [0, 999] }] }] }).getReadingExercises();
  assert.ok(invalid.issues.length);
  assert.equal(invalid.exercises.some(exercise => exercise.id === definition.id), false);
});
