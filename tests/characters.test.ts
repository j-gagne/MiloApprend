import assert from 'node:assert/strict';
import test from 'node:test';
import { characterCatalog, getCharacter, characterPosition } from '../src/game/characters.ts';
import { createProgressStore } from '../src/services/progress.ts';
import { createSessionProgress } from '../src/game/session-progress.ts';

const key = 'milo-apprend.progress.v1';
function memory() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
}

test('catalog exposes five unique, immediately available characters with visuals', () => {
  assert.deepEqual(characterCatalog.map((c) => c.name), ['Dinosaure', 'Lion', 'Singe', 'Tigre', 'Licorne']);
  assert.equal(new Set(characterCatalog.map((c) => c.id)).size, 5);
  assert.ok(characterCatalog.every((c) => c.visual.kind));
  assert.equal(getCharacter('lion').id, 'lion');
});

test('absent preference and old saves default to dinosaur without losing completed sessions', () => {
  const storage = memory();
  assert.equal(createProgressStore(() => storage).load().selectedCharacterId, 'dinosaur');
  storage.setItem(key, JSON.stringify({ completedSessions: 7 }));
  assert.deepEqual(createProgressStore(() => storage).load(), { completedSessions: 7, selectedCharacterId: 'dinosaur' });
});

test('lion persists using the existing key through new store instances and completed sessions', () => {
  const storage = memory();
  const store = createProgressStore(() => storage);
  assert.equal(store.save({ ...store.load(), selectedCharacterId: 'lion' }), true);
  const loaded = createProgressStore(() => storage).load();
  assert.equal(loaded.selectedCharacterId, 'lion');
  store.save({ ...loaded, completedSessions: loaded.completedSessions + 1 });
  assert.deepEqual(createProgressStore(() => storage).load(), { completedSessions: 1, selectedCharacterId: 'lion' });
  assert.deepEqual([...storage.values.keys()], [key]);
});

test('unknown, malformed and removed character IDs fall back without discarding progress', () => {
  const storage = memory();
  for (const selectedCharacterId of ['dragon', '', 42, null, {}, []]) {
    storage.setItem(key, JSON.stringify({ completedSessions: 4, selectedCharacterId }));
    assert.deepEqual(createProgressStore(() => storage).load(), { completedSessions: 4, selectedCharacterId: 'dinosaur' });
  }
});

test('unavailable storage never prevents play or throws on selection', () => {
  const store = createProgressStore(() => { throw new Error('blocked'); });
  assert.equal(store.load().selectedCharacterId, 'dinosaur');
  assert.equal(store.save({ completedSessions: 0, selectedCharacterId: 'lion' }), false);
});

test('position uses completed targets only, independently of stars', () => {
  for (const completedTargets of [0, 1, 3, 6]) {
    for (const perfectTargets of [0, 1, 6]) {
      const progress = { ...createSessionProgress(6), completedTargets, perfectTargets };
      assert.equal(characterPosition(progress), completedTargets / 6);
    }
  }
  assert.equal(characterPosition(createSessionProgress(0)), 0);
});
