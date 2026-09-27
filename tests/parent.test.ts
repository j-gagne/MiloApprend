import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProgram } from '../src/content/program.ts';
import { activeWeek } from '../src/content/settings.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { createGate, checkGate } from '../src/parent/gate.ts';
import { effectiveProgram, effectiveWeek, emptyParentData, newParentId, removeCustomWord, saveActivity } from '../src/parent/model.ts';
import { parentActivities, withActivity } from '../src/parent/activities.ts';
import { createParentStore, PARENT_STORAGE_KEY, parseParentData } from '../src/services/parent-store.ts';
import { getCompleteWordChallenges } from '../src/game/complete-word-content.ts';
import { generateCompleteWordSession } from '../src/game/complete-word-session.ts';
import { activityToExercise } from '../src/game/completion-content.ts';
import { validateProgram } from '../src/content/validation.ts';
import { sentenceActivity } from './fixtures/sentence-activity.ts';
import type { CompletionActivity, LearningProgram, Word } from '../src/content/model.ts';
import type { ParentData } from '../src/parent/model.ts';
import { seededRandom } from './helpers/random.ts';

const serviceFor = (data = emptyParentData(), seed = initialProgram) => createContentService(
  createContentRepository(effectiveProgram(seed, data)), effectiveWeek(seed, data, activeWeek));
function memory() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const custom: Word = { id: 'parent-word-maman-test', type: 'word', text: 'maman', display: 'maman', audioText: 'maman',
  introducedInWeek: 5, enabled: true, tags: ['practice'], imageAsset: { emoji: '👩', label: 'Maman' }, segmentations: [] };
const customActivity: CompletionActivity = { id: 'parent-activity-maman-test', type: 'complete-segments', targetId: custom.id,
  segmentation: { id: 'explicit', segments: [{ unitId: 'syllable-ma' }, { unitId: 'syllable-ma' }, { unitId: 'letter-n' }] },
  missingSegmentIndexes: [0, 1], distractorUnitIds: ['syllable-li', 'syllable-mu'] };

test('gate : trois chiffres de 1 à 9, accepte uniquement la combinaison exacte', () => {
  for (let seed = 1; seed < 50; seed++) {
    const challenge = createGate(seededRandom(seed));
    assert.equal(challenge.digits.length, 3);
    assert.ok(challenge.digits.every((digit) => digit >= 1 && digit <= 9));
    assert.equal(checkGate(challenge, challenge.digits.join('')), true);
    for (const answer of ['000', '12', '1234', 'abc', `${challenge.digits.join('')} `]) assert.equal(checkGate(challenge, answer), false);
  }
  assert.notDeepEqual(createGate(seededRandom(1)), createGate(seededRandom(42)));
});

test('semaine, activations et exercices survivent à une nouvelle instance de stockage', () => {
  const storage = memory();
  const data: ParentData = { ...emptyParentData(), activeWeek: 4, unitEnabled: { 'word-lune': false },
    activityEnabled: { 'word-lama:initial': false } };
  assert.equal(createParentStore(() => storage).save(data), true);
  const loaded = createParentStore(() => storage).load();
  assert.deepEqual(loaded.data, data);
  assert.equal(serviceFor(loaded.data).activeWeek, 4);
  assert.equal(serviceFor(loaded.data).getProgram().units.find((unit) => unit.id === 'word-lune')?.enabled, false);
});

test('fusion seed + overrides sans mutation ; les nouvelles semaines du seed restent présentes', () => {
  const before = JSON.stringify(initialProgram);
  const data = saveActivity({ ...emptyParentData(), customUnits: [custom], unitEnabled: { 'word-lune': false } }, customActivity);
  const updatedSeed: LearningProgram = { ...initialProgram, weeks: [...initialProgram.weeks, { number: 6, label: 'Semaine 6' }] };
  const effective = effectiveProgram(updatedSeed, data);
  assert.ok(effective.weeks.some((week) => week.number === 6));
  assert.ok(effective.units.some((unit) => unit.id === custom.id));
  assert.equal(effective.activities?.length, 1);
  assert.equal(JSON.stringify(initialProgram), before);
  assert.equal(effectiveWeek(initialProgram, { ...data, activeWeek: 99 }, 5), 5);
});

test('les 22 variantes et LAMA multi restent valides dans le programme effectif initial', () => {
  const service = serviceFor();
  assert.equal(getCompleteWordChallenges(service).challenges.length, 22);
  assert.equal(getCompleteWordChallenges(service).challenges.find((challenge) => challenge.id === 'word-lama:deux-emplacements')?.slots.length, 2);
  assert.deepEqual(validateProgram(service.getProgram()).filter((issue) => issue.severity === 'error'), []);
});

test('une activité éditée remplace la variante historique sans doublon et persiste', () => {
  const storage = memory();
  const original = parentActivities(initialProgram).find((activity) => activity.id === 'word-lama:initial')!;
  const edited = { ...original, missingSegmentIndexes: [0, 1], distractorUnitIds: ['syllable-li', 'syllable-mu'] };
  const data = saveActivity(emptyParentData(), edited);
  createParentStore(() => storage).save(data);
  const service = serviceFor(createParentStore(() => storage).load().data);
  const challenges = getCompleteWordChallenges(service).challenges;
  assert.equal(challenges.length, 22);
  assert.equal(challenges.filter((challenge) => challenge.id === original.id).length, 1);
  assert.equal(challenges.find((challenge) => challenge.id === original.id)?.slots.length, 2);
  assert.equal(parentActivities(initialProgram).find((activity) => activity.id === original.id)?.missingSegmentIndexes?.length, 1);
});

test('mot, unité et exercice désactivés sont exclus des sélections', () => {
  const data = { ...emptyParentData(), unitEnabled: { 'word-lune': false, 'syllable-ni': false },
    activityEnabled: { 'word-lama:initial': false, 'word-lama:deux-emplacements': false } };
  for (let seed = 1; seed <= 30; seed++) {
    const session = generateCompleteWordSession(serviceFor(data), { random: seededRandom(seed) }).challenges;
    assert.equal(session.length, 5);
    assert.ok(session.every((challenge) => !['lune', 'lama', 'nid'].includes(challenge.word)));
    assert.ok(session.every((challenge) => challenge.choices.every((choice) => choice.text !== 'ni')));
  }
});

test('mot custom futur exclu, mots distincts même avec variantes modifiées', () => {
  const data = saveActivity({ ...emptyParentData(), activeWeek: 4, customUnits: [custom] }, customActivity);
  for (let seed = 1; seed < 30; seed++) {
    const session = generateCompleteWordSession(serviceFor(data), { random: seededRandom(seed) }).challenges;
    assert.equal(session.length, 5);
    assert.equal(new Set(session.map((challenge) => challenge.word)).size, 5);
    assert.ok(session.every((challenge) => challenge.introducedInWeek <= 4));
  }
  assert.ok(getCompleteWordChallenges(serviceFor({ ...data, activeWeek: 5 })).challenges.some((challenge) => challenge.word === 'maman'));
});

test('IDs parent uniques, stables après sauvegarde, indépendants des textes', () => {
  const ids = Array.from({ length: 50 }, () => newParentId('word'));
  assert.equal(new Set(ids).size, 50);
  const storage = memory();
  const data = saveActivity({ ...emptyParentData(), customUnits: [{ ...custom, id: ids[0] }] }, { ...customActivity, targetId: ids[0] });
  createParentStore(() => storage).save(data);
  const loaded = createParentStore(() => storage).load().data;
  assert.equal(loaded.customUnits[0].id, ids[0]);
  assert.equal(loaded.activities[0].targetId, ids[0]);
});

test('reset restaure le seed et ne touche pas la clé de progression', () => {
  const storage = memory();
  storage.setItem('milo-apprend.progress.v1', '{"completedSessions":7}');
  const store = createParentStore(() => storage);
  store.save({ ...emptyParentData(), customUnits: [custom], activeWeek: 3 });
  store.save(emptyParentData());
  assert.deepEqual(serviceFor(store.load().data).getAvailableWords(), serviceFor().getAvailableWords());
  assert.equal(getCompleteWordChallenges(serviceFor(store.load().data)).challenges.length, 22);
  assert.equal(store.load().data.activeWeek, undefined);
  assert.equal(storage.getItem('milo-apprend.progress.v1'), '{"completedSessions":7}');
});

test('suppression limitée aux mots parent et leurs activités, jamais au seed practice ou school', () => {
  const data = saveActivity({ ...emptyParentData(), customUnits: [custom] }, customActivity);
  assert.equal(removeCustomWord(data, 'word-lama'), data);
  assert.equal(removeCustomWord(data, 'practice-menu'), data);
  const removed = removeCustomWord(data, custom.id);
  assert.equal(removed.customUnits.length, 0);
  assert.equal(removed.activities.length, 0);
});

test('même catalogue Parent pour les activités Word et Sentence, toutes admissibles au jeu', () => {
  const data = saveActivity(emptyParentData(), sentenceActivity);
  const service = serviceFor(data);
  assert.equal(parentActivities(service.getProgram()).length, 23);
  const exercise = activityToExercise(service, sentenceActivity).exercise;
  assert.equal(exercise?.target.type, 'sentence');
  assert.equal(getCompleteWordChallenges(service).challenges.length, 23);
  assert.deepEqual(validateProgram(withActivity(initialProgram, sentenceActivity)).filter((issue) => issue.severity === 'error'), []);
});

test('stockage bloqué, JSON corrompu ou ancien format : repli explicite sans plantage', () => {
  const blocked = createParentStore(() => { throw new Error('Bloqué'); });
  assert.ok(blocked.load().warning);
  assert.equal(blocked.save(emptyParentData()), false);
  const storage = memory();
  for (const raw of ['{', '{"version":2}', JSON.stringify({ ...emptyParentData(), customUnits: [null] }),
    JSON.stringify({ ...emptyParentData(), activities: [{ ...customActivity, segmentation: null }] })]) {
    storage.setItem(PARENT_STORAGE_KEY, raw);
    assert.ok(createParentStore(() => storage).load().warning);
    assert.equal(getCompleteWordChallenges(serviceFor(createParentStore(() => storage).load().data)).challenges.length, 22);
  }
  assert.ok(parseParentData(JSON.stringify(emptyParentData())));
});
