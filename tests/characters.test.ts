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

test('catalog exposes six unique, immediately available characters with visuals', () => {
  assert.deepEqual(characterCatalog.map((c) => c.name), ['Dinosaure', 'Lion', 'Singe', 'Tigre', 'Licorne', 'Lapin']);
  assert.equal(new Set(characterCatalog.map((c) => c.id)).size, 6);
  assert.ok(characterCatalog.every((c) => c.visual.kind));
  assert.equal(getCharacter('lion').id, 'lion');
});

test('absent preference and old saves default to dinosaur without losing completed sessions', () => {
  const storage = memory();
  assert.equal(createProgressStore(() => storage).load().selectedCharacterId, 'dinosaur');
  storage.setItem(key, JSON.stringify({ completedSessions: 7 }));
  assert.deepEqual(createProgressStore(() => storage).load(), { completedSessions: 7, selectedCharacterId: 'dinosaur' });
});

test('all character voice profiles are moderate, distinct and independent of system voice names', () => {
  for (const { voiceProfile } of characterCatalog) {
    assert.ok(voiceProfile.pitch >= 0.8 && voiceProfile.pitch <= 1.2);
    assert.ok(voiceProfile.rateMultiplier >= 0.95 && voiceProfile.rateMultiplier <= 1.05);
    assert.deepEqual(Object.keys(voiceProfile).sort(), ['pitch', 'rateMultiplier']);
  }
  assert.equal(new Set(characterCatalog.map((c) => c.voiceProfile.pitch)).size, 6);
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

test('rabbit shares the catalogue and persistence mechanisms; existing profiles remain compatible', () => {
  const rabbit = getCharacter('rabbit');
  assert.equal(rabbit.name, 'Lapin');
  assert.deepEqual(rabbit.visual, { kind: 'svg', component: 'rabbit', happyExpression: true });
  assert.deepEqual(rabbit.voiceProfile, { pitch: 1.1, rateMultiplier: 0.98 });
  for (const character of characterCatalog) {
    const storage = memory();
    storage.setItem(key, JSON.stringify({ completedSessions: 7, selectedCharacterId: character.id }));
    const store = createProgressStore(() => storage);
    assert.equal(store.load().selectedCharacterId, character.id);
    store.save({ ...store.load(), completedSessions: 8 });
    assert.deepEqual(createProgressStore(() => storage).load(), { completedSessions: 8, selectedCharacterId: character.id });
  }
});


test('both production SVGs resolve through visual keys and distinct egg themes', () => {
  const dinosaur = getCharacter('dinosaur'), rabbit = getCharacter('rabbit');
  assert.equal(dinosaur.visual.kind, 'svg'); assert.equal(rabbit.visual.kind, 'svg');
  assert.ok('eggTheme' in dinosaur && 'eggTheme' in rabbit);
  if ('eggTheme' in dinosaur && 'eggTheme' in rabbit) {
    assert.deepEqual(dinosaur.eggTheme, { shellBase: '#fff5d9', shellShade: '#edcd91', shellStroke: '#e4c895', spots: '#adc69b', speckles: '#eccb90', interior: '#785232', cracks: '#936136', brokenStroke: '#ddbb83', opening: '#c18b50', accent: '#e9b853' });
    assert.equal(rabbit.eggTheme.shellBase, '#fff8eb'); assert.equal(rabbit.eggTheme.spots, '#bdb3a8'); assert.equal(rabbit.eggTheme.accent, '#dca5b4');
  }
});

test('Lion uses the registered SVG and its own pastel egg palette', () => {
  const lion = getCharacter('lion');
  assert.deepEqual(lion.visual, { kind: 'svg', component: 'lion', happyExpression: true });
  assert.ok('eggTheme' in lion);
  if ('eggTheme' in lion) {
    assert.equal(lion.eggTheme.shellBase, '#fff5de');
    assert.equal(lion.eggTheme.spots, '#d3b383');
  }
});

test('Unicorn uses the registered SVG and its own pastel egg palette', () => {
  const unicorn = getCharacter('unicorn');
  assert.deepEqual(unicorn.visual, { kind: 'svg', component: 'unicorn', happyExpression: true });
  assert.ok('eggTheme' in unicorn);
  if ('eggTheme' in unicorn) {
    assert.equal(unicorn.eggTheme.shellBase, '#faf5ed');
    assert.equal(unicorn.eggTheme.spots, '#b9a6cf');
  }
});
