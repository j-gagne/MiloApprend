import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadingState, moveReadingSlider, readingExerciseComplete, readingSessionComplete, READING_THRESHOLD } from '../src/game/reading-session.ts';
import { readingPreviewExercises } from '../src/content/reading-preview.ts';
import { initialProgram } from '../src/content/program.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { DEFAULT_QUESTION_COUNT } from '../src/game/play-settings.ts';

test('segments are independent and completion stays latched after returning left', () => {
  const exercises = [{ id: 'one', displayedUnits: [{ display: 'm', segments: [{ unitId: 'm', text: 'm' }] }] },
    { id: 'many', displayedUnits: [{ display: 'mam', segments: ['m', 'a', 'm'].map(text => ({ unitId: text, text })) }] }];
  let state = createReadingState(exercises);
  const move = (exercise: number, segment: number, value: number) => moveReadingSlider(state, exercise, segment, value);
  state = move(1, 0, READING_THRESHOLD - 1);
  assert.equal(readingExerciseComplete(state, 1), false);
  state = move(1, 0, READING_THRESHOLD);
  state = move(1, 0, 0);
  assert.equal(state.values[1][0], 0);
  state = move(1, 2, 100);
  assert.equal(readingExerciseComplete(state, 1), false);
  state = move(1, 1, 100);
  assert.equal(readingExerciseComplete(state, 1), true);
  assert.equal(readingSessionComplete(state), false);
  state = move(0, 0, 200);
  assert.equal(state.values[0][0], 100);
  assert.equal(readingSessionComplete(state), true);
  state = move(0, 0, -20);
  assert.equal(state.values[0][0], 0);
  assert.equal(readingSessionComplete(state), true);
  assert.equal(move(10, 0, 100), state);
  assert.equal(move(0, 0, NaN), state);
  assert.equal(readingSessionComplete(createReadingState([])), false);
});

test('demo appends the longer phrase and keeps both phrases reachable without changing production size', () => {
  const service = createContentService(createContentRepository(initialProgram), 5);
  const before = JSON.stringify(initialProgram);
  const demo = readingPreviewExercises(service);
  assert.equal(demo.length, DEFAULT_QUESTION_COUNT + 1);
  assert.deepEqual(demo.slice(0, 4).map(e => e.displayedUnits.map(unit => unit.display)), [['m'], ['a'], ['m', 'a'], ['Il', 'a', 'vu', 'le', 'lila.']]);
  assert.deepEqual(demo[3].displayedUnits.map(unit => unit.segments.map(s => s.text)), [['Il'], ['a'], ['vu'], ['le'], ['li', 'la']]);
  assert.deepEqual(createReadingState(demo).values.map(row => row.length), [1, 1, 2, 6, 1, 1, 7]);
  const short = readingPreviewExercises(service, 3);
  assert.equal(short.length, 5);
  assert.equal(short[3].id, demo[3].id);
  assert.equal(readingPreviewExercises(service, 9).length, 10);
  assert.deepEqual(demo.at(-1)!.displayedUnits.map(unit => unit.display), ['Le', 'lion', 'se', 'promène', 'dans', 'la', 'savane.']);
  assert.deepEqual(demo.at(-1)!.displayedUnits.map(unit => unit.segments.map(s => s.text)), [['Le'], ['lion'], ['se'], ['promène'], ['dans'], ['la'], ['savane']]);
  const customized = { ...initialProgram, units: initialProgram.units.map(unit => unit.id === 'letter-m' ? { ...unit, enabled: false } : unit) };
  assert.ok(readingPreviewExercises(createContentService(createContentRepository(customized), 5))
    .every(e => e.displayedUnits.every(unit => unit.segments.every(s => s.unitId !== 'letter-m'))));
  assert.equal(readingPreviewExercises(createContentService(createContentRepository(initialProgram), 0)).length, 2);
  assert.equal(JSON.stringify(initialProgram), before);
});

test('a combined syllable is one displayed unit and one requirement, regardless of text length', () => {
  const exercise = { id: 'combined', displayedUnits: [{ display: 'ma', segments: [{ unitId: 'syllable-ma', text: 'ma' }] }] };
  const state = createReadingState([exercise]);
  assert.equal(exercise.displayedUnits.length, 1);
  assert.deepEqual(state.values, [[0]]);
  assert.equal(readingSessionComplete(moveReadingSlider(state, 0, 0, READING_THRESHOLD)), true);
});

test('phrase requires all six segments, in any order', () => {
  const exercise = readingPreviewExercises(createContentService(createContentRepository(initialProgram), 5))[3];
  let state = createReadingState([exercise]);
  state = moveReadingSlider(state, 0, 2, 100);
  assert.equal(state.reached[0][2], true);
  assert.equal(state.reached[0][0], false);
  state = moveReadingSlider(state, 0, 5, 100);
  assert.equal(state.reached[0][5], true);
  assert.equal(state.reached[0][4], false);
  state = moveReadingSlider(state, 0, 4, 100);
  assert.equal(readingExerciseComplete(state, 0), false);
  for (const index of [3, 1, 0]) state = moveReadingSlider(state, 0, index, 100);
  assert.equal(readingExerciseComplete(state, 0), true);
});
