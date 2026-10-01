import assert from 'node:assert/strict';
import test from 'node:test';
import { characterVariants, variantCandidates, selectVariant, type VariantId } from '../src/game/character-variants.ts';
import { createProgressStore } from '../src/services/progress.ts';
import { isEggRewards, type HatchRecord } from '../src/game/egg-rewards.ts';

const hatch = (variantId?: VariantId, animalId = 'tiger'): HatchRecord => ({ id: 'old', animalId, variantId, hatchedAt: '2026-10-01' });
for (const [name, hatches, candidates] of [
  ['none owned', [], ['normal', 'sleeping', 'celebrating', 'waving']],
  ['normal owned', [hatch('normal')], ['sleeping', 'celebrating', 'waving']],
  ['sleeping owned', [hatch('sleeping')], ['normal', 'celebrating', 'waving']],
  ['normal and sleeping owned', [hatch('normal'), hatch('sleeping')], ['celebrating', 'waving']],
  ['only waving undiscovered', [hatch('normal'), hatch('sleeping'), hatch('celebrating')], ['waving']],
  ['all owned', [hatch('normal'), hatch('sleeping'), hatch('celebrating'), hatch('waving')], ['normal', 'sleeping', 'celebrating', 'waving']],
  ['duplicate normals', [hatch('normal'), hatch('normal'), hatch('normal')], ['sleeping', 'celebrating', 'waving']],
  ['legacy normal', [hatch()], ['sleeping', 'celebrating', 'waving']],
  ['different animal', [hatch('normal', 'lion'), hatch('sleeping', 'lion')], ['normal', 'sleeping', 'celebrating', 'waving']],
] as const) test(`variant candidates: ${name}`, () => {
  assert.deepEqual(variantCandidates('tiger', hatches), candidates);
  assert.equal(selectVariant('tiger', hatches, () => 0), candidates[0]);
  assert.equal(selectVariant('tiger', hatches, () => .999), candidates[candidates.length - 1]);
});

test('all six catalogs and equal RNG intervals', () => {
  assert.equal(Object.keys(characterVariants).length, 6);
  for (const animal of Object.keys(characterVariants)) {
    assert.deepEqual(variantCandidates(animal, []), ['normal', 'sleeping', 'celebrating', 'waving']);
    assert.equal(selectVariant(animal, [], () => .2), 'normal');
    assert.equal(selectVariant(animal, [], () => .35), 'sleeping');
    assert.equal(selectVariant(animal, [], () => .6), 'celebrating');
    assert.equal(selectVariant(animal, [], () => .9), 'waving');
  }
});

test('pending variant is persisted at zero, never rerolled, and completion stores exactly that variant', () => {
  let value = JSON.stringify({ completedSessions: 0, selectedCharacterId: 'tiger' });
  let calls = 0;
  const storage = { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
  const reload = () => createProgressStore(() => storage, () => { calls++; return .9; });
  const initial = reload().ensureReward();
  assert.equal(initial.saved, true);
  assert.deepEqual(initial.progress.eggRewards!.currentEgg, { progress: 0, sessionsToHatch: 5, pendingAnimalId: 'tiger', pendingVariantId: 'waving' });
  assert.deepEqual(reload().ensureReward(), initial);
  for (let n = 1; n <= 5; n++) {
    const result = reload().completeSession(`s${n}`);
    assert.equal(result.progress.eggRewards!.currentEgg.pendingVariantId, 'waving');
    assert.deepEqual(reload().load(), result.progress);
    assert.deepEqual(reload().completeSession(`s${n}`), result);
    if (n === 2) reload().save({ ...reload().load(), selectedCharacterId: 'lion' });
    if (n < 5) reload().acknowledgeEgg(`s${n}`);
  }
  assert.equal(calls, 1);
  const completed = reload().load().eggRewards!;
  assert.deepEqual(completed.hatches, [{ id: 'hatch:s5', animalId: 'tiger', variantId: 'waving', hatchedAt: completed.hatches[0].hatchedAt }]);
  reload().acknowledgeEgg('s5');
  assert.equal(reload().load().eggRewards!.currentEgg.pendingAnimalId, 'lion');
  assert.equal(calls, 2);
  reload().acknowledgeEgg('s5');
  assert.equal(calls, 2);
});

test('legacy cycle and hatches load unchanged; normal completes and sleeping is the next candidate', () => {
  const legacy = { completedSessions: 9, selectedCharacterId: 'tiger', eggRewards: {
    currentEgg: { progress: 4, sessionsToHatch: 5, pendingAnimalId: 'tiger' },
    completedSessionIds: ['old'], hatches: [{ id: 'old', animalId: 'tiger', hatchedAt: '2026-09-01' }],
  } };
  let value = JSON.stringify(legacy);
  const store = createProgressStore(() => ({ getItem: () => value, setItem: (_key, next) => { value = next; } }), () => 0);
  assert.deepEqual(store.load(), legacy);
  assert.deepEqual(store.ensureReward().progress, legacy);
  assert.equal(value, JSON.stringify(legacy));
  const completed = store.completeSession('last').progress.eggRewards!;
  assert.equal(completed.hatches[1].variantId, 'normal');
  assert.deepEqual(completed.hatches[0], legacy.eggRewards.hatches[0]);
  assert.equal(store.acknowledgeEgg('last').progress.eggRewards!.currentEgg.pendingVariantId, 'sleeping');
  assert.ok(isEggRewards(completed));
  assert.equal(isEggRewards({ ...completed, currentEgg: { ...completed.currentEgg, pendingVariantId: 'invalid' } }), false);
});
