import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgressStore } from '../src/services/progress.ts';
import { emptyEggRewards, eggVisualStage } from '../src/game/egg-rewards.ts';

function fixture() {
  let value: string | null = JSON.stringify({ completedSessions: 12, selectedCharacterId: 'rabbit', playerName: 'Zoé' });
  let blocked = false;
  const storage = { getItem: () => value, setItem: (_key: string, next: string) => { if (blocked) throw Error('blocked'); value = next; } };
  return { store: createProgressStore(() => storage), reload: () => createProgressStore(() => storage), block: (next: boolean) => { blocked = next; } };
}

test('old profile stays intact; new egg starts at zero without retroactive rewards', () => {
  const { store } = fixture();
  assert.deepEqual(store.load(), { completedSessions: 12, selectedCharacterId: 'rabbit', playerName: 'Zoé' });
  assert.equal(emptyEggRewards().currentEgg.progress, 0);
  const first = store.completeSession('first');
  assert.equal(first.saved, true);
  assert.equal(first.progress.completedSessions, 13);
  assert.equal(first.progress.playerName, 'Zoé');
  assert.equal(first.progress.selectedCharacterId, 'rabbit');
  assert.equal(first.progress.eggRewards?.currentEgg.progress, 1);
});

test('sessions 1 through 5 persist once, including hatch before acknowledgement and reload', () => {
  const { store, reload } = fixture();
  for (let n = 1; n <= 10; n++) {
    const id = `session-${n}`, stage = (n - 1) % 5 + 1;
    const result = store.completeSession(id);
    const rewards = result.progress.eggRewards!;
    assert.equal(rewards.currentEgg.progress, stage);
    assert.equal(eggVisualStage(stage, rewards.currentEgg.sessionsToHatch), stage);
    assert.equal(rewards.hatches.length, Math.floor(n / 5));
    assert.deepEqual(reload().load(), result.progress);
    assert.deepEqual(reload().completeSession(id), result);
    assert.equal(result.progress.completedSessions, 12 + n);
    const acknowledged = reload().acknowledgeEgg(id);
    assert.equal(acknowledged.progress.eggRewards?.currentEgg.progress, stage === 5 ? 0 : stage);
    assert.equal(acknowledged.progress.eggRewards?.pendingTransition, undefined);
    assert.deepEqual(reload().acknowledgeEgg(id), acknowledged);
    assert.deepEqual(reload().completeSession(id), acknowledged);
  }
  const hatches = store.load().eggRewards!.hatches;
  assert.equal(new Set(hatches.map(h => h.id)).size, 2);
  assert.deepEqual(hatches.map(h => h.animalId), ['dinosaur', 'dinosaur']);
  assert.ok(hatches.every(h => Number.isFinite(Date.parse(h.hatchedAt))));
});

test('failed writes are retryable without duplicate reward or premature reset', () => {
  const { store, block } = fixture();
  for (let n = 1; n < 5; n++) { store.completeSession(String(n)); store.acknowledgeEgg(String(n)); }
  block(true);
  assert.equal(store.completeSession('5').saved, false);
  assert.equal(store.load().eggRewards?.currentEgg.progress, 4);
  block(false);
  assert.equal(store.completeSession('5').saved, true);
  assert.equal(store.load().eggRewards?.hatches.length, 1);
  block(true);
  assert.equal(store.acknowledgeEgg('5').saved, false);
  assert.equal(store.load().eggRewards?.currentEgg.progress, 5);
  block(false);
  assert.equal(store.acknowledgeEgg('5').saved, true);
  assert.equal(store.load().eggRewards?.currentEgg.progress, 0);
  assert.equal(store.load().eggRewards?.hatches.length, 1);
});
