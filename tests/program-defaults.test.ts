import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBaseProgram } from '../src/content/remote-program.ts';
import { initialProgram } from '../src/content/program.ts';
import { activeWeek } from '../src/content/settings.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { effectiveProgram, effectiveWeek, type ParentData } from '../src/parent/model.ts';
import { createParentStore } from '../src/services/parent-store.ts';
import type { LearningProgram } from '../src/content/model.ts';
import { createPlaySession } from '../src/game/play-session.ts';
import { createReadingSession } from '../src/game/reading-program-session.ts';

const defaults = { activeWeek: 6, exerciseScope: { mode: 'selected-weeks', selectedWeeks: [6] } };
const payload = { schemaVersion: 1, programId: 'defaults-fixture', defaults,
  weeks: [5, 6, 7].map(number => ({ number, label: String(number), letters: [], toolWords: [], sentences: [],
    syllables: [{ id: `syllable-${number}`, display: 'ma' }], words: [{ id: `word-${number}`, display: 'mama',
      segmentations: [{ id: `construction-${number}`, segments: [{ unitId: `syllable-${number}` }, { unitId: `syllable-${number}` }] }] }],
  })) };
const remote = (value: unknown = payload) => loadBaseProgram(async () => new Response(JSON.stringify(value)));
// Same resolution path as App; reading and complete-word receive this same service.
const service = (base: LearningProgram, parent: ParentData) => createContentService(
  createContentRepository(effectiveProgram(base, parent)), effectiveWeek(base, parent, activeWeek), parent.exerciseScope);
function storage() {
  let raw: string | null = null;
  let writes = 0;
  const store = createParentStore(() => ({ getItem: () => raw, setItem: (_key, value) => { raw = value; writes++; } }));
  return { store, writes: () => writes };
}

test('first visit inherits remote week 6 without writing defaults; both activities practice only week 6', async () => {
  const saved = storage();
  const parent = saved.store.load().data;
  assert.equal(parent.activeWeek, undefined);
  assert.equal(parent.exerciseScope, undefined);
  const current = service(await remote(), parent);
  assert.equal(current.activeWeek, 6);
  assert.deepEqual(current.exerciseScope, defaults.exerciseScope);
  const game = createPlaySession(current, {}, () => 0).challenges;
  const reading = createReadingSession(current, {}, () => 0).exercises;
  assert.ok(game.length > 0 && reading.length > 0);
  assert.ok(game.every(item => item.introducedInWeek === 6));
  assert.ok(reading.every(item => item.introducedInWeek === 6));
  assert.equal(saved.writes(), 0);
});

test('explicit Parent preferences survive reload and changed remote defaults, including all and empty selection', async () => {
  const saved = storage();
  const parent = { ...saved.store.load().data, activeWeek: 7,
    exerciseScope: { mode: 'selected-weeks' as const, selectedWeeks: [7] } };
  assert.equal(saved.store.save(parent), true);
  for (const base of [await remote(), await remote({ ...payload, defaults: { activeWeek: 5,
    exerciseScope: { mode: 'all', selectedWeeks: [] } } })]) {
    const current = service(base, saved.store.load().data);
    assert.equal(current.activeWeek, 7);
    assert.deepEqual(current.exerciseScope, parent.exerciseScope);
    assert.ok(createPlaySession(current).challenges.every(item => item.introducedInWeek === 7));
    assert.ok(createReadingSession(current).exercises.every(item => item.introducedInWeek === 7));
    for (const mode of ['all', 'selected-weeks'] as const) {
      assert.deepEqual(service(base, { ...parent, exerciseScope: { mode, selectedWeeks: [] } }).exerciseScope,
        { mode, selectedWeeks: [] });
    }
  }
  assert.equal(saved.writes(), 1);
});

test('saved unrelated Parent data inherits defaults without materializing a Parent week choice', async () => {
  const saved = storage();
  saved.store.save({ ...saved.store.load().data, questionCount: 3 });
  const parent = saved.store.load().data;
  assert.equal(service(await remote(), parent).activeWeek, 6);
  assert.deepEqual(service(await remote(), parent).exerciseScope, defaults.exerciseScope);
  assert.equal(parent.activeWeek, undefined);
  assert.equal(parent.exerciseScope, undefined);
});

test('older remote JSON retains historical defaults; offline fallback provides week 6', async () => {
  const parent = storage().store.load().data;
  const legacy = await remote({ ...payload, defaults: undefined });
  assert.equal(legacy.id, payload.programId);
  assert.equal(legacy.defaults, undefined);
  assert.equal(service(legacy, parent).activeWeek, activeWeek);
  assert.deepEqual(service(legacy, parent).exerciseScope, { mode: 'all', selectedWeeks: [] });
  const fallback = await loadBaseProgram(async () => { throw new Error('offline'); });
  assert.equal(fallback, initialProgram);
  assert.ok(fallback.weeks.some(week => week.number === 6));
  assert.equal(service(fallback, parent).activeWeek, 6);
  assert.deepEqual(service(fallback, parent).exerciseScope, defaults.exerciseScope);
});

test('invalid default weeks or scope use the existing local fallback boundary', async () => {
  for (const invalid of [null, {}, { ...defaults, activeWeek: 99 },
    { ...defaults, exerciseScope: { mode: 'unknown', selectedWeeks: [6] } },
    { ...defaults, exerciseScope: { mode: 'selected-weeks', selectedWeeks: [99] } }]) {
    assert.equal(await remote({ ...payload, defaults: invalid }), initialProgram);
  }
});
