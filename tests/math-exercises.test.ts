import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExerciseScope, LearningProgram } from '../src/content/model.ts';
import type { MathExerciseDefinition, GeneratedMathExercise } from '../src/content/math-model.ts';
import { mathCatalog } from '../src/content/math-catalog.ts';
import { generateMathExercises } from '../src/content/math-generation.ts';
import { validateMathExercise, mathExerciseNumbers } from '../src/content/math-validation.ts';
import { validateProgram } from '../src/content/validation.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { effectiveProgram, emptyParentData } from '../src/parent/model.ts';
import { parseParentData } from '../src/services/parent-store.ts';
import { loadBaseProgram } from '../src/content/remote-program.ts';
import { initialProgram } from '../src/content/program.ts';
import { seededRandom } from './helpers/random.ts';

const base: LearningProgram = { id: 'math-tests', units: [], weeks: [
  { number: 9, label: '9', mathematics: { numbers: [6, 7, 8, 9, 10] } },
  { number: 10, label: '10', mathematics: { numbers: [11, 12, 13, 14, 15] } },
  { number: 11, label: '11', mathematics: { numbers: [16, 17, 18, 19, 20] } },
] };
const scope = (weeks?: number[]): ExerciseScope => ({ mode: weeks ? 'selected-weeks' : 'all', selectedWeeks: weeks ?? [] });
const service = (weeks?: number[], program = base) => createContentService(createContentRepository(program), 10, scope(weeks));
const definitions: MathExerciseDefinition[] = [
  { id: 'math:order-11-15', type: 'ORDER_NUMBERS', sequence: [11, 12, 13, 14, 15] },
  { id: 'math:missing-13', type: 'MISSING_NUMBER', sequence: [11, 12, 13, 14, 15], missingIndex: 2, distractors: [12, 14] },
  { id: 'math:hear-11', type: 'HEAR_NUMBER', target: 11, distractors: [13, 15] },
];
const allowed = new Set([11, 12, 13, 14, 15]);
function generatedNumbers(exercise: GeneratedMathExercise): number[] {
  return exercise.type === 'ORDER_NUMBERS' ? [...exercise.answer, ...exercise.tiles]
    : exercise.type === 'MISSING_NUMBER' ? [exercise.answer, ...exercise.choices, ...exercise.sequence.filter(n => n !== null)]
      : [exercise.answer, ...exercise.choices, Number(exercise.prompt.text)];
}

test('all three types: explicit definitions and automatic catalog are validated and deterministic', () => {
  const program = { ...base, mathExercises: definitions };
  const catalog = service([10], program).getMathExercises();
  assert.deepEqual(catalog.issues, []);
  for (const definition of definitions) {
    assert.deepEqual(validateMathExercise(definition, allowed), []);
    assert.deepEqual(catalog.exercises.find(item => item.definition.id === definition.id), { definition, automatic: false, introducedInWeek: 10 });
  }
  assert.deepEqual(catalog, service([10], program).getMathExercises());
  assert.equal(catalog.exercises.filter(item => item.automatic && item.definition.type === 'ORDER_NUMBERS').length, 1);
  assert.equal(catalog.exercises.filter(item => item.automatic && item.definition.type === 'MISSING_NUMBER').length, 3);
  assert.equal(catalog.exercises.filter(item => item.automatic && item.definition.type === 'HEAR_NUMBER').length, 5);
  assert.equal(new Set(catalog.exercises.map(item => item.definition.id)).size, catalog.exercises.length);
});

test('materialization shuffles tiles, masks one answer and provides French-audio-compatible numeric text', () => {
  const output = generateMathExercises(service([10]), { count: 9 }, seededRandom(7));
  assert.deepEqual(output.issues, []);
  assert.deepEqual(output, generateMathExercises(service([10]), { count: 9 }, seededRandom(7)));
  for (const exercise of output.exercises) {
    assert.ok(generatedNumbers(exercise).every(n => allowed.has(n)));
    if (exercise.type === 'ORDER_NUMBERS') {
      assert.deepEqual([...exercise.tiles].sort((a, b) => a - b), exercise.answer);
      assert.notDeepEqual(exercise.tiles, exercise.answer);
    } else {
      assert.equal(exercise.choices.filter(n => n === exercise.answer).length, 1);
      assert.equal(new Set(exercise.choices).size, 3);
      if (exercise.type === 'MISSING_NUMBER') {
        assert.equal(exercise.sequence.filter(n => n === null).length, 1);
        assert.equal(exercise.sequence[exercise.missingIndex], null);
      } else assert.equal(exercise.prompt.text, String(exercise.answer));
    }
  }
});

test('every occurrence stays within single/multiple selected weeks, including audio and fixed members', () => {
  for (const weeks of [[10], [9], [9, 10], [10, 11], [], [11]]) {
    const configured = service(weeks);
    const permitted = new Set(configured.getEligibleMathNumbers().map(item => item.value));
    for (const entry of configured.getMathExercises().exercises) assert.ok(mathExerciseNumbers(entry.definition).every(n => permitted.has(n)));
    const output = generateMathExercises(configured, { count: 100 }, seededRandom(42));
    assert.ok(output.exercises.every(exercise => generatedNumbers(exercise).every(n => permitted.has(n))));
    assert.equal(new Set(output.exercises.map(item => item.id)).size, output.exercises.length);
  }
});

test('70/30 preference is configurable, uses activeWeek, and backfills only eligible candidates', () => {
  for (const [share, expected] of [[0.7, 7], [1, 10], [0, 0]]) {
    const result = generateMathExercises(service([9, 10]), { count: 10, currentWeekShare: share }, seededRandom(2));
    assert.equal(result.exercises.length, 10);
    assert.equal(result.exercises.filter(item => item.introducedInWeek === 10).length, expected);
  }
  assert.ok(generateMathExercises(service([9]), { count: 6 }).exercises.every(item => item.introducedInWeek === 9));
  assert.ok(generateMathExercises(service([10]), { count: 6, currentWeekShare: 0 }).exercises.every(item => item.introducedInWeek === 10));
});

for (const scenario of [
  { name: 'selectedWeeks=[11], activeWeek=11', activeWeek: 11, scope: scope([11]), reviewAllowed: false },
  { name: 'selectedWeeks=[10,11], activeWeek=11', activeWeek: 11, scope: scope([10, 11]), reviewAllowed: true },
  { name: 'all weeks, activeWeek=11', activeWeek: 11, scope: scope(), reviewAllowed: true },
  { name: 'all weeks, activeWeek=12', activeWeek: 12, scope: scope(), reviewAllowed: true },
]) test(`empty math introduction: ${scenario.name}`, () => {
  const program: LearningProgram = { id: 'empty-math-weeks', units: [], weeks: [
    { number: 10, label: '10', mathematics: { numbers: [11, 12, 13, 14, 15] } },
    { number: 11, label: '11', mathematics: { numbers: [] } },
    { number: 12, label: '12', mathematics: { numbers: [] } },
  ] };
  const configured = createContentService(createContentRepository(program), scenario.activeWeek, scenario.scope);
  assert.deepEqual(configured.getEligibleMathNumbers(), scenario.reviewAllowed
    ? [11, 12, 13, 14, 15].map(value => ({ value, introducedInWeek: 10 })) : []);
  const catalog = configured.getMathExercises();
  assert.equal(catalog.exercises.length, scenario.reviewAllowed ? 9 : 0);
  if (scenario.reviewAllowed) {
    assert.deepEqual(catalog.issues, []);
    assert.deepEqual(new Set(catalog.exercises.map(item => item.definition.type)),
      new Set(['ORDER_NUMBERS', 'MISSING_NUMBER', 'HEAR_NUMBER']));
    assert.ok(catalog.exercises.every(item => item.introducedInWeek === 10
      && mathExerciseNumbers(item.definition).every(n => allowed.has(n))));
  } else assert.equal(catalog.issues.filter(issue => issue.code === 'insufficient-math-numbers').length, 3);
  // Even a 100% current-week preference must permit filling entirely from eligible review.
  for (const policy of [{}, { currentWeekShare: 1 }, { count: 9 }]) {
    const output = generateMathExercises(configured, policy, seededRandom(7));
    assert.equal(output.exercises.length, scenario.reviewAllowed ? (policy.count ?? 6) : 0);
    assert.equal(new Set(output.exercises.map(item => item.id)).size, output.exercises.length);
    assert.ok(output.exercises.every(item => item.introducedInWeek === 10
      && generatedNumbers(item).every(n => allowed.has(n))));
    if (scenario.reviewAllowed) assert.deepEqual(output.issues, []);
    else assert.ok(output.issues.some(issue => issue.code === 'short-math-selection'));
  }
});

test('stable IDs survive number order changes and scope expansion; explicit IDs replace automatic entries', () => {
  const ids = service([10]).getMathExercises().exercises.map(item => item.definition.id);
  const reordered = { ...base, weeks: [...base.weeks].reverse().map(week => ({ ...week, mathematics: { numbers: [...week.mathematics!.numbers].reverse() } })) };
  assert.deepEqual(service([10], reordered).getMathExercises().exercises.map(item => item.definition.id), ids);
  const allIds = new Set(service().getMathExercises().exercises.map(item => item.definition.id));
  assert.ok(ids.every(id => allIds.has(id)));
  const replacement: MathExerciseDefinition = { ...definitions[2], id: 'math:auto:hear:11', type: 'HEAR_NUMBER', target: 11, distractors: [15] };
  const replaced = service([10], { ...base, mathExercises: [replacement] }).getMathExercises();
  assert.deepEqual(replaced.exercises.find(item => item.definition.id === replacement.id)?.definition, replacement);
  assert.equal(replaced.exercises.filter(item => item.definition.id === replacement.id).length, 1);
});

test('enabled flags and activityEnabled overrides apply to explicit and automatic exercises', () => {
  const disabled = { ...definitions[2], enabled: false };
  const program = { ...base, mathExercises: [disabled], activityEnabled: { 'math:auto:hear:12': false } };
  const ids = service([10], program).getMathExercises().exercises.map(item => item.definition.id);
  assert.ok(!ids.includes(disabled.id)); assert.ok(!ids.includes('math:auto:hear:12'));
  const parent = { ...emptyParentData(), activityEnabled: { [disabled.id]: true, 'math:auto:hear:11': false } };
  const effective = effectiveProgram(program, parent);
  const enabled = service([10], effective).getMathExercises().exercises.map(item => item.definition.id);
  assert.ok(enabled.includes(disabled.id)); assert.ok(!enabled.includes('math:auto:hear:11'));
});

test('no range expansion across gaps, insufficient data emits per-type diagnostics', () => {
  for (const numbers of [[], [11], [11, 12, 14, 15]]) {
    const program = { ...base, weeks: [{ number: 10, label: '10', mathematics: { numbers } }] };
    const catalog = service([10], program).getMathExercises();
    assert.ok(!catalog.exercises.some(item => item.definition.type !== 'HEAR_NUMBER'));
    assert.ok(catalog.issues.some(issue => issue.code === 'insufficient-math-numbers' && issue.path.endsWith('ORDER_NUMBERS')));
    assert.ok(catalog.exercises.every(item => mathExerciseNumbers(item.definition).every(n => numbers.includes(n))));
    assert.ok(generateMathExercises(service([10], program), { count: 20 }).issues.some(issue => issue.code === 'short-math-selection'));
  }
  assert.deepEqual(service([10], { ...base, weeks: [{ number: 10, label: 'empty' }] }).getMathExercises().exercises, []);
  assert.ok(service([10]).getMathExercises({ sequenceLength: 3, choiceCount: 5 }).exercises.length > 9);
});

test('invalid sequences, indexes, numeric definitions, answers and distractors are rejected', () => {
  const invalid: unknown[] = [null, {}, { ...definitions[0], id: 'reading:wrong' }, { ...definitions[0], sequence: [11] },
    { ...definitions[0], sequence: [11, 13, 14] }, { ...definitions[0], sequence: [13, 12, 11] },
    { ...definitions[0], sequence: [11, 11, 12] }, { ...definitions[0], sequence: [11, 12.5] },
    { ...definitions[1], missingIndex: 5 }, { ...definitions[1], missingIndex: -1 },
    { ...definitions[1], distractors: [13] }, { ...definitions[1], distractors: [12, 12] },
    { ...definitions[2], distractors: [] }, { ...definitions[2], distractors: [10] },
    { ...definitions[2], target: 16 }, { ...definitions[2], target: NaN },
    { ...definitions[2], distractors: ['12'] }, { ...definitions[1], sequence: [9, 10, 11, 12, 13] }];
  for (const definition of invalid) assert.ok(validateMathExercise(definition, allowed).length, JSON.stringify(definition));
});

test('invalid, excluded and triplicate explicit IDs never escape validation or fall back to automatic replacement', () => {
  const invalid = { ...definitions[0], id: 'math:auto:order:11-12-13-14-15', sequence: [11, 13, 15] };
  const duplicate = { ...definitions[2], id: 'math:auto:hear:11' };
  const excluded: MathExerciseDefinition = { id: 'math:excluded', type: 'HEAR_NUMBER', target: 11, distractors: [10] };
  const program = { ...base, mathExercises: [invalid, duplicate, duplicate, duplicate, excluded] };
  const catalog = service([10], program).getMathExercises();
  assert.ok(catalog.issues.some(item => item.code === 'duplicate-math-exercise'));
  assert.ok(catalog.issues.some(item => item.code === 'invalid-math-sequence'));
  assert.ok(catalog.issues.some(item => item.code === 'unavailable-math-number'));
  assert.ok(!catalog.exercises.some(item => [invalid.id, duplicate.id, excluded.id].includes(item.definition.id)));
  assert.ok(validateProgram(program).some(item => item.code === 'invalid-math-sequence'));
  assert.ok(!validateProgram(program).some(item => item.code === 'unavailable-math-number'));
});

test('future Parent definitions share persistence and effective-program overrides without mutations', () => {
  const program = { ...base, mathExercises: definitions };
  const before = JSON.stringify(program);
  const replacement: MathExerciseDefinition = { id: definitions[2].id, type: 'HEAR_NUMBER', target: 12, distractors: [13, 14] };
  const parent = parseParentData(JSON.stringify({ ...emptyParentData(), mathExercises: [replacement] }))!;
  const effective = effectiveProgram(program, parent);
  assert.equal(effective.mathExercises?.length, 3);
  assert.deepEqual(service([10], effective).getMathExercises().exercises.find(item => item.definition.id === replacement.id)?.definition, replacement);
  assert.equal(JSON.stringify(program), before);
  assert.equal(parseParentData(JSON.stringify({ ...emptyParentData(), mathExercises: [replacement, replacement] })), undefined);
});

test('schemaVersion 1 accepts root and weekly definitions; legacy JSON and malformed payload fallback remain compatible', async () => {
  const weeks = base.weeks.map(week => ({ ...week, letters: [], syllables: [], toolWords: [], words: [], sentences: [] }));
  const payload = { schemaVersion: 1, programId: 'remote-math', weeks };
  const load = (value: unknown) => loadBaseProgram(async () => new Response(JSON.stringify(value)));
  assert.equal((await load(payload)).mathExercises, undefined);
  const remote = await load({ ...payload, mathExercises: definitions.slice(0, 2), weeks: weeks.map(week => week.number === 10 ? { ...week, mathExercises: definitions.slice(2) } : week) });
  assert.equal(remote.mathExercises?.length, 3);
  assert.equal(service([10], remote).getMathExercises().exercises.filter(item => !item.automatic).length, 3);
  for (const mathExercises of [null, {}, [{ ...definitions[2], target: '11' }]]) assert.equal(await load({ ...payload, mathExercises }), initialProgram);
  // Semantic errors use the normal diagnostics/exclusion path, not a silent repair.
  const invalid = await load({ ...payload, mathExercises: [{ ...definitions[0], sequence: [11, 13] }] });
  assert.equal(invalid.id, 'remote-math');
  assert.ok(validateProgram(invalid).some(item => item.code === 'invalid-math-sequence'));
  const duplicates = await load({ ...payload, mathExercises: [definitions[2]], weeks: weeks.map(week => ({ ...week, mathExercises: [definitions[2]] })) });
  assert.ok(!service([10], duplicates).getMathExercises().exercises.some(item => item.definition.id === definitions[2].id));
});

test('invalid policy and RNG fail explicitly, catalog remains pure', () => {
  for (const policy of [{ count: 0 }, { currentWeekShare: 1.1 }, { sequenceLength: 2 }, { choiceCount: 1 }, { count: Infinity }])
    assert.throws(() => service([10]).getMathExercises(policy));
  assert.throws(() => generateMathExercises(service([10]), {}, () => 1));
  const before = JSON.stringify(base);
  mathCatalog(base, 10, scope([10])); generateMathExercises(service([10]), {}, seededRandom(1));
  assert.equal(JSON.stringify(base), before);
});
