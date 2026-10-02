import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSeedProgram } from '../src/content/seed-bank.ts';
import { effectiveProgram, emptyParentData, newParentId } from '../src/parent/model.ts';
import { addReadingExercise, updateReadingExercise, removeReadingExercise } from '../src/parent/reading-exercises.ts';
import { createParentStore, parseParentData } from '../src/services/parent-store.ts';
import { readingCatalog, parentReadingCatalog } from '../src/content/reading-catalog.ts';
import { activityCatalog } from '../src/content/activity-catalog.ts';
import { newSpellActivity } from '../src/content/spelling.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { createReadingSession } from '../src/game/reading-program-session.ts';
import type { ReadingExerciseDefinition } from '../src/content/reading-model.ts';

const base = buildSeedProgram('parent-reading', [
  { number: 1, label: '1', letters: ['m', 'a'], syllables: ['sa', 'va', 'ne'], words: [], toolWords: [], sentences: [] },
  { number: 2, label: '2', letters: [], syllables: ['ma'], toolWords: [], sentences: [], words: [
    { id: 'word-savane', display: 'savane', segmentations: [{ id: 'parts',
      segments: ['sa', 'va', 'ne'].map(text => ({ unitId: `syllable-${text}` })) }] },
  ] },
]);
const definition = (displayedUnits: ReadingExerciseDefinition['displayedUnits']): ReadingExerciseDefinition =>
  ({ id: `reading:${newParentId('activity')}`, displayedUnits });
const compound = definition([{ unitId: 'letter-m' }, { unitId: 'letter-a' }, { unitId: 'syllable-ma' }]);
const whole = definition([{ unitId: 'word-savane' }]);
const segmented = definition([{ unitId: 'word-savane', segmentUnitIds: ['syllable-sa', 'syllable-va', 'syllable-ne'] }]);
const scope = { mode: 'all' as const, selectedWeeks: [] };

test('custom pages round-trip in the existing store and reach new sessions without changing shared content or other activities', () => {
  const word = base.units.find(unit => unit.type === 'word')!;
  if (word.type !== 'word') throw new Error('Expected word');
  const initial = { ...base, activities: [newSpellActivity(base, word, 2, 'spell-example')] };
  let parent = emptyParentData();
  for (const exercise of [compound, whole, segmented]) {
    parent = addReadingExercise(parent, effectiveProgram(initial, parent), 2, exercise)!;
    assert.ok(parent);
  }
  let raw = '';
  const store = createParentStore(() => ({ getItem: () => raw, setItem: (_key, value) => { raw = value; } }));
  assert.equal(store.save(parent), true);
  const loaded = store.load().data;
  assert.deepEqual(loaded, { ...parent, activeWeek: undefined });
  const updatedBase = { ...initial, id: 'remote-update', readingExercises: [{ id: 'reading:base-letter', targetId: 'letter-m' }] };
  const program = effectiveProgram(updatedBase, loaded);
  assert.deepEqual(program.units, effectiveProgram(updatedBase, emptyParentData()).units);
  assert.deepEqual(activityCatalog(program, 2), activityCatalog(effectiveProgram(updatedBase, emptyParentData()), 2));
  assert.deepEqual(loaded.customUnits, []);
  const { exercises, issues } = readingCatalog(program, 2, scope);
  assert.deepEqual(issues, []);
  assert.equal(exercises.length, 5);
  assert.equal(new Set(exercises.map(exercise => exercise.id)).size, 5);
  assert.deepEqual(exercises.find(exercise => exercise.id === compound.id)?.displayedUnits.map(unit => unit.display), ['m', 'a', 'ma']);
  assert.deepEqual(exercises.find(exercise => exercise.id === whole.id)?.displayedUnits[0].segments.map(segment => segment.unitId), ['word-savane']);
  assert.deepEqual(exercises.find(exercise => exercise.id === segmented.id)?.displayedUnits[0].segments.map(segment => segment.unitId), ['syllable-sa', 'syllable-va', 'syllable-ne']);
  assert.deepEqual(exercises.find(exercise => exercise.id === 'reading:whole:word-savane'),
    readingCatalog(base, 2, scope).exercises[0]);
  assert.ok(parentReadingCatalog(program, 2).entries.every(entry => entry.enabled));
  const session = createReadingSession(createContentService(createContentRepository(program), 2, scope), { questionCount: 9 });
  assert.equal(session.exercises.filter(page => page.id === compound.id).length, 1);
  const disabled = effectiveProgram(updatedBase, { ...loaded, activityEnabled: { [segmented.id]: false } });
  assert.deepEqual(readingCatalog(disabled, 2, scope).exercises.map(page => page.id), exercises.filter(page => page.id !== segmented.id).map(page => page.id));
  assert.deepEqual(disabled.units, program.units);
});

test('all custom targets and segments obey availability and the existing target week scope', () => {
  const parent = addReadingExercise(emptyParentData(), base, 2, compound)!;
  const program = effectiveProgram(base, parent);
  const hasPage = (candidate = program, week = 2, selectedWeeks = [1, 2]) => readingCatalog(candidate, week,
    { mode: 'selected-weeks', selectedWeeks }).exercises.some(page => page.id === compound.id);
  assert.equal(hasPage(), true);
  assert.equal(hasPage(program, 1), false);
  assert.equal(hasPage(program, 2, [1]), false);
  assert.equal(hasPage(program, 2, [2]), false);
  for (const id of ['letter-m', 'letter-a', 'syllable-ma']) {
    assert.equal(hasPage(effectiveProgram(base, { ...parent, unitEnabled: { [id]: false } })), false);
    assert.equal(hasPage(effectiveProgram({ ...base, units: base.units.filter(unit => unit.id !== id) }, parent)), false);
  }
  const segmentedParent = addReadingExercise(parent, program, 2, segmented)!;
  assert.equal(readingCatalog(effectiveProgram(base, { ...segmentedParent, unitEnabled: { 'syllable-sa': false } }), 2, scope)
    .exercises.some(page => page.id === segmented.id), false);
});

test('invalid pages and base ID collisions are rejected; retries, old saves and phrase ranges remain compatible', () => {
  const parent = emptyParentData();
  for (const exercise of [definition([]), definition([{ unitId: '' }]), definition([{ unitId: 'missing' }]),
    definition([{ unitId: 'word-savane', segmentUnitIds: [] }]),
    definition([{ unitId: 'word-savane', segmentUnitIds: ['syllable-sa'] }])]) {
    assert.equal(addReadingExercise(parent, base, 2, exercise), undefined);
  }
  assert.equal(addReadingExercise(parent, base, 1, compound), undefined);
  const saved = addReadingExercise(parent, base, 2, compound)!;
  assert.deepEqual(addReadingExercise(saved, effectiveProgram(base, saved), 2, compound), saved);
  assert.equal(addReadingExercise(parent, { ...base, readingExercises: [compound] }, 2, compound), undefined);
  assert.deepEqual(parseParentData(JSON.stringify(parent)), { ...parent, activeWeek: undefined });
  assert.deepEqual(parseParentData(JSON.stringify({ ...parent, version: 1, customWords: [] })), { ...parent, activeWeek: undefined });
  assert.equal(parseParentData(JSON.stringify({ ...saved, readingExercises: [compound, compound] })), undefined);
  assert.equal(parseParentData(JSON.stringify({ ...saved, readingExercises: [{ ...compound, displayedUnits: [] }] })), undefined);
  const phrase = definition([{ unitId: 'sentence-shared', range: [0, 2] }]);
  assert.deepEqual(parseParentData(JSON.stringify({ ...parent, readingExercises: [phrase] }))?.readingExercises, [phrase]);
});

test('editing preserves custom identity, order and activation; only new sessions use the edited definition', () => {
  const parent = { ...emptyParentData(), readingExercises: [{ ...compound, enabled: false }, { ...whole, enabled: true }],
    activityEnabled: { [compound.id]: true, [whole.id]: false } };
  const before = JSON.stringify(parent);
  const program = effectiveProgram(base, parent);
  const session = createReadingSession(createContentService(createContentRepository(program), 2, scope), { questionCount: 9 });
  const sessionBefore = JSON.stringify(session);
  const edited = updateReadingExercise(parent, program, 2, { ...compound, enabled: true,
    displayedUnits: [{ unitId: 'syllable-ma' }, { unitId: 'letter-a' }] })!;
  assert.ok(edited);
  const next = updateReadingExercise(edited, effectiveProgram(base, edited), 2, { ...segmented, id: whole.id, enabled: false })!;
  const loaded = parseParentData(JSON.stringify(next))!;
  assert.deepEqual(loaded.readingExercises?.map(item => item.id), [compound.id, whole.id]);
  assert.deepEqual(loaded.readingExercises?.map(item => item.enabled), [false, true]);
  assert.deepEqual(loaded.activityEnabled, parent.activityEnabled);
  assert.deepEqual(loaded.readingExercises?.[1].displayedUnits, segmented.displayedUnits);
  assert.equal(JSON.stringify(parent), before);
  const updated = effectiveProgram(base, loaded);
  assert.deepEqual(updated.units, program.units);
  assert.deepEqual(updated.activities, program.activities);
  const newSession = createReadingSession(createContentService(createContentRepository(updated), 2, scope), { questionCount: 9 });
  assert.deepEqual(newSession.exercises.find(page => page.id === compound.id)?.displayedUnits.map(unit => unit.display), ['ma', 'a']);
  assert.equal(newSession.exercises.some(page => page.id === whole.id), false);
  assert.equal(JSON.stringify(session), sessionBefore);
  assert.equal(updateReadingExercise(parent, program, 2, { ...compound, displayedUnits: [] }), undefined);
  assert.equal(updateReadingExercise(parent, program, 2, { ...whole, id: 'reading:whole:word-savane' }), undefined);
  assert.equal(updateReadingExercise(parent, { ...program, readingExercises: [...program.readingExercises!,
    { ...whole, id: 'reading:base' }] }, 2, { ...whole, id: 'reading:base' }), undefined);
});

test('deletion removes only the custom definition and its activation; base and automatic pages are protected', () => {
  const parent = { ...emptyParentData(), readingExercises: [compound, whole],
    activityEnabled: { [compound.id]: false, [whole.id]: true, 'reading:whole:word-savane': false } };
  const before = JSON.stringify(parent);
  const removed = removeReadingExercise(parent, compound.id);
  assert.deepEqual(removed, { ...parent, readingExercises: [whole],
    activityEnabled: { [whole.id]: true, 'reading:whole:word-savane': false } });
  assert.deepEqual(effectiveProgram(base, removed).units, effectiveProgram(base, parent).units);
  assert.equal(JSON.stringify(parent), before);
  assert.equal(removeReadingExercise(parent, 'reading:whole:word-savane'), parent);
  assert.equal(removeReadingExercise(parent, 'reading:base'), parent);
  assert.equal(removeReadingExercise(removed, compound.id), removed);
  assert.deepEqual(parseParentData(JSON.stringify(removed))?.readingExercises, [whole]);
});
