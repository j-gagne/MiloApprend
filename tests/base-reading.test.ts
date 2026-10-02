import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBaseProgram } from '../src/content/remote-program.ts';
import { initialProgram } from '../src/content/program.ts';
import { buildSeedProgram, type SeedWeek } from '../src/content/seed-bank.ts';
import type { ReadingExerciseDefinition } from '../src/content/reading-model.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { validateProgram } from '../src/content/validation.ts';
import { effectiveProgram, emptyParentData } from '../src/parent/model.ts';
import { parseParentData } from '../src/services/parent-store.ts';

const weeks: readonly SeedWeek[] = [
  { number: 1, label: '1', letters: ['m', 'a'], syllables: ['sa', 'va', 'ne'], toolWords: [], words: [], sentences: [] },
  { number: 3, label: '3', letters: [], syllables: ['ma'], toolWords: [], sentences: [],
    words: [{ id: 'word-savane', display: 'savane' }] },
];
const definitions: readonly ReadingExerciseDefinition[] = [
  { id: 'reading-w3-m-a-ma', enabled: true,
    displayedUnits: [{ unitId: 'letter-m' }, { unitId: 'letter-a' }, { unitId: 'syllable-ma' }] },
  { id: 'reading-savane-whole', displayedUnits: [{ unitId: 'word-savane' }] },
  { id: 'reading-savane-segmented', displayedUnits: [
    { unitId: 'word-savane', segmentUnitIds: ['syllable-sa', 'syllable-va', 'syllable-ne'] }] },
];
const payload = { schemaVersion: 1, programId: 'base-reading', weeks, readingExercises: definitions };
const load = (value: unknown = payload) => loadBaseProgram(async () => new Response(JSON.stringify(value)));
const catalog = (program: Awaited<ReturnType<typeof load>>) =>
  createContentService(createContentRepository(program), 3).getReadingExercises();

test('root remote and local definitions use the same model and resolve pages without copying content', async () => {
  const remote = await load();
  const local = { ...buildSeedProgram(payload.programId, weeks), readingExercises: definitions };
  assert.deepEqual(remote, local);
  const { exercises, issues } = catalog(remote);
  assert.deepEqual(issues, []);
  assert.equal(exercises.length, 4);
  assert.deepEqual(exercises[0].displayedUnits.map(unit => unit.display), ['m', 'a', 'ma']);
  assert.deepEqual(exercises[1].displayedUnits[0].segments.map(segment => segment.text), ['savane']);
  assert.deepEqual(exercises[2].displayedUnits[0].segments.map(segment => segment.text), ['sa', 'va', 'ne']);
  assert.equal(exercises[3].id, 'reading:whole:word-savane');
  assert.equal(remote.units.filter(unit => unit.id === 'word-savane').length, 1);
});

test('base, automatic and saved custom pages coexist; activation survives remote reload/update', async () => {
  const custom = { id: 'reading:parent-activity-test', displayedUnits: [{ unitId: 'letter-m' }] };
  const saved = parseParentData(JSON.stringify({ ...emptyParentData(), readingExercises: [custom],
    activityEnabled: { 'reading-w3-m-a-ma': false, 'reading-savane-whole': true } }))!;
  for (const programId of ['base-reading', 'base-reading-updated']) {
    const remote = await load({ ...payload, programId, readingExercises: definitions.map(definition =>
      definition.id === 'reading-savane-whole' ? { ...definition, enabled: false } : definition) });
    const effective = effectiveProgram(remote, saved);
    assert.deepEqual(catalog(effective).exercises.map(page => page.id), [
      'reading-savane-whole', 'reading-savane-segmented', custom.id, 'reading:whole:word-savane',
    ]);
    assert.deepEqual(saved.readingExercises, [custom]);
    assert.equal(remote.readingExercises![0].enabled, true);
  }
});

test('root and weekly definitions concatenate; old remote payloads stay valid', async () => {
  const { readingExercises: _definitions, ...old } = payload;
  assert.deepEqual(await load(old), buildSeedProgram(payload.programId, weeks));
  const remote = await load({ ...payload, readingExercises: definitions.slice(1),
    weeks: weeks.map(week => week.number === 3 ? { ...week, readingExercises: definitions.slice(0, 1) } : week) });
  assert.deepEqual(remote.readingExercises, definitions);
  assert.equal(catalog(remote).exercises.length, 4);
});

test('malformed root or weekly structures safely fall back without weakening the envelope', async () => {
  for (const readingExercises of [null, {}, [null], [{ id: 'reading-bad' }],
    [{ id: 'reading-bad', displayedUnits: [{ unitId: 'word-savane', segmentUnitIds: 'sa' }] }]]) {
    assert.equal(await load({ ...payload, readingExercises }), initialProgram);
    assert.equal(await load({ ...payload, weeks: [{ ...weeks[0], readingExercises }] }), initialProgram);
  }
});

test('invalid references, duplicates and segment mismatches report diagnostics and omit only invalid pages', async () => {
  for (const invalid of [
    [{ id: 'reading-invalid', displayedUnits: [{ unitId: 'missing' }] }],
    [{ id: 'reading-invalid', displayedUnits: [{ unitId: 'word-savane', segmentUnitIds: ['missing'] }] }],
    [{ id: 'reading-invalid', displayedUnits: [{ unitId: 'word-savane', segmentUnitIds: ['syllable-sa'] }] }],
    [definitions[0], definitions[0]],
  ]) {
    const remote = await load({ ...payload, readingExercises: invalid });
    assert.equal(remote.id, payload.programId);
    assert.deepEqual(catalog(remote).exercises.map(page => page.id), ['reading:whole:word-savane']);
    assert.ok(validateProgram(remote).some(issue => issue.severity === 'error'
      && issue.code === 'invalid-reading-exercise' && issue.path.startsWith('readingExercises') && issue.message));
  }
});

test('references are resolved again against the effective shared bank', async () => {
  const remote = await load({ ...payload, readingExercises: [
    { id: 'reading-parent-reference', displayedUnits: [{ unitId: 'parent-syllable-test' }] },
  ] });
  assert.ok(catalog(remote).issues.length);
  const effective = effectiveProgram(remote, { ...emptyParentData(), customUnits: [
    { id: 'parent-syllable-test', type: 'syllable', display: 'ma', audioText: 'ma', enabled: true, introducedInWeek: 3 },
  ] });
  assert.deepEqual(catalog(effective).issues, []);
  assert.ok(catalog(effective).exercises.some(page => page.id === 'reading-parent-reference'));
});
