import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadingSession } from '../src/game/reading-program-session.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { buildSeedProgram } from '../src/content/seed-bank.ts';

const program = buildSeedProgram('session-fixture', [1, 2].map(number => ({ number, label: String(number),
  letters: [], syllables: [], toolWords: [], sentences: [],
  words: Array.from({ length: 6 }, (_, index) => ({ id: `word-${number}-${index}`, display: `fixture-${number}-${index}` })),
})));
const service = createContentService(createContentRepository(program), 2);
test('Reading selects configured page count once, without duplicates, with recent/review mix and injectable randomness', () => {
  for (const size of [3, 6, 9]) {
    const result = createReadingSession(service, { questionCount: size }, () => 0);
    assert.equal(result.exercises.length, size);
    assert.equal(new Set(result.exercises.map(exercise => exercise.id)).size, size);
    assert.equal(result.exercises.filter(exercise => exercise.introducedInWeek === 2).length, Math.ceil(size * 3 / 5));
    assert.deepEqual(result, createReadingSession(service, { questionCount: size }, () => 0));
  }
  assert.equal(createReadingSession(service).exercises.length, 6);
});
test('Reading uses the supplied effective catalog scope, shortens sessions and accepts an empty catalog', () => {
  const scoped = createContentService(createContentRepository(program), 1, { mode: 'selected-weeks', selectedWeeks: [1] });
  const result = createReadingSession(scoped, { questionCount: 9 });
  assert.equal(result.exercises.length, 6);
  assert.ok(result.exercises.every(exercise => exercise.introducedInWeek === 1));
  const empty = createContentService(createContentRepository(program), 1, { mode: 'selected-weeks', selectedWeeks: [2] });
  assert.deepEqual(createReadingSession(empty).exercises, []);
});
