import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProgram } from '../src/content/program.ts';
import { activeWeek } from '../src/content/settings.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { validateProgram } from '../src/content/validation.ts';
import { getCompleteWordChallenges, wordToChallenge } from '../src/game/complete-word-content.ts';
import { createCompleteWordSession } from '../src/game/complete-word-session.ts';
import type { LearningProgram, LearningUnit, Word } from '../src/content/model.ts';

const service = createContentService(createContentRepository(initialProgram));
const word = (id: string) => {
  const unit = initialProgram.units.find((item) => item.id === id);
  assert.ok(unit?.type === 'word');
  return unit;
};
const withUnit = (unit: LearningUnit): LearningProgram => ({ ...initialProgram,
  units: initialProgram.units.map((item) => item.id === unit.id ? unit : item),
});
const serviceFor = (program: LearningProgram) => createContentService(createContentRepository(program));

test('semaine 2 limitée aux lettres fournies ; aucune génération de syllabes', () => {
  assert.equal(activeWeek, 5);
  assert.deepEqual(service.getAvailableLetters(2).map((unit) => unit.display), ['i', 'o', 'u', 'a']);
  assert.equal(service.getAvailableSyllables(2).length, 0);
  assert.equal(service.getAvailableWords(2).length, 0);
  assert.equal(service.getAvailableSentences(2).length, 0);
  assert.equal(service.getAvailableLetters(6).length, 0);
  const invalid = createContentService(createContentRepository(initialProgram), 6);
  assert.ok(invalid.validate().some((item) => item.code === 'invalid-week' && item.path === 'activeWeek'));
  assert.ok(getCompleteWordChallenges(invalid).issues.some((item) => item.code === 'invalid-week'));
});

test('semaine 5 cumulative, sans duplications des révisions ni correction scolaire', () => {
  assert.equal(initialProgram.units.length, 83);
  assert.equal(service.getAvailableLetters().length, 11);
  assert.equal(service.getAvailableSyllables().length, 44);
  assert.equal(service.getAvailableWords().length, 21);
  assert.deepEqual(service.getAvailableToolWords().map((unit) => unit.display), ['à', 'il', 'Il']);
  assert.deepEqual(service.getAvailableSentences().map((unit) => unit.display), ['Il a lu.', 'Il a mal.', 'Il a vu le lila.', 'Il a volé le nid.']);
  for (const unit of service.getAvailableSyllables(3)) assert.ok(service.getAvailableSyllables(5).some((item) => item.id === unit.id));
  assert.equal(initialProgram.units.filter((unit) => unit.id === 'syllable-vo').length, 1);
  assert.equal(service.getAvailableSyllables().find((unit) => unit.display === 'vo')?.introducedInWeek, 4);
  assert.equal(service.getAvailableWords().find((unit) => unit.text === 'ami')?.introducedInWeek, 3);
  assert.ok(service.getAvailableWords().some((unit) => unit.text === 'âne'));
  assert.equal(service.getAvailableLetters().some((unit) => ['d', 't', 'â'].includes(unit.display)), false);
  assert.equal(service.getAvailableSyllables().some((unit) => unit.display === 'vé'), false);
  assert.ok(service.getAvailableSyllables().some((unit) => unit.display === 'no'));
});

test('les syllabes inversées restent explicites et autorisées à leur semaine', () => {
  const fourth = service.getAvailableSyllables(4).map((unit) => unit.display);
  for (const display of ['os', 'iv', 'av', 'us', 'el', 'ol', 'is', 'uv', 'as', 'ev']) assert.ok(fourth.includes(display));
  for (const display of ['év', 'um', 'él', 'im', 'ul', 'ém']) {
    assert.equal(fourth.includes(display), false);
    assert.ok(service.getAvailableSyllables(5).some((unit) => unit.display === display));
  }
  const os: Word = { ...word('word-os'), segmentations: [{ id: 'explicit', segments: [{ unitId: 'syllable-os' }] }],
    completeWord: [{ id: 'explicit', segmentationId: 'explicit', missingSegmentIndex: 0, distractorUnitIds: ['syllable-iv'] }] };
  const result = wordToChallenge(serviceFor(withUnit(os)), os, os.completeWord![0]);
  assert.deepEqual(result.challenge?.segments, ['os']);
  assert.deepEqual(result.challenge?.choices.map((choice) => choice.text), ['os', 'iv']);
});

test('contenu initial sans erreur ; les mots non confirmés restent disponibles', () => {
  const issues = validateProgram(initialProgram);
  assert.deepEqual(issues.filter((item) => item.severity === 'error'), []);
  assert.ok(issues.some((item) => item.code === 'unconfirmed-word' && item.path === 'word-animal'));
  assert.ok(issues.some((item) => item.code === 'unconfirmed-segment' && item.path.startsWith('word-âne')));
  assert.ok(issues.some((item) => item.code === 'unconfirmed-segment' && item.path.startsWith('word-nid')));
  assert.ok(service.getAvailableWords().some((unit) => unit.text === 'animal'));
  assert.equal(getCompleteWordChallenges().challenges.some((challenge) => challenge.word === 'animal'), false);
});

test('identifiant dupliqué, semaine invalide et référence inconnue sont signalés', () => {
  assert.ok(validateProgram({ ...initialProgram, units: [...initialProgram.units, initialProgram.units[0]] }).some((item) => item.code === 'duplicate-id'));
  assert.ok(validateProgram({ ...initialProgram, weeks: [...initialProgram.weeks, { number: -1, label: 'Invalide' }] }).some((item) => item.code === 'invalid-week'));
  assert.ok(validateProgram(withUnit({ ...word('word-lune'), introducedInWeek: 6 })).some((item) => item.code === 'invalid-week'));
  const lune = word('word-lune');
  const unknown: Word = { ...lune, segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-inconnue' }, { unitId: 'syllable-ne' }] }] };
  const changed = withUnit(unknown);
  assert.ok(validateProgram(changed).some((item) => item.code === 'unknown-reference' && item.message.includes('syllable-inconnue')));
  assert.equal(getCompleteWordChallenges(serviceFor(changed)).challenges.some((item) => item.word === 'lune'), false);
});

test('mot désactivé exclu, désactivation des unités respectée par les distracteurs et segments', () => {
  const disabledWord = withUnit({ ...word('word-lune'), enabled: false });
  assert.ok(validateProgram(disabledWord).some((item) => item.code === 'disabled-word'));
  assert.equal(serviceFor(disabledWord).getAvailableWords().some((item) => item.id === 'word-lune'), false);
  assert.equal(getCompleteWordChallenges(serviceFor(disabledWord)).challenges.some((item) => item.word === 'lune'), false);
  const ne = initialProgram.units.find((unit) => unit.id === 'syllable-ne')!;
  const disabledSyllable = serviceFor(withUnit({ ...ne, enabled: false }));
  assert.equal(disabledSyllable.getAvailableSyllables().some((item) => item.display === 'ne'), false);
  const { challenges, issues } = getCompleteWordChallenges(disabledSyllable);
  assert.equal(challenges.some((item) => ['lune', 'nid'].includes(item.word)), false);
  assert.ok(issues.some((item) => item.code === 'disabled-reference'));
});

test('aucun mot, segment ou distracteur futur proposé avant sa semaine', () => {
  assert.equal(getCompleteWordChallenges(service, 2).challenges.length, 0);
  assert.deepEqual(getCompleteWordChallenges(service, 3).challenges.map((item) => item.word), ['lama', 'ami', 'lama']);
  const lama = word('word-lama');
  const bad: Word = { ...lama, completeWord: [{ ...lama.completeWord![0], distractorUnitIds: ['syllable-na'] }] };
  const changedService = serviceFor(withUnit(bad));
  assert.ok(changedService.validate().some((item) => item.code === 'future-reference'));
  assert.equal(getCompleteWordChallenges(changedService, 3).challenges.some((item) => item.word === 'lama'), false);
  for (const challenge of getCompleteWordChallenges(service, 4).challenges) {
    const allowed = [...service.getAvailableLetters(4), ...service.getAvailableSyllables(4)].map((unit) => unit.display);
    assert.ok(challenge.choices.every((choice) => allowed.includes(choice.text)));
  }
});

test('segments non confirmés conservés à l’écran mais jamais autorisés comme réponses', () => {
  const velo = word('word-vélo');
  const invalid: Word = { ...velo, completeWord: [{ ...velo.completeWord![0], missingSegmentIndex: 0 }] };
  assert.ok(validateProgram(withUnit(invalid)).some((item) => item.code === 'unconfirmed-answer'));
  assert.equal(getCompleteWordChallenges(serviceFor(withUnit(invalid))).challenges.some((item) => item.word === 'vélo'), false);
  assert.deepEqual(getCompleteWordChallenges().challenges.find((item) => item.word === 'vélo')?.segments, ['vé', 'lo']);
});

test('plusieurs variantes et segmentations explicites ; disponibilité indépendante', () => {
  const ami = word('word-ami');
  const alternate: Word = { ...ami,
    segmentations: [...ami.segmentations, { id: 'entier', availableFromWeek: 5, segments: [{ unitId: 'word-ami' }] }],
    completeWord: [...ami.completeWord!, { id: 'entier', segmentationId: 'entier', missingSegmentIndex: 0,
      distractorUnitIds: ['word-lama'], availableFromWeek: 5 }],
  };
  const changed = serviceFor(withUnit(alternate));
  assert.equal(getCompleteWordChallenges(changed, 3).challenges.filter((item) => item.word === 'ami').length, 1);
  assert.equal(getCompleteWordChallenges(changed, 5).challenges.filter((item) => item.word === 'ami').length, 2);
  assert.equal(validateProgram(withUnit(alternate)).some((item) => item.severity === 'error'), false);
});

test('assets absents et texte audio distinct du texte affiché', () => {
  const lune: Word = { ...word('word-lune'), imageAsset: null, audioAsset: null, audioText: 'LUNE' };
  const converted = wordToChallenge(serviceFor(withUnit(lune)), lune, lune.completeWord![0]).challenge;
  assert.ok(converted);
  assert.equal(converted.word, 'lune');
  assert.equal(converted.audioText, 'LUNE');
  assert.equal(converted.audioSrc, undefined);
  assert.equal(converted.image.emoji, '🖼️');
});

test('la série actuelle garde les cinq mots, positions et choix déjà validés', () => {
  const session = createCompleteWordSession(undefined, { random: () => 0.999 });
  assert.deepEqual(session.map((item) => item.word), ['lune', 'lama', 'ami', 'vélo', 'nid']);
  assert.deepEqual(session.map((item) => item.missingIndex), [1, 0, 0, 1, 0]);
  assert.deepEqual(session.map((item) => item.choices.map((choice) => choice.text)), [
    ['na', 'ne', 'ni'], ['la', 'li', 'lu'], ['o', 'i', 'a'], ['lu', 'lo', 'la'], ['ni', 'na', 'ne'],
  ]);
  assert.equal(createCompleteWordSession(createContentService(createContentRepository(initialProgram), 2)).length, 0);
  const week3 = createCompleteWordSession(createContentService(createContentRepository(initialProgram), 3));
  assert.equal(week3.length, 2);
  assert.ok(week3.every((item) => ['lama', 'ami'].includes(item.word)));
});
