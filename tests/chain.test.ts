import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { chainParentData } from './fixtures/chain-program.ts';
import { initialProgram } from '../src/content/program.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { effectiveProgram, emptyParentData } from '../src/parent/model.ts';
import type { ParentData } from '../src/parent/model.ts';
import { createParentStore, parseParentData, PARENT_STORAGE_KEY } from '../src/services/parent-store.ts';
import { DEFAULT_GAME_MODE, DEFAULT_CHAIN_LENGTH } from '../src/game/play-settings.ts';
import { createPlaySession } from '../src/game/play-session.ts';
import { createCompleteWordSession } from '../src/game/complete-word-session.ts';
import { createChain, advanceChain, chainFinished, remainingChainBank } from '../src/game/chain.ts';
import type { ChainState } from '../src/game/chain.ts';
import { availableAnswers, createAnswerBank, placeOccurrence, removeOccurrence } from '../src/game/answer-bank.ts';
import type { OccurrencePlacements } from '../src/game/answer-bank.ts';

// Disabled activities and deliberately insufficient pools emit expected diagnostics.
mock.method(console, 'warn', () => {});
const service = (data: ParentData) => createContentService(createContentRepository(effectiveProgram(initialProgram, data)), data.activeWeek ?? 5, data.exerciseScope);
const session = (data = chainParentData()) => createPlaySession(service(data), data, () => 0.999);
const selected = session().challenges;
function solve(chain: ChainState): OccurrencePlacements {
  const target = chain.targets[chain.completed.length];
  const bank = remainingChainBank(chain);
  let placements: OccurrencePlacements = {};
  for (const slot of target.slots) {
    const answer = availableAnswers(bank, placements).find((a) => a.text === slot.expected)!;
    const result = placeOccurrence(target, bank, placements, slot.segmentIndex, answer.id);
    assert.equal(result.accepted, true);
    placements = result.placements;
  }
  return placements;
}

test('old saves default to individual and chain length 3; individual session/bank/distractors unchanged', () => {
  const data = parseParentData(JSON.stringify(emptyParentData()))!;
  assert.equal(data.gameMode ?? DEFAULT_GAME_MODE, 'individual');
  assert.equal(data.chainLength ?? DEFAULT_CHAIN_LENGTH, 3);
  const actual = session(data);
  assert.equal(actual.mode, 'individual');
  assert.equal(actual.chains, undefined);
  assert.deepEqual(actual.challenges, createCompleteWordSession(service(data), { random: () => 0.999, strategy: { size: 6, recentCount: 4 } }));
  assert.equal(actual.challenges.length, 6);
  const individual = session({ ...chainParentData(), gameMode: 'individual' });
  assert.ok(createAnswerBank(individual.challenges[0]).some((a) => a.text === 'li'));
  assert.ok(createAnswerBank(individual.challenges[0]).some((a) => a.text === 'so'));
});

test('individual/chain and lengths 2/3 persist through the existing Parent store', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  for (const gameMode of ['individual', 'chain'] as const) for (const chainLength of [2, 3] as const) {
    const data = { ...chainParentData(), gameMode, chainLength };
    assert.equal(createParentStore(() => storage).save(data), true);
    assert.deepEqual(createParentStore(() => storage).load().data, data);
    assert.deepEqual([...values.keys()], [PARENT_STORAGE_KEY]);
  }
  assert.equal(parseParentData(JSON.stringify({ ...emptyParentData(), chainLength: 4 })), undefined);
  assert.equal(parseParentData(JSON.stringify({ ...emptyParentData(), gameMode: 'unknown' })), undefined);
});

for (const chainLength of [2, 3] as const) test(`chain selects ${chainLength} distinct targets`, () => {
  const result = session({ ...chainParentData(), chainLength, questionCount: chainLength });
  assert.equal(result.challenges.length, chainLength);
  assert.equal(new Set(result.challenges.map((c) => c.wordId)).size, chainLength);
  assert.equal(result.mode, 'chain');
});

test('insufficient targets shorten to 2, fall back to one individual, or return an empty session', () => {
  assert.equal(session(chainParentData(2)).challenges.length, 2);
  const single = session(chainParentData(1));
  assert.equal(single.mode, 'individual'); assert.equal(single.challenges.length, 1);
  assert.equal(single.chains, undefined);
  assert.equal(session(chainParentData(0)).challenges.length, 0);
});

test('shared bank comes exactly from selected slots, including VO + NI, with no distractor or inferred literal', () => {
  const chain = createChain(selected);
  assert.deepEqual(chain.bank.map((a) => a.text), ['la', 'ma', 'la', 'va', 'vo', 'ni']);
  assert.equal(new Set(chain.bank.map((a) => a.id)).size, 6);
  assert.equal(chain.targets[2], selected[2]);
  assert.equal(selected[2].targetType, 'sentence');
  const wholeWords = { ...selected[2], slots: [{ segmentIndex: 1, expected: 'volé' }, { segmentIndex: 3, expected: 'nid' }],
    choices: [{ text: 'volé', kind: 'word' as const }, { text: 'nid', kind: 'word' as const }] };
  assert.deepEqual(createChain([wholeWords]).bank.map((a) => a.text), ['volé', 'nid']);
});

test('equal occurrences, removal, replacement and incorrect attempts preserve inventory', () => {
  const chain = createChain(selected);
  const [first, second] = chain.bank.filter((a) => a.text === 'la');
  const target = chain.targets[0];
  const placed = placeOccurrence(target, chain.bank, {}, 0, first.id).placements;
  assert.ok(availableAnswers(chain.bank, placed).some((a) => a.id === second.id));
  assert.deepEqual(availableAnswers(chain.bank, removeOccurrence(placed, 0)), chain.bank);
  const replaced = placeOccurrence(target, chain.bank, placed, 0, second.id).placements;
  assert.ok(availableAnswers(chain.bank, replaced).some((a) => a.id === first.id));
  assert.equal(availableAnswers(chain.bank, replaced).length + Object.values(replaced).length, chain.bank.length);
  const wrong = placeOccurrence(target, chain.bank, replaced, 1, first.id);
  assert.equal(wrong.accepted, false); assert.equal(wrong.placements, replaced);
  assert.equal(advanceChain(chain, replaced), chain);
});

test('validated targets keep consumed IDs; next target uses remaining bank, never a new bank', () => {
  let chain = createChain(selected);
  const original = chain.bank;
  const first = solve(chain);
  chain = advanceChain(chain, first);
  assert.equal(chain.bank, original);
  assert.deepEqual(remainingChainBank(chain).map((a) => a.text), ['la', 'va', 'vo', 'ni']);
  assert.equal(chainFinished(chain), false);
  assert.equal(advanceChain(chain, first), chain);
  chain = advanceChain(chain, solve(chain));
  assert.equal(chain.bank, original);
  assert.deepEqual(remainingChainBank(chain).map((a) => a.text), ['vo', 'ni']);
  chain = advanceChain(chain, solve(chain));
  assert.equal(chainFinished(chain), true);
  assert.deepEqual(remainingChainBank(chain), []);
});

test('completion depends on all successful targets, not empty inventory or leftover distractors', () => {
  let chain = createChain(selected, [{ text: 'li', kind: 'syllable' }]);
  assert.equal(chainFinished({ ...chain, bank: [] }), false);
  for (let i = 0; i < selected.length; i++) chain = advanceChain(chain, solve(chain));
  assert.equal(chainFinished(chain), true);
  assert.deepEqual(remainingChainBank(chain).map((a) => a.text), ['li']);
  assert.equal(advanceChain(chain, {}), chain);
});

test('explicit/automatic activations, unit overrides and selected weeks remain authoritative', () => {
  const data = chainParentData(3, true);
  assert.ok(session(data).challenges.some((c) => c.targetType === 'syllable'));
  const syllableId = 'generated:parent-syllable-chain:self:missing:0';
  const disabled = { ...data, activityEnabled: { ...data.activityEnabled, [syllableId]: false,
    'parent-activity-parent-word-chain-lavage': false } };
  assert.equal(session(disabled).challenges.length, 1);
  assert.equal(session({ ...data, unitEnabled: { 'parent-word-chain-lama': false } }).challenges.some((c) => c.word === 'lama'), false);
  assert.equal(session({ ...data, exerciseScope: { mode: 'selected-weeks', selectedWeeks: [] } }).challenges.length, 0);
  const base = session({ ...emptyParentData(), gameMode: 'chain' });
  assert.ok(base.challenges.every((c) => c.targetType !== 'syllable'));
});
