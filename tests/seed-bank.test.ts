import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProgram, seedBank } from '../src/content/program.ts';
import { buildSeedProgram, type SeedWeek } from '../src/content/seed-bank.ts';
import { automaticActivities, activityCatalog } from '../src/content/activity-catalog.ts';
import { contentRepository, createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { getCompleteWordChallenges } from '../src/game/complete-word-content.ts';
import { activityToExercise } from '../src/game/completion-content.ts';
import { effectiveProgram, emptyParentData } from '../src/parent/model.ts';
import { parseParentData } from '../src/services/parent-store.ts';
import type { LearningProgram, Word } from '../src/content/model.ts';

const service = (program: LearningProgram) => createContentService(createContentRepository(program), 5);
const automatic = automaticActivities(initialProgram, 5);

test('repository loads the central seed bank, preserving weeks and stable IDs', () => {
  assert.deepEqual(contentRepository.getProgram(), buildSeedProgram('milo-school-program', seedBank));
  assert.deepEqual(initialProgram.weeks.map((w) => w.number), [2, 3, 4, 5]);
  for (const [id, week] of Object.entries({ 'letter-a': 2, 'syllable-la': 3, 'syllable-ma': 3,
    'tool-word-Il': 3, 'word-lama': 3, 'word-lune': 5, 'practice-mule': 4, 'sentence-il-a-lu': 3 })) {
    assert.equal(initialProgram.units.find((u) => u.id === id)?.introducedInWeek, week);
  }
  const lama = initialProgram.units.find((u) => u.id === 'word-lama');
  assert.ok(lama?.type === 'word');
  assert.deepEqual(lama.segmentations, [{ id: 'initial', segments: [{ unitId: 'syllable-la' }, { unitId: 'syllable-ma' }] }]);
  assert.ok(activityCatalog(initialProgram, 5).some((a) => a.id === 'word-lama:deux-emplacements'));
  assert.equal(initialProgram.units.find((u) => u.id === 'sentence-il-a-lu')?.display, 'Il a lu.');
});

const addedWeek: SeedWeek = {
  number: 6, label: 'Semaine 6', letters: ['b'], syllables: ['ba'], toolWords: [],
  words: [{ id: 'test-lavage', display: 'lavage', audioText: 'lavage', imageAsset: { emoji: '🧼', label: 'Lavage' },
    segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-la' }, { unitId: 'syllable-va' }, { literal: 'ge', note: 'visible' }] }] }],
  sentences: [{ id: 'test-sentence', display: 'Il a lu.', audioText: 'Il a lu.',
    segmentations: [{ id: 'main', segments: [{ unitId: 'tool-word-Il' }, { separator: ' ' },
      { unitId: 'letter-a' }, { separator: ' ' }, { unitId: 'syllable-lu' }] }] }],
};

test('adding one week supplies units, Word/Sentence constructions, metadata and automatic exercises', () => {
  const program = buildSeedProgram('test', [...seedBank, addedWeek]);
  for (const id of ['letter-b', 'syllable-ba', 'test-lavage', 'test-sentence']) {
    assert.equal(program.units.find((u) => u.id === id)?.introducedInWeek, 6);
    assert.equal(initialProgram.units.some((u) => u.id === id), false);
  }
  for (const source of [...addedWeek.words, ...addedWeek.sentences]) {
    const target = program.units.find((u) => u.id === source.id);
    assert.ok(target?.type === 'word' || target?.type === 'sentence');
    assert.deepEqual(target.segmentations, source.segmentations);
    const variants = automaticActivities(program, 6).filter((a) => a.targetId === source.id);
    assert.equal(variants.length, source.id === 'test-lavage' ? 3 : 4);
    assert.ok(variants.every((a) => a.enabled));
    for (const activity of variants) {
      const svc = createContentService(createContentRepository({ ...program, activities: [activity] }), 6);
      const exercise = activityToExercise(svc, activity).exercise;
      assert.ok(exercise);
      assert.equal(exercise.target.audioText, source.audioText);
      if (source.id === 'test-lavage') {
        assert.equal(exercise.segments[2], 'ge');
        assert.ok(exercise.slots.every((s) => s.segmentIndex !== 2));
        assert.ok(exercise.choices.every((c) => c.text !== 'ge'));
        assert.deepEqual(exercise.target.imageAsset, addedWeek.words[0].imageAsset);
      }
    }
  }
  assert.equal(program.units.some((u) => u.display === 'ge'), false);
});

test('two-letter syllables remain active content, but direct automatic targets default off', () => {
  for (const id of ['syllable-la', 'syllable-ma', 'syllable-ne', 'syllable-mé', 'syllable-os']) {
    assert.equal(initialProgram.units.find((u) => u.id === id)?.enabled, true);
    const activity = automatic.find((a) => a.targetId === id);
    assert.ok(activity);
    assert.equal(activity.enabled, false);
  }
  const challenges = getCompleteWordChallenges(service(initialProgram)).challenges;
  assert.ok(!challenges.some((c) => c.targetType === 'syllable'));
  const lama = challenges.find((c) => c.id === 'word-lama:deux-emplacements');
  assert.ok(lama);
  assert.deepEqual(lama.slots.map((s) => s.expected), ['la', 'ma']);
  assert.ok(automatic.some((a) => a.targetId === 'word-lama' && a.enabled));
  assert.ok(automatic.some((a) => a.targetId === 'word-os' && a.enabled));
});

test('other syllable lengths remain enabled; NFC accented two-letter syllables default off', () => {
  const program = buildSeedProgram('test', [...seedBank, { ...addedWeek, syllables: ['a', 'mal', 'me\u0301'], words: [], sentences: [] }]);
  const variants = automaticActivities(program, 6);
  assert.equal(variants.find((a) => a.targetId === 'syllable-a')?.enabled, true);
  assert.equal(variants.find((a) => a.targetId === 'syllable-mal')?.enabled, true);
  assert.equal(variants.find((a) => a.targetId === 'syllable-me\u0301')?.enabled, false);
});

test('old Parent saves preserve overrides and custom LAVAGE literals above the seed', () => {
  const before = JSON.stringify(initialProgram);
  const id = 'generated:syllable-la:self:missing:0';
  const custom: Word = { id: 'parent-word-lavage', type: 'word', text: 'lavage', display: 'lavage', audioText: 'lavage',
    introducedInWeek: 5, enabled: true, tags: ['practice'], segmentations: addedWeek.words[0].segmentations! };
  for (const version of [1, 2]) {
    const stored = parseParentData(JSON.stringify({ ...emptyParentData(), version,
      customWords: [custom], customUnits: [custom], unitEnabled: { 'word-lune': false }, activityEnabled: { [id]: true },
      constructions: { 'sentence-il-a-lu': addedWeek.sentences[0].segmentations } }));
    assert.ok(stored);
    const program = effectiveProgram(initialProgram, stored);
    assert.equal(program.units.find((u) => u.id === 'word-lune')?.enabled, false);
    assert.deepEqual(program.units.find((u) => u.id === custom.id), { ...custom, completeWord: undefined });
    const challenges = getCompleteWordChallenges(service(program)).challenges;
    assert.ok(challenges.some((c) => c.id === id && c.targetType === 'syllable'));
    assert.ok(challenges.some((c) => c.wordId === 'sentence-il-a-lu' && c.targetType === 'sentence'));
    const lavage = challenges.filter((c) => c.wordId === custom.id);
    assert.equal(lavage.length, 3);
    assert.ok(lavage.every((c) => c.segments[2] === 'ge' && c.choices.every((a) => a.text !== 'ge')));
    const disabled = effectiveProgram(initialProgram, { ...stored, activityEnabled: { [id]: false } });
    assert.equal(automaticActivities(disabled, 5).find((a) => a.id === id)?.enabled, false);
  }
  assert.equal(JSON.stringify(initialProgram), before);
});
