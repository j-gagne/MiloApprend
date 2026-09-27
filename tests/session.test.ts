import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProgram } from '../src/content/program.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { validateProgram, validateCompleteWordVariant } from '../src/content/validation.ts';
import { generateCompleteWordSession } from '../src/game/complete-word-session.ts';
import { getCompleteWordChallenges } from '../src/game/complete-word-content.ts';
import type { LearningProgram, Word } from '../src/content/model.ts';
import { missingIndexes } from '../src/content/model.ts';
import { seededRandom } from './helpers/random.ts';

const serviceFor = (program = initialProgram, week = 5) => createContentService(createContentRepository(program), week);
const service = serviceFor();
const schoolWords = ['ami', 'lama', 'lime', 'sale', 'vis', 'vélo', 'os', 'nid', 'lune', 'lit', 'âne', 'animal'];

test('21 mots, les 12 mots scolaires préservés, 20 mots jouables et 22 variantes admissibles', () => {
  const words = service.getAvailableWords();
  assert.equal(words.length, 21);
  assert.deepEqual(words.filter((word) => word.tags?.includes('school')).map((word) => word.text).sort(), [...schoolWords].sort());
  assert.equal(words.filter((word) => word.tags?.includes('practice')).length, 9);
  const { challenges } = getCompleteWordChallenges(service);
  assert.equal(challenges.length, 22);
  assert.equal(new Set(challenges.map((item) => item.word)).size, 20);
  assert.ok(challenges.every((item) => item.source !== 'unspecified'));
  assert.ok(words.find((word) => word.text === 'animal'));
});

test('toutes les variantes ont segmentation, index et références valides à leur introduction', () => {
  assert.deepEqual(validateProgram(initialProgram).filter((item) => item.severity === 'error'), []);
  for (const word of service.getAvailableWords()) {
    for (const variant of word.completeWord ?? []) {
      const segmentation = word.segmentations.find((item) => item.id === variant.segmentationId);
      assert.ok(segmentation);
      assert.deepEqual(validateCompleteWordVariant(initialProgram, word, variant, word.introducedInWeek).filter((item) => item.severity === 'error'), []);
      for (const index of missingIndexes(variant)) {
        const missing = segmentation.segments[index];
        assert.ok(missing && 'unitId' in missing);
        assert.equal(variant.distractorUnitIds.includes(missing.unitId), false);
      }
      for (const id of [...variant.distractorUnitIds, ...segmentation.segments.flatMap((segment) => 'unitId' in segment ? [segment.unitId] : [])]) {
        const unit = initialProgram.units.find((item) => item.id === id);
        assert.ok(unit?.enabled);
        assert.ok(unit.introducedInWeek <= word.introducedInWeek);
      }
      if (word.tags?.includes('practice')) assert.ok(segmentation.segments.every((segment) => 'unitId' in segment));
    }
  }
});

test('cinq mots distincts, trois récents et deux révisions sur de nombreuses seeds', () => {
  const catalogue = getCompleteWordChallenges(service).challenges;
  const seen = new Set<string>();
  for (let seed = 1; seed <= 100; seed++) {
    const { challenges } = generateCompleteWordSession(service, { random: seededRandom(seed * 104729) });
    assert.equal(challenges.length, 5);
    assert.equal(new Set(challenges.map((item) => item.word)).size, 5);
    assert.equal(challenges.filter((item) => item.introducedInWeek === 5).length, 3);
    assert.equal(challenges.filter((item) => item.introducedInWeek < 5).length, 2);
    for (const challenge of challenges) {
      assert.deepEqual(challenge, catalogue.find((item) => item.id === challenge.id));
      seen.add(challenge.word);
    }
  }
  assert.equal(seen.size, 20);
});

test('la RNG est déterministe ; deux seeds peuvent changer la sélection et son ordre', () => {
  const first = generateCompleteWordSession(service, { random: seededRandom(1) });
  assert.deepEqual(first, generateCompleteWordSession(service, { random: seededRandom(1) }));
  const second = generateCompleteWordSession(service, { random: seededRandom(42) });
  assert.notDeepEqual(first.challenges.map((item) => item.word), second.challenges.map((item) => item.word));
  assert.notDeepEqual(first.challenges.map((item) => item.word).sort(), second.challenges.map((item) => item.word).sort());
});

test('semaine 4 ne propose jamais un mot ou une unité de semaine 5', () => {
  const fourth = serviceFor(initialProgram, 4);
  const allowed = [...fourth.getAvailableLetters(), ...fourth.getAvailableSyllables()].map((unit) => unit.display);
  for (let seed = 1; seed <= 25; seed++) {
    const session = generateCompleteWordSession(fourth, { random: seededRandom(seed) }).challenges;
    assert.equal(session.length, 5);
    assert.ok(session.every((item) => item.introducedInWeek <= 4));
    assert.ok(session.every((item) => item.choices.every((choice) => allowed.includes(choice.text))));
  }
});

test('mots futurs, variantes futures, désactivées et invalides exclus', () => {
  const program: LearningProgram = { ...initialProgram,
    weeks: [...initialProgram.weeks, { number: 6, label: 'Semaine 6 (test)' }],
    units: initialProgram.units.map((unit) => {
      if (unit.type !== 'word') return unit;
      if (unit.text === 'lune') return { ...unit, introducedInWeek: 6 };
      if (unit.text === 'lama') return { ...unit, completeWord: unit.completeWord!.map((variant) => ({ ...variant, enabled: false })) };
      if (unit.text === 'ami') return { ...unit, completeWord: unit.completeWord!.map((variant) => ({ ...variant, availableFromWeek: 6 })) };
      if (unit.text === 'vélo') return { ...unit, completeWord: unit.completeWord!.map((variant) => ({ ...variant, missingSegmentIndex: 99 })) };
      return unit;
    }),
  };
  for (let seed = 1; seed <= 20; seed++) {
    const result = generateCompleteWordSession(serviceFor(program), { random: seededRandom(seed) });
    assert.equal(result.challenges.length, 5);
    assert.ok(result.challenges.every((item) => !['lune', 'lama', 'ami', 'vélo'].includes(item.word)));
  }
});

test('fallback sans répétition : deux mots en S3, aucun en S2', () => {
  for (const [week, count] of [[3, 2], [2, 0]]) {
    const result = generateCompleteWordSession(serviceFor(initialProgram, week), { random: seededRandom(1) });
    assert.equal(result.challenges.length, count);
    assert.equal(new Set(result.challenges.map((item) => item.word)).size, count);
    assert.ok(result.issues.some((issue) => issue.code === 'insufficient-words'));
  }
});

test('plusieurs variantes du même mot ne remplissent jamais artificiellement la session', () => {
  const onlySavane: LearningProgram = { ...initialProgram, units: initialProgram.units.map((unit) =>
    unit.type === 'word' && unit.text !== 'savane' ? { ...unit, enabled: false } : unit) };
  const result = generateCompleteWordSession(serviceFor(onlySavane), { random: seededRandom(1) });
  assert.equal(result.challenges.length, 1);
  assert.equal(result.challenges[0].word, 'savane');
});

test('pas assez de mots récents : compléter avec des mots de révision distincts', () => {
  const program: LearningProgram = { ...initialProgram, units: initialProgram.units.map((unit) =>
    unit.type === 'word' && unit.introducedInWeek === 5 && unit.text !== 'lune' ? { ...unit, enabled: false } : unit) };
  const session = generateCompleteWordSession(serviceFor(program), { random: seededRandom(5) }).challenges;
  assert.equal(session.length, 5);
  assert.equal(new Set(session.map((item) => item.word)).size, 5);
  assert.equal(session.filter((item) => item.introducedInWeek === 5).length, 1);
});

test('sans contenu introduit dans la semaine active, favoriser la plus récente disponible', () => {
  const program: LearningProgram = { ...initialProgram, weeks: [...initialProgram.weeks, { number: 6, label: 'S6 test' }] };
  const session = generateCompleteWordSession(serviceFor(program, 6), { random: seededRandom(5) }).challenges;
  assert.equal(session.filter((item) => item.introducedInWeek === 5).length, 3);
  assert.equal(session.some((item) => item.introducedInWeek === 6), false);
});

test('la semaine du mot reste son introduction même si une variante arrive plus tard', () => {
  const ami = initialProgram.units.find((item): item is Word => item.type === 'word' && item.text === 'ami')!;
  const changed: Word = { ...ami, completeWord: [{ ...ami.completeWord![0], availableFromWeek: 5 }] };
  const program = { ...initialProgram, units: initialProgram.units.map((unit) => unit.id === ami.id ? changed : unit) };
  assert.equal(getCompleteWordChallenges(serviceFor(program)).challenges.find((item) => item.word === 'ami')?.introducedInWeek, 3);
});

test('le ratio est configurable et la génération ne modifie jamais le catalogue', () => {
  const before = JSON.stringify(initialProgram);
  const session = generateCompleteWordSession(service, { random: seededRandom(2), strategy: { size: 5, recentCount: 1 } }).challenges;
  assert.equal(session.filter((item) => item.introducedInWeek === 5).length, 1);
  assert.equal(JSON.stringify(initialProgram), before);
});
