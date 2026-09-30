import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProgram } from '../src/content/program.ts';
import type { Word } from '../src/content/model.ts';
import { emptyParentData, effectiveProgram, saveParentUnit } from '../src/parent/model.ts';
import { parseParentData } from '../src/services/parent-store.ts';
import { getPedagogicalReading } from '../src/content/segmented-reading.ts';
import { validateParentUnit } from '../src/parent/content.ts';
import { firstSegmentAudio } from '../src/game/first-segment-audio.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { wordToChallenge } from '../src/game/complete-word-content.ts';
import { chainParentData } from './fixtures/chain-program.ts';

const word = (id: string) => initialProgram.units.find((u): u is Word => u.id === id && u.type === 'word')!;
const reload = (data: ReturnType<typeof emptyParentData>) => parseParentData(JSON.stringify(data))!;

test('seed word modes override existing sequence and persist without changing construction or seed', () => {
  const target = word('word-âne');
  const before = JSON.stringify(initialProgram);
  for (const config of [
    { readingMode: 'segmented' as const, readingSequence: undefined },
    { readingMode: 'whole' as const, readingSequence: undefined },
    { readingMode: 'segmented' as const, readingSequence: [{ text: 'â' }, { unitId: 'syllable-ne' }] },
  ]) {
    const data = reload(saveParentUnit(emptyParentData(), initialProgram, { ...target, ...config }));
    const program = effectiveProgram(initialProgram, data);
    const result = program.units.find((u): u is Word => u.id === target.id && u.type === 'word')!;
    assert.equal(result.readingMode, config.readingMode);
    assert.deepEqual(result.readingSequence, config.readingSequence);
    assert.deepEqual(result.segmentations, target.segmentations);
    assert.equal(program.units.length, initialProgram.units.length);
    assert.deepEqual(data.customUnits, []);
  }
  assert.equal(JSON.stringify(initialProgram), before);
});

test('unit pronunciation override survives reload and explicit sequences use the effective audioText', () => {
  const unit = initialProgram.units.find((u) => u.id === 'syllable-ne')!;
  const data = reload(saveParentUnit(emptyParentData(), initialProgram, { ...unit, audioText: 'né' }));
  const program = effectiveProgram(initialProgram, data);
  const target = word('word-âne');
  assert.deepEqual(getPedagogicalReading(program, target, target.segmentations[0], 5), { mode: 'segmented', segments: ['â', 'né'], whole: 'âne' });
  assert.equal(program.units.find((u) => u.id === unit.id)!.display, 'ne');
  const fallback = effectiveProgram(initialProgram, { ...data, audioOverrides: { [unit.id]: { audioText: '' } } });
  assert.equal(fallback.units.find((u) => u.id === unit.id)!.audioText, 'ne');
});

test('custom word reading data persists; malformed or empty sequences cannot save as valid', () => {
  const target: Word = { ...word('word-lama'), id: 'parent-word-reading', display: 'lamatest', text: 'lamatest',
    audioText: 'lamatest', tags: ['practice'], completeWord: undefined, segmentations: [],
    readingSequence: [{ text: 'la' }, { unitId: 'syllable-ma' }] };
  const data = reload(saveParentUnit(emptyParentData(), initialProgram, target));
  assert.deepEqual(data.customUnits[0], JSON.parse(JSON.stringify(target)));
  for (const sequence of [[], [{ text: '' }], [{ text: '  ' }], [{ unitId: 'missing' }]]) {
    assert.ok(validateParentUnit(initialProgram, { ...target, readingSequence: sequence }).some((i) => i.severity === 'error'));
  }
  assert.equal(parseParentData(JSON.stringify({ ...data, customUnits: [{ ...target, readingSequence: [] }] })), undefined);
  assert.deepEqual(effectiveProgram(initialProgram, reload(emptyParentData())), effectiveProgram(initialProgram, emptyParentData()));
});

test('any single missing pedagogical block gets a normal audio hint; actual audioText wins', () => {
  const target = word('word-lama'), construction = target.segmentations[0];
  const program = { ...initialProgram, units: initialProgram.units.map((u) => u.id === 'syllable-la' ? { ...u, audioText: 'lah' } : u) };
  assert.equal(firstSegmentAudio(program, target, construction, [0], 5), 'lah');
  assert.equal(firstSegmentAudio(program, target, construction, [1], 5), 'ma');
  for (const missing of [[0, 1], [], [-1], [2]]) assert.equal(firstSegmentAudio(program, target, construction, missing, 5), undefined);
  const lavageProgram = effectiveProgram(program, chainParentData());
  const lavage = lavageProgram.units.find((u): u is Word => u.id === 'parent-word-chain-lavage' && u.type === 'word');
  assert.ok(lavage);
  for (const [missing, expected] of [[[0], 'lah'], [[1], 'va'], [[2], undefined], [[0, 1], undefined]] as const) {
    assert.equal(firstSegmentAudio(lavageProgram, lavage, lavage.segmentations[0], missing, 6), expected);
  }
  assert.equal(firstSegmentAudio(program, target, undefined, [0], 5), undefined);
  assert.equal(firstSegmentAudio(program, target, { ...construction, segments: [{ unitId: 'missing' }] }, [0], 5), undefined);
  const sentence = initialProgram.units.find((u) => u.type === 'sentence')!;
  assert.equal(firstSegmentAudio(program, sentence, construction, [0], 5), undefined);
  const service = createContentService(createContentRepository(program), 5);
  const variant = target.completeWord![0];
  for (const missingSegmentIndexes of [[0], [1], [0, 1]]) {
    const challenge = wordToChallenge(service, target, { ...variant, missingSegmentIndex: undefined, missingSegmentIndexes }).challenge!;
    assert.equal(challenge.firstSegmentAudio, missingSegmentIndexes.length === 1 ? ['lah', 'ma'][missingSegmentIndexes[0]] : undefined);
    assert.deepEqual(challenge.pedagogicalReading, { mode: 'segmented', segments: ['lah', 'ma'], whole: 'lama' });
  }
});
