import assert from 'node:assert/strict';
import test from 'node:test';
import { spellParentData } from './fixtures/spell-program.ts';
import { initialProgram } from '../src/content/program.ts';
import { effectiveProgram } from '../src/parent/model.ts';
import type { SpellActivity } from '../src/content/model.ts';
import { reconcileSpellOrder, spellTiles } from '../src/content/spell-tile-order.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { activityToExercise } from '../src/game/completion-content.ts';
import { createAnswerBank, availableAnswers, placeOccurrence } from '../src/game/answer-bank.ts';
import { createChain } from '../src/game/chain.ts';
import { parseParentData } from '../src/services/parent-store.ts';
const data = spellParentData();
const base = { ...data.activities[0] as SpellActivity, distractorUnitIds: [] };
function board(activity: SpellActivity) {
  const program = effectiveProgram(initialProgram, { ...data, activities: [activity] });
  const result = activityToExercise(createContentService(createContentRepository(program), 6), activity);
  assert.deepEqual(result.issues, []); return result.exercise!;
}
const custom = { ...base, tileOrder: ['answer:2', 'answer:1', 'answer:0', 'answer:3'] };
test('explicit M A L A keeps two independent A occurrences and survives serialized reload', () => {
  const bank = createAnswerBank(board(custom));
  assert.deepEqual(bank.map(x => x.text), ['m','a','l','a']);
  assert.deepEqual(bank.map(x => x.id), custom.tileOrder);
  const placed = placeOccurrence(board(custom), bank, {}, 1, 'answer:1');
  assert.equal(placed.accepted, true);
  assert.deepEqual(availableAnswers(bank, placed.placements).map(x => x.id), ['answer:2','answer:0','answer:3']);
  const restored = parseParentData(JSON.stringify({ ...data, activities: [custom] }))!;
  assert.deepEqual(createAnswerBank(board(restored.activities[0] as SpellActivity)), bank);
});
test('distractor V stays in exact M V A L A order, also in a configured Spell chain bank', () => {
  const activity = { ...custom, distractorUnitIds: ['letter-v'], tileOrder: ['answer:2','distractor:letter-v','answer:1','answer:0','answer:3'] };
  const exercise = board(activity);
  assert.deepEqual(createAnswerBank(exercise).map(x => x.text), ['m','v','a','l','a']);
  assert.deepEqual(createChain([exercise]).bank.map(x => x.text), ['m','v','a','l','a']);
});
test('legacy order matches current bank, including appended duplicate letters', () => {
  const activity = { ...base, distractorUnitIds: ['letter-v'], answerPosition: 1 };
  assert.deepEqual(spellTiles(activity), ['distractor:letter-v','answer:0','answer:1','answer:2','answer:3']);
  assert.deepEqual(createAnswerBank(board(activity)).map(x => x.text), ['v','l','a','m','a']);
});
test('reconciliation removes only the disabled occurrence and preserves order while adding distractors/positions', () => {
  const partial = { ...custom, missingPositions: [0,2,3], letterUnitIds: {0: 'letter-l',2:'letter-m',3:'letter-a'} };
  assert.deepEqual(reconcileSpellOrder(partial), ['answer:2','answer:0','answer:3']);
  const added = { ...custom, distractorUnitIds: ['letter-v'] };
  assert.deepEqual(reconcileSpellOrder(added), [...custom.tileOrder,'distractor:letter-v']);
  assert.deepEqual(reconcileSpellOrder({ ...custom, tileOrder: reconcileSpellOrder(added) }), custom.tileOrder);
  assert.deepEqual(reconcileSpellOrder({ ...custom, tileOrder: reconcileSpellOrder(partial) }), ['answer:2','answer:0','answer:3','answer:1']);
});

test('invalid explicit orders are rejected instead of losing or duplicating occurrences', () => {
  for (const tileOrder of [['answer:2','answer:1','answer:0'], ['answer:2','answer:1','answer:0','answer:1'], [...custom.tileOrder,'distractor:letter-v']]) {
    const activity = { ...custom, tileOrder };
    const program = effectiveProgram(initialProgram, { ...data, activities: [activity] });
    const result = activityToExercise(createContentService(createContentRepository(program), 6), activity);
    assert.equal(result.exercise, undefined);
    assert.ok(result.issues.some(issue => issue.code === 'invalid-tile-order'));
  }
  assert.equal(parseParentData(JSON.stringify({ ...data, activities: [{ ...custom, tileOrder: [42] }] })), undefined);
});
