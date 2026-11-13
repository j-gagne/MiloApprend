import assert from 'node:assert/strict';
import test from 'node:test';
import type { LearningProgram, WeeklyMathematics } from '../src/content/model.ts';
import { buildSeedProgram, type SeedWeek } from '../src/content/seed-bank.ts';
import { loadBaseProgram } from '../src/content/remote-program.ts';
import { initialProgram } from '../src/content/program.ts';
import { validateProgram } from '../src/content/validation.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { emptyParentData, effectiveProgram, effectiveWeek, saveWeekMathematics, removeCustomWeek } from '../src/parent/model.ts';
import { createParentStore, parseParentData } from '../src/services/parent-store.ts';

const week = (number: number, numbers?: number[]): SeedWeek => ({ number, label: `Semaine ${number}`,
  letters: [], syllables: [], toolWords: [], words: [], sentences: [],
  ...(numbers === undefined ? {} : { mathematics: { numbers } }) });
const bank = [week(8), week(9, [0, 8, 10]), week(10, [11, 13, 15]), week(11, [16])];
const base = buildSeedProgram('math-test', bank);
const service = (program = base, selectedWeeks?: number[], activeWeek = 10) => createContentService(createContentRepository(program), activeWeek,
  { mode: selectedWeeks === undefined ? 'all' : 'selected-weeks', selectedWeeks: selectedWeeks ?? [] });
const values = (selectedWeeks?: number[]) => service(base, selectedWeeks).getEligibleMathNumbers().map(item => item.value);

test('shared program defaults and explicit Parent scope control math service eligibility', () => {
  const program: LearningProgram = { ...base, defaults: { activeWeek: 10, exerciseScope: { mode: 'selected-weeks', selectedWeeks: [10] } } };
  const defaults = createContentService(createContentRepository(effectiveProgram(program, emptyParentData())));
  assert.deepEqual(defaults.getEligibleMathNumbers().map(item => item.value), [11, 13, 15]);
  const parent = { ...emptyParentData(), activeWeek: 9, exerciseScope: { mode: 'selected-weeks' as const, selectedWeeks: [9, 10] } };
  const overridden = createContentService(createContentRepository(effectiveProgram(program, parent)), effectiveWeek(program, parent, 6), parent.exerciseScope);
  assert.deepEqual(overridden.getEligibleMathNumbers().map(item => item.value), [0, 8, 10]);
});

test('optional math, empty weeks and no inferred content', () => {
  assert.equal(base.weeks[0].mathematics, undefined);
  assert.deepEqual(service(buildSeedProgram('empty', [week(10)])).getEligibleMathNumbers(), []);
  assert.deepEqual(values([10]), [11, 13, 15]);
  assert.deepEqual(values([9, 10]), [0, 8, 10, 11, 13, 15]);
  assert.deepEqual(values(), [0, 8, 10, 11, 13, 15]);
  assert.deepEqual(values([]), []);
  assert.deepEqual(values([11, 99]), []);
  assert.deepEqual(service(base, [10], 9).getEligibleMathNumbers(), []);
  assert.deepEqual(service(base, [10], 99).getEligibleMathNumbers(), []);
  assert.deepEqual(service().getEligibleMathNumbers()[0], { value: 0, introducedInWeek: 9 });
});

test('schema 1 accepts optional math and preserves legacy Reading payloads', async () => {
  for (const weeks of [bank, [week(10)]]) {
    const result = await loadBaseProgram(async () => new Response(JSON.stringify({ schemaVersion: 1, programId: 'remote', weeks })));
    assert.deepEqual(result, buildSeedProgram('remote', weeks));
  }
});

test('Parent overrides persist, replace base lists and preserve Reading and base immutability', () => {
  const before = JSON.stringify(base);
  const data = saveWeekMathematics(emptyParentData(), base, 10, { numbers: [12, 14] });
  let saved = '';
  const store = createParentStore(() => ({ getItem: () => saved, setItem: (_key, value) => { saved = value; } }));
  assert.equal(store.save(data), true);
  const effective = effectiveProgram(base, store.load().data);
  assert.deepEqual(service(effective, [10]).getEligibleMathNumbers().map(item => item.value), [12, 14]);
  assert.deepEqual(effective.units, base.units);
  assert.equal(JSON.stringify(base), before);
  const cleared = saveWeekMathematics(data, effective, 10, { numbers: [] });
  assert.deepEqual(service(effectiveProgram(base, parseParentData(JSON.stringify(cleared))!), [10]).getEligibleMathNumbers(), []);
  assert.deepEqual(effectiveProgram(base, emptyParentData()).weeks, base.weeks);
  assert.throws(() => saveWeekMathematics(data, effective, 10, { numbers: [8] }), /semaine 9/);
  assert.throws(() => saveWeekMathematics(data, effective, 99, { numbers: [] }), /inconnue/);
});

test('custom math-only weeks survive persistence and cannot be deleted while populated', () => {
  const data = { ...emptyParentData(), customWeeks: [{ id: 'parent-week-12', number: 12, label: '12' }] };
  const next = saveWeekMathematics(data, effectiveProgram(base, data), 12, { numbers: [20] });
  const program = effectiveProgram(base, parseParentData(JSON.stringify(next))!);
  assert.deepEqual(service(program, [12], 12).getEligibleMathNumbers(), [{ value: 20, introducedInWeek: 12 }]);
  assert.equal(removeCustomWeek(next, program, 'parent-week-12'), next);
});

for (const mathematics of [null, [], {}, { numbers: '11' }, { numbers: [-1] }, { numbers: [1.5] },
  { numbers: ['11'] }, { numbers: [11, 11] }, { numbers: [Number.MAX_SAFE_INTEGER + 1] }, { numbers: [Infinity] }]) {
  test(`malformed math rejected safely: ${JSON.stringify(mathematics)}`, async () => {
    const invalid = { ...week(10), mathematics: mathematics as WeeklyMathematics };
    const program: LearningProgram = { ...base, weeks: [invalid] };
    assert.ok(validateProgram(program).some(issue => issue.code === 'invalid-mathematics'));
    assert.deepEqual(service(program).getEligibleMathNumbers(), []);
    assert.throws(() => saveWeekMathematics(emptyParentData(), base, 10, invalid.mathematics));
    assert.equal(parseParentData(JSON.stringify({ ...emptyParentData(), mathematicsOverrides: { 10: mathematics } })), undefined);
    assert.equal(await loadBaseProgram(async () => new Response(JSON.stringify({ schemaVersion: 1, programId: 'invalid', weeks: [invalid] }))), initialProgram);
  });
}

test('cross-week conflicts reject remote and Parent definitions, fail closed after a base update', async () => {
  const weeks = [week(9, [11]), week(10, [11])];
  const program = buildSeedProgram('conflict', weeks);
  assert.ok(validateProgram(program).some(issue => issue.code === 'duplicate-math-number'));
  assert.deepEqual(service(program, [10]).getEligibleMathNumbers(), []);
  assert.equal(await loadBaseProgram(async () => new Response(JSON.stringify({ schemaVersion: 1, programId: 'conflict', weeks }))), initialProgram);
  assert.equal(parseParentData(JSON.stringify({ ...emptyParentData(), mathematicsOverrides: { 9: { numbers: [11] }, 10: { numbers: [11] } } })), undefined);
  const data = saveWeekMathematics(emptyParentData(), base, 10, { numbers: [12] });
  assert.deepEqual(service(effectiveProgram(buildSeedProgram('updated', [week(9, [12]), week(10)]), data), [10]).getEligibleMathNumbers(), []);
});

test('math changes leave Reading catalog and diagnostics unchanged', () => {
  const next = effectiveProgram(initialProgram, saveWeekMathematics(emptyParentData(), initialProgram, initialProgram.weeks[0].number, { numbers: [0, 4] }));
  assert.deepEqual(service(next).getReadingExercises(), service(initialProgram).getReadingExercises());
  assert.deepEqual(validateProgram(next), validateProgram(initialProgram));
});
