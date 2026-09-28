import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgressStore, normalizePlayerName, DEFAULT_PLAYER_NAME } from '../src/services/progress.ts';

test('name validation trims, preserves case and Unicode, refuses empty and overlong input', () => {
  assert.equal(normalizePlayerName('  Éloïse-Anne  '), 'Éloïse-Anne');
  assert.equal(normalizePlayerName('李 Zoë'), '李 Zoë');
  assert.equal(normalizePlayerName('a'.repeat(20)), 'a'.repeat(20));
  for (const value of ['', '   ', 'a'.repeat(21), null, 42]) assert.equal(normalizePlayerName(value), undefined);
});

test('profile uses existing storage and preserves progress through name/character changes', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
  const key = 'milo-apprend.progress.v1';
  storage.setItem(key, JSON.stringify({ completedSessions: 7, selectedCharacterId: 'lion' }));
  const store = createProgressStore(() => storage);
  assert.equal(store.load().playerName ?? DEFAULT_PLAYER_NAME, 'Milo');
  assert.equal(store.load().selectedCharacterId, 'lion');
  store.save({ ...store.load(), playerName: normalizePlayerName('  Éloïse  ') });
  assert.deepEqual(createProgressStore(() => storage).load(), { completedSessions: 7, selectedCharacterId: 'lion', playerName: 'Éloïse' });
  store.save({ ...store.load(), playerName: 'Zoë' });
  store.save({ ...store.load(), selectedCharacterId: 'unicorn' });
  assert.equal(store.load().playerName, 'Zoë');
  assert.equal(store.load().completedSessions, 7);
  assert.deepEqual([...values.keys()], [key]);
  storage.setItem(key, JSON.stringify({ completedSessions: 7, selectedCharacterId: 'lion', playerName: '  ' }));
  assert.equal(store.load().playerName ?? DEFAULT_PLAYER_NAME, 'Milo');
  assert.equal(store.load().completedSessions, 7);
});
