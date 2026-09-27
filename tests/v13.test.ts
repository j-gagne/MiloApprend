import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProgram } from '../src/content/program.ts';
import { automaticActivities, activityCatalog, activitySignature } from '../src/content/activity-catalog.ts';
import { constructionText, displayConstruction, sentenceConstruction, unusedBlocks, moveBlock } from '../src/content/construction.ts';
import { validateSegmentation } from '../src/content/validation.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { activityToExercise } from '../src/game/completion-content.ts';
import { getCompleteWordChallenges } from '../src/game/complete-word-content.ts';
import { generateCompleteWordSession } from '../src/game/complete-word-session.ts';
import { emptyParentData, effectiveProgram } from '../src/parent/model.ts';
import { parseParentData } from '../src/services/parent-store.ts';
import { readingRate, READING_SPEEDS } from '../src/services/audio-settings.ts';
import { gameAudio } from '../src/services/audio.ts';
import type { LearningProgram, Word, Sentence, Segmentation, ExerciseScope } from '../src/content/model.ts';
import { seededRandom } from './helpers/random.ts';

const lila: Word = { id: 'parent-word-lila', type: 'word', display: 'LILA', text: 'LILA', audioText: 'lila', introducedInWeek: 5, enabled: true,
  tags: ['practice'], segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-li' }, { unitId: 'syllable-la' }] }] };
const lavage: Word = { ...lila, id: 'parent-word-lavage', display: 'LAVAGE', text: 'LAVAGE', audioText: 'lavage', segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-la' }, { unitId: 'syllable-va' }, { literal: 'ge', note: 'visible' }] }] };
const program = { ...initialProgram, units: [...initialProgram.units, lila, lavage] };
const service = (p: LearningProgram = program, scope?: ExerciseScope, week = 5) => createContentService(createContentRepository(p), week, scope);
const variants = (target: Word = lavage, p = program) => automaticActivities(p, 5).filter((a) => a.targetId === target.id);
const errors = (issues: ReturnType<typeof validateSegmentation>) => issues.filter((issue) => issue.severity === 'error');

for (const word of [lila, lavage]) test(`${word.display} : trois variantes standards, sans contenu inventé`, () => {
  const before = JSON.stringify(program);
  assert.deepEqual(variants(word).map((a) => a.missingSegmentIndexes), [[0], [1], [0, 1]]);
  assert.equal(JSON.stringify(program), before);
});
test('ge ne devient jamais slot ni réponse', () => {
  for (const a of variants()) {
    const exercise = activityToExercise(service({ ...program, activities: [a] }), a).exercise!;
    assert.ok(exercise); assert.ok(exercise.slots.every((s) => s.segmentIndex !== 2));
    assert.ok(exercise.choices.every((choice) => choice.text !== 'ge'));
  }
});
for (const blocks of [[], [{ literal: 'LILA', note: 'visible' }]]) test(`construction ${JSON.stringify(blocks)} sans variante manipulable`, () => {
  const word = { ...lila, segmentations: [{ id: 'main', segments: blocks }] };
  assert.equal(variants(word, { ...program, units: [word] }).length, 0);
});
test('Word sans construction reste sans exercice automatique', () => assert.equal(variants(lila, { ...program, units: [{ ...lila, segmentations: [] }] }).length, 0));
test('identité stable après sérialisation et changement de semaine', () => {
  assert.deepEqual(variants().map((a) => a.id), variants(lavage, JSON.parse(JSON.stringify(program))).map((a) => a.id));
  const p = { ...program, weeks: [...program.weeks, { number: 6, label: '6' }] };
  assert.deepEqual(variants().map((a) => a.id), automaticActivities(p, 6).filter((a) => a.targetId === lavage.id).map((a) => a.id));
});
test('activité explicite prioritaire sur équivalent automatique, même désactivée', () => {
  const explicit = { ...variants()[0], id: 'parent-activity-custom', enabled: false, distractorUnitIds: ['syllable-ma'] };
  const p = { ...program, activities: [explicit] };
  const same = activityCatalog(p, 5).filter((a) => activitySignature(p, a) === activitySignature(p, explicit));
  assert.deepEqual(same, [explicit]);
});
test('override automatique désactive sans persister activité ni supprimer construction', () => {
  const a = variants()[2];
  const data = parseParentData(JSON.stringify({ ...emptyParentData(), customUnits: [lavage], activityEnabled: { [a.id]: false } }))!;
  assert.equal(data.activities.length, 0);
  const p = effectiveProgram(initialProgram, data);
  assert.equal(activityCatalog(p, 5).find((item) => item.id === a.id)?.enabled, false);
  assert.ok(!getCompleteWordChallenges(service(p)).challenges.some((item) => item.id === a.id));
  assert.equal(variants(lavage, p).length, 3);
});
test('quatre blocs : cinq variantes et pas quinze', () => {
  const word: Word = { ...lila, display: 'lalalala', text: 'lalalala', segmentations: [{ id: 'four', segments: Array.from({ length: 4 }, () => ({ unitId: 'syllable-la' })) }] };
  assert.equal(variants(word, { ...program, units: [...initialProgram.units, word] }).length, 5);
});
test('nouvelle syllabe MA cible distincte, sans fausse Word', () => {
  const unit = { id: 'parent-syllable-MA', type: 'syllable' as const, display: 'MA', audioText: 'ma', introducedInWeek: 5, enabled: true, tags: ['practice'] };
  const p = effectiveProgram(initialProgram, { ...emptyParentData(), customUnits: [unit] });
  const challenge = getCompleteWordChallenges(service(p)).challenges.find((a) => a.wordId === unit.id)!;
  assert.equal(challenge.targetType, 'syllable'); assert.deepEqual(challenge.slots, [{ segmentIndex: 0, expected: 'MA' }]);
});

function phrase(text = 'Il a lu.', explicit = false): { target: Sentence; p: LearningProgram; construction: Segmentation } {
  const raw = { id: 'main', segments: [{ unitId: 'tool-word-Il' }, { unitId: 'letter-a' }, { unitId: 'syllable-lu' }, ...(explicit ? [{ literal: text.slice(-1), note: 'visible' }] : [])] };
  const construction = sentenceConstruction(program, text, raw);
  const target: Sentence = { id: 'parent-sentence-test', type: 'sentence', display: text, audioText: text, enabled: true, introducedInWeek: 5, tags: ['practice'], segmentations: [construction] };
  return { target, p: { ...program, units: [...program.units, target] }, construction };
}
for (const text of ['Il a lu.', 'Il a lu!', 'Il a lu?', 'Il a lu?!', 'Il a lu…', 'Il  a\u00a0lu !']) test(`ponctuation terminale facultative ${JSON.stringify(text)}`, () => {
  const { target, p, construction } = phrase(text);
  assert.deepEqual(errors(validateSegmentation(p, target, construction, 5)), []);
  assert.equal(displayConstruction(p, target, construction), text);
  const a = automaticActivities(p, 5).find((a) => a.targetId === target.id)!;
  const e = activityToExercise(service({ ...p, activities: [a] }), a).exercise!;
  assert.equal(e.segments.map((part, i) => (e.gaps?.[i] ?? '') + part).join('') + (e.gaps?.[e.segments.length] ?? ''), text);
  assert.equal(e.target.audioText, text);
});
test('ancienne construction avec point reste valide sans point double', () => {
  const { target, p, construction } = phrase('Il a lu.', true);
  assert.deepEqual(errors(validateSegmentation(p, target, construction, 5)), []);
  assert.equal(displayConstruction(p, target, construction), 'Il a lu.');
});
test('ponctuation interne omise refusée', () => {
  const { target, p, construction } = phrase('Il, a lu.');
  assert.ok(errors(validateSegmentation(p, target, construction, 5)).some((i) => i.code === 'segmentation-mismatch'));
});
test('mots manquants non compensés par ponctuation terminale', () => {
  const { target, p, construction } = phrase('Il a lu.');
  assert.ok(errors(validateSegmentation(p, target, { ...construction, segments: construction.segments.slice(0, 2), gaps: undefined, surface: undefined }, 5)).length);
});
test('construction stockée conserve uniquement les blocs choisis', () => {
  const { p, construction } = phrase(); assert.equal(construction.segments.length, 3); assert.equal(constructionText(p, construction), 'Il a lu');
});
const blocks = lila.segmentations[0].segments;
test('blocs déjà utilisés masqués', () => assert.ok(!unusedBlocks(program.units, blocks).some((unit) => unit.id === 'syllable-la')));
test('autres blocs conservés', () => assert.ok(unusedBlocks(program.units, blocks).some((unit) => unit.id === 'syllable-va')));
test('duplication explicite possible', () => assert.ok(unusedBlocks(program.units, blocks, undefined, true).some((unit) => unit.id === 'syllable-la')));
test('bloc en cours de modification reste sélectionnable', () => assert.ok(unusedBlocks(program.units, blocks, 1).some((unit) => unit.id === 'syllable-la')));
test('réordonnancement préservé', () => assert.deepEqual(moveBlock(blocks, 0, 1), [...blocks].reverse()));
test('literal ne masque aucune unité', () => assert.equal(unusedBlocks(program.units, [{ literal: 'la', note: 'visible' }]).length, program.units.length));

test('anciens réglages : révision complète', () => assert.equal(service().exerciseScope.mode, 'all'));
test('semaines sélectionnées ne filtrent que la cible', () => {
  const svc = service(program, { mode: 'selected-weeks', selectedWeeks: [5] });
  for (let seed = 1; seed <= 20; seed++) {
    const session = generateCompleteWordSession(svc, { random: seededRandom(seed) }).challenges;
    assert.equal(session.length, 5); assert.ok(session.every((c) => c.introducedInWeek === 5));
    assert.equal(new Set(session.map((c) => c.word)).size, 5);
  }
});
test('cible semaine 5 accepte réponse semaine 3', () => {
  assert.equal(program.units.find((u) => u.id === 'syllable-la')?.introducedInWeek, 3);
  const challenges = getCompleteWordChallenges(service(program, { mode: 'selected-weeks', selectedWeeks: [5] })).challenges;
  assert.ok(challenges.some((c) => c.wordId === lila.id && c.slots.some((slot) => slot.expected === 'la')));
});
test('éditeur et contenu antérieur indépendants du filtre', () => {
  const svc = service(program, { mode: 'selected-weeks', selectedWeeks: [5] });
  assert.ok(svc.getAvailableSyllables().some((u) => u.introducedInWeek === 3));
  assert.deepEqual(errors(validateSegmentation(svc.getProgram(), lila, lila.segmentations[0], 5)), []);
});
for (const selectedWeeks of [[], [6], [999]]) test(`semaines indisponibles ${selectedWeeks} : aucune cible future`, () => {
  assert.equal(generateCompleteWordSession(service(program, { mode: 'selected-weeks', selectedWeeks })).challenges.length, 0);
});
test('scope persistant et sauvegarde ancienne compatible', () => {
  const scope = { mode: 'selected-weeks', selectedWeeks: [5] };
  assert.deepEqual(parseParentData(JSON.stringify({ ...emptyParentData(), exerciseScope: scope }))?.exerciseScope, scope);
  assert.equal(parseParentData(JSON.stringify(emptyParentData()))?.exerciseScope, undefined);
});
test('RNG et ratio récent/révision conservés avec le pool automatique', () => {
  const a = generateCompleteWordSession(service(), { random: seededRandom(16) });
  assert.deepEqual(a, generateCompleteWordSession(service(), { random: seededRandom(16) }));
  assert.equal(a.challenges.filter((c) => c.introducedInWeek === 5).length, 3);
});

test('vitesse par défaut réelle V1.2 = 0.60', () => assert.equal(readingRate(), 0.60));
for (const speed of ['slow', 'normal', 'fast'] as const) test(`vitesse ${speed} persistante et appliquée au mot, phrase et replay`, async () => {
  const calls: { text: string; rate: number; pitch: number; volume: number }[] = [];
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldSpeech = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
  const win = { setTimeout: () => 1, clearTimeout: () => {}, speechSynthesis: { getVoices: () => [{ name: 'fr', lang: 'fr-CA' }], addEventListener: () => {},
    speak: (utterance: { text: string; rate: number; pitch: number; volume: number; onend: () => void }) => { calls.push(utterance); utterance.onend(); }, cancel: () => {} } };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: class { text: string; constructor(text: string) { this.text = text; } } });
  try {
    const loaded = parseParentData(JSON.stringify({ ...emptyParentData(), readingSpeed: speed }))!;
    assert.equal(loaded.readingSpeed, speed); gameAudio.setReadingSpeed(loaded.readingSpeed);
    for (const text of ['lune', 'Il a lu.', 'lune']) await gameAudio.playWord(text);
    assert.equal(calls.length, 3);
    assert.ok(calls.every((call) => call.rate === READING_SPEEDS[speed].rate && call.pitch === 1 && call.volume === 1));
  } finally {
    gameAudio.setReadingSpeed();
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (oldSpeech) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', oldSpeech); else Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
  }
});
for (const imageAsset of [undefined, { emoji: '🌙', label: 'Nuit' }, { src: '/image.svg', label: 'Illustration' }]) test(`Sentence média ${JSON.stringify(imageAsset)} : validation, persistence, fusion et adaptateur`, () => {
  const { target } = phrase();
  const custom = { ...target, imageAsset };
  const data = parseParentData(JSON.stringify({ ...emptyParentData(), customUnits: [custom] }))!;
  const p = effectiveProgram(initialProgram, data);
  assert.deepEqual(errors(validateSegmentation(p, custom, custom.segmentations![0], 5)), []);
  const a = automaticActivities(p, 5).find((a) => a.targetId === custom.id)!;
  assert.deepEqual(activityToExercise(service({ ...p, activities: [a] }), a).exercise?.target.imageAsset, imageAsset);
  const c = getCompleteWordChallenges(service(p)).challenges.find((c) => c.wordId === custom.id)!;
  if (imageAsset) assert.equal(c.image.label, imageAsset.label);
});
test('désactiver une référence empêche les automatiques qui en dépendent', () => {
  const p = { ...program, units: program.units.map((unit) => unit.id === 'syllable-la' ? { ...unit, enabled: false } : unit) };
  assert.equal(variants(lavage, p).length, 0);
  assert.ok(!getCompleteWordChallenges(service(p)).challenges.some((c) => c.wordId === lila.id));
});
