import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressStore } from '../src/services/progress.ts';
import { generateMathExercises } from '../src/content/math-generation.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
test('subject preference is optional, round-trips and survives rewards', () => {
  let raw = JSON.stringify({ completedSessions: 0 });
  const store = createProgressStore(() => ({ getItem: () => raw, setItem: (_, value) => { raw = value; } }));
  assert.equal(store.load().homeSubject, undefined);
  store.save({ ...store.load(), homeSubject: 'math' });
  store.ensureReward(); store.completeSession('test');
  assert.equal(store.load().homeSubject, 'math');
});
test('subject activity is filtered before sampling', () => {
  const service = createContentService(createContentRepository({ id: 'test', units: [], weeks: [{ number: 10, label: '10', mathematics: { numbers: [11,12,13,14,15] } }] }), 10);
  for (const type of ['ORDER_NUMBERS', 'MISSING_NUMBER', 'HEAR_NUMBER'] as const) {
    const result = generateMathExercises(service, {}, () => 0.5, type);
    assert.ok(result.exercises.length > 0);
    assert.ok(result.exercises.every(item => item.type === type));
  }
});
