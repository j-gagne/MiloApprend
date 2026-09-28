import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProgram } from '../src/content/program.ts';
import { getSegmentedReading } from '../src/content/segmented-reading.ts';
import { getCompleteWordChallenges } from '../src/game/complete-word-content.ts';
import { effectiveProgram } from '../src/parent/model.ts';
import { chainParentData } from './fixtures/chain-program.ts';
import { AudioSequence, SEGMENT_PAUSE_MS, WHOLE_WORD_PAUSE_MS } from '../src/services/audio-sequence.ts';
import type { Word } from '../src/content/model.ts';

const word = (id: string): Word => {
  const target = initialProgram.units.find((u) => u.id === id);
  assert.ok(target?.type === 'word'); return target;
};
for (const [id, segments, whole] of [
  ['word-ami', ['a', 'mi'], 'ami'], ['word-lama', ['la', 'ma'], 'lama'],
] as const) test(`${whole}: entire explicit construction then whole word`, () => {
  const target = word(id);
  assert.deepEqual(getSegmentedReading(initialProgram, target, target.segmentations[0], 5), { segments, whole });
});

test('VE keeps its visible spelling and explicitly requests vé for speech', () => {
  const ve = initialProgram.units.find((u) => u.id === 'syllable-ve');
  assert.ok(ve?.type === 'syllable');
  assert.equal(ve.display, 've');
  assert.equal(ve.audioText, 'vé');
});

test('OLIVE reads each referenced audioText then the unchanged whole word', () => {
  const target = word('practice-olive');
  const reading = getSegmentedReading(initialProgram, target, target.segmentations[0], 5);
  assert.deepEqual(reading, { segments: ['o', 'li', 'vé'], whole: 'olive' });
  assert.deepEqual(reading?.segments, ['letter-o', 'syllable-li', 'syllable-ve'].map(
    (id) => initialProgram.units.find((u) => u.id === id)!.audioText));
  assert.equal(reading?.whole, target.audioText);
  const challenges = getCompleteWordChallenges().challenges.filter((c) => c.wordId === target.id);
  assert.ok(challenges.length > 0);
  for (const challenge of challenges) assert.equal(challenge.audioText, 'olive');
});

test('audio sequence forwards supplied text verbatim without a VE pronunciation mapping', async () => {
  const spoken: string[] = [];
  await new AudioSequence().play(['VE', 've', 'vé', 'olive'].map((text) => ({ text })),
    async (step) => { spoken.push(step.text); });
  assert.deepEqual(spoken, ['VE', 've', 'vé', 'olive']);
});

test('LAVAGE literal ge blocks segmented reading without creating units', () => {
  const data = chainParentData();
  const program = effectiveProgram(initialProgram, data);
  const target = program.units.find((u) => u.id === 'parent-word-chain-lavage');
  assert.ok(target?.type === 'word');
  const before = JSON.stringify(program);
  assert.equal(getSegmentedReading(program, target, target.segmentations[0], 6), null);
  assert.equal(program.units.some((u) => u.display === 'ge'), false);
  assert.equal(JSON.stringify(program), before);
});

test('missing, invalid, unavailable construction or references are ineligible; phrases and syllables stay normal', () => {
  const target = word('word-ami');
  const construction = target.segmentations[0];
  assert.equal(getSegmentedReading(initialProgram, target, undefined, 5), null);
  assert.equal(getSegmentedReading(initialProgram, target, { ...construction, segments: [] }, 5), null);
  assert.equal(getSegmentedReading(initialProgram, target, { ...construction, segments: [{ unitId: 'letter-a' }] }, 5), null);
  assert.equal(getSegmentedReading(initialProgram, target, { ...construction, segments: [{ unitId: 'missing' }] }, 5), null);
  assert.equal(getSegmentedReading(initialProgram, target, construction, 2), null);
  assert.equal(getSegmentedReading({ ...initialProgram, units: initialProgram.units.map((u) => u.id === 'letter-a' ? { ...u, enabled: false } : u) }, target, construction, 5), null);
  for (const type of ['sentence', 'syllable']) {
    const other = initialProgram.units.find((u) => u.type === type)!;
    assert.equal(getSegmentedReading(initialProgram, other, construction, 5), null);
  }
});

test('audioText takes precedence over display for units and target, with display fallback', () => {
  const target = { ...word('word-ami'), audioText: 'mon ami' };
  const program = { ...initialProgram, units: initialProgram.units.map((u) => u.id === 'letter-a' ? { ...u, audioText: 'ah' } : u) };
  assert.deepEqual(getSegmentedReading(program, target, target.segmentations[0], 5), { segments: ['ah', 'mi'], whole: 'mon ami' });
  const fallback = { ...program, units: program.units.map((u) => u.id === 'letter-a' ? { ...u, audioText: '' } : u) };
  assert.deepEqual(getSegmentedReading(fallback, target, target.segmentations[0], 5)?.segments, ['a', 'mi']);
});

test('punctuation-only literal is ignored when the explicit construction remains valid', () => {
  const target = { ...word('word-ami'), display: 'ami!', text: 'ami!', audioText: 'ami' };
  const construction = { ...target.segmentations[0], segments: [...target.segmentations[0].segments, { literal: '!', note: 'ponctuation' }] };
  assert.deepEqual(getSegmentedReading(initialProgram, target, construction, 5), { segments: ['a', 'mi'], whole: 'ami' });
});

test('single/multi-slot LAMA get identical full readings, not just missing answers', () => {
  const challenges = getCompleteWordChallenges().challenges.filter((c) => c.wordId === 'word-lama');
  assert.ok(challenges.some((c) => c.slots.length === 1));
  assert.ok(challenges.some((c) => c.slots.length === 2));
  for (const challenge of challenges) assert.deepEqual(challenge.segmentedReading, { segments: ['la', 'ma'], whole: 'lama' });
});

const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };
test('separate playback calls and centralized pauses: 400 ms, then 600 ms', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const sequence = new AudioSequence();
  const spoken: string[] = [];
  const result = sequence.play([{ text: 'a', pauseAfter: SEGMENT_PAUSE_MS }, { text: 'mi', pauseAfter: WHOLE_WORD_PAUSE_MS }, { text: 'ami' }],
    async (step) => { spoken.push(step.text); });
  assert.deepEqual(spoken, ['a']); // Direct call, before any Promise/timer continuation.
  await flush(); t.mock.timers.tick(399); await flush(); assert.deepEqual(spoken, ['a']);
  t.mock.timers.tick(1); await flush(); assert.deepEqual(spoken, ['a', 'mi']);
  t.mock.timers.tick(599); await flush(); assert.deepEqual(spoken, ['a', 'mi']);
  t.mock.timers.tick(1); await result; assert.deepEqual(spoken, ['a', 'mi', 'ami']);
});

test('restarting during a pause settles old sequence and prevents interleaving', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const sequence = new AudioSequence();
  const spoken: string[] = [];
  const speak = async (step: { text: string }) => { spoken.push(step.text); };
  const old = sequence.play([{ text: 'a', pauseAfter: SEGMENT_PAUSE_MS }, { text: 'mi' }], speak);
  await flush();
  const current = sequence.play([{ text: 'la', pauseAfter: SEGMENT_PAUSE_MS }, { text: 'ma' }], speak);
  await old; await flush(); t.mock.timers.tick(1000); await current;
  assert.deepEqual(spoken, ['a', 'la', 'ma']);
});

test('cancellation while speaking prevents all later steps, even after a late end event', async () => {
  const sequence = new AudioSequence();
  const spoken: string[] = [];
  let finish!: () => void;
  const result = sequence.play([{ text: 'a' }, { text: 'mi' }, { text: 'ami' }], (step) => {
    spoken.push(step.text); return new Promise<void>((resolve) => { finish = resolve; });
  });
  sequence.cancel(); await result;
  finish(); await flush(); assert.deepEqual(spoken, ['a']);
});
