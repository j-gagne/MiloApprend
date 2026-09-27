import assert from 'node:assert/strict';
import test from 'node:test';
import type { Word, Sentence, Segmentation, CompletionActivity, LearningProgram } from '../src/content/model.ts';
import { initialProgram } from '../src/content/program.ts';
import { constructionText, sentenceConstruction, moveBlock, primaryConstruction, recoverPartialConstruction, replacePrimary } from '../src/content/construction.ts';
import { validateSegmentation, validateCompletionActivity, validateProgram } from '../src/content/validation.ts';
import { validateParentUnit } from '../src/parent/content.ts';
import { emptyParentData, effectiveProgram, saveParentUnit } from '../src/parent/model.ts';
import { parseParentData } from '../src/services/parent-store.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { activityToExercise } from '../src/game/completion-content.ts';
import { generateCompleteWordSession } from '../src/game/complete-word-session.ts';
import { placeAnswer } from '../src/game/complete-word.ts';
import { seededRandom } from './helpers/random.ts';

const base = { enabled: true, introducedInWeek: 5, tags: ['parent', 'practice'], audioText: 'lavage' };
const blocks: Segmentation = { id: 'construction', segments: [{ unitId: 'syllable-la' }, { unitId: 'syllable-va' }, { literal: 'ge', note: 'Texte visible' }] };
const word: Word = { ...base, id: 'parent-word-lavage', type: 'word', text: 'LAVAGE', display: 'LAVAGE', segmentations: [blocks] };
const sentence: Sentence = { ...base, id: 'parent-sentence-lu', type: 'sentence', display: 'Il a lu.', audioText: 'Il a lu.' };
const phrase = sentenceConstruction(initialProgram, sentence.display, { id: 'phrase', segments: [{ unitId: 'tool-word-Il' }, { unitId: 'letter-a' }, { unitId: 'syllable-lu' }, { literal: '.', note: 'Ponctuation' }] });
const target: Sentence = { ...sentence, segmentations: [phrase] };
const activity: CompletionActivity = { id: 'parent-activity-phrase', type: 'complete-segments', targetId: target.id, segmentationId: phrase.id, missingSegmentIndexes: [1, 2], distractorUnitIds: ['syllable-ma', 'syllable-li'] };
const program: LearningProgram = { ...initialProgram, units: [...initialProgram.units, word, target], activities: [activity] };
const errors = (issues: ReturnType<typeof validateParentUnit>) => issues.filter((issue) => issue.severity === 'error');
const service = (p = program, week = 5) => createContentService(createContentRepository(p), week);
const mismatch = (value: Segmentation) => validateSegmentation(program, word, value, 5).filter((issue) => issue.code === 'segmentation-mismatch');

test('Word sans construction : contenu valide et persistant', () => {
  const empty = { ...word, segmentations: [] }; assert.deepEqual(errors(validateParentUnit(program, empty)), []);
  const saved = parseParentData(JSON.stringify({ ...emptyParentData(), customUnits: [empty] }))!;
  assert.deepEqual(saved.customUnits[0], empty); assert.equal(primaryConstruction(empty), undefined);
});
test('Sentence sans construction : contenu valide et persistant', () => {
  assert.deepEqual(errors(validateParentUnit(initialProgram, { ...sentence, display: 'Milo a vu la lune.' })), []);
  assert.deepEqual(parseParentData(JSON.stringify({ ...emptyParentData(), customUnits: [sentence] }))!.customUnits, [sentence]);
});
test('LAVAGE une construction trois blocs référencés ou visibles', () => {
  assert.equal(word.segmentations.length, 1); assert.equal(primaryConstruction(word)?.segments.length, 3);
  assert.equal(constructionText(program, blocks), 'lavage'); assert.equal(mismatch(blocks).length, 0);
});
for (const [i, text] of ['la', 'va', 'ge'].entries()) test(`${text} seul : une erreur pour la construction complète`, () => {
  assert.equal(mismatch({ ...blocks, segments: [blocks.segments[i]] }).length, 1);
});
test('ajouter le bloc pédagogique VA puis le texte visible ge complète LAVAGE', () => {
  const first = { ...blocks, segments: [blocks.segments[0]] };
  const second = { ...first, segments: [...first.segments, blocks.segments[1]] };
  assert.equal(constructionText(program, second), 'lava'); assert.equal(mismatch(second).length, 1);
  assert.equal(mismatch({ ...second, segments: [...second.segments, blocks.segments[2]] }).length, 0);
});
test('retirer VA rend la construction incomplète', () => assert.equal(mismatch({ ...blocks, segments: blocks.segments.filter((_, i) => i !== 1) }).length, 1));
test('modifier ge en ga est refusé puis réparer redevient valide', () => {
  const wrong = { ...blocks, segments: [...blocks.segments.slice(0, 2), { literal: 'ga', note: 'Visible' }] };
  assert.equal(mismatch(wrong).length, 1); assert.equal(mismatch(blocks).length, 0);
});
test('réordonner VA avant LA puis revenir, sans muter les blocs', () => {
  const moved = moveBlock(blocks.segments, 1, 0); assert.equal(mismatch({ ...blocks, segments: moved }).length, 1);
  assert.equal(mismatch({ ...blocks, segments: moveBlock(moved, 0, 1) }).length, 0); assert.equal(constructionText(program, blocks), 'lavage');
});
test('ge visible ne crée aucune unité et ne peut être réponse ni distracteur', () => {
  const before = program.units.length;
  for (const patch of [{ missingSegmentIndexes: [2] }, { missingSegmentIndexes: [0], distractorUnitIds: ['ge'] }]) {
    const value = { ...activity, targetId: word.id, segmentationId: blocks.id, ...patch };
    assert.ok(errors(validateCompletionActivity({ ...program, activities: [value] }, value, 5)).length);
  }
  assert.equal(program.units.length, before);
});
test('LILA reste LI + LA malgré la casse', () => {
  const lila = { ...word, text: 'LILA', display: 'LILA', segmentations: [{ id: 'lila', segments: [{ unitId: 'syllable-li' }, { unitId: 'syllable-la' }] }] };
  assert.deepEqual(errors(validateParentUnit(initialProgram, lila)), []);
});
test('plusieurs activités référencent une seule construction', () => {
  const p = { ...program, activities: [activity, { ...activity, id: 'second', missingSegmentIndexes: [2] }] };
  for (const value of p.activities) assert.ok(activityToExercise(service(p), value).exercise);
  assert.equal(target.segmentations?.length, 1);
});
test('Sentence possède une construction et garde son type', () => {
  assert.equal(primaryConstruction(target)?.id, 'phrase'); assert.equal(activityToExercise(service(), activity).exercise?.target.type, 'sentence');
});
test('Il a lu. reconstruit exactement, espaces et point séparés des réponses', () => {
  assert.equal(constructionText(program, phrase), 'Il a lu.'); assert.deepEqual(phrase.gaps, ['', ' ', ' ', '', '']);
  assert.deepEqual(errors(validateSegmentation(program, target, phrase, 5)), []);
});
for (const text of ["Il a lu.", "Il  a\u00a0lu.", "il a lu.", "Il a lu !", "Il a lu?", "Il a lu…"]) test(`espaces et casse exacts : ${JSON.stringify(text)}`, () => {
  const punctuation = text.endsWith('…') ? '…' : text.slice(-1);
  const value = sentenceConstruction(program, text, { ...phrase, segments: [...phrase.segments.slice(0, 3), { literal: punctuation, note: 'Visible' }] });
  assert.equal(constructionText(program, value), text);
  assert.deepEqual(errors(validateSegmentation(program, { ...target, display: text }, value, 5)), []);
});
test('apostrophe, accents combinés et ponctuation sans unité inventée', () => {
  const text = "L’a\u0302ne, il a lu.";
  const value = sentenceConstruction(program, text, { id: 'apostrophe', segments: [
    { literal: 'L', note: 'Visible' }, { literal: '’', note: 'Visible' }, { literal: 'âne', note: 'Visible' }, { literal: ',', note: 'Visible' },
    { unitId: 'tool-word-il' }, { unitId: 'letter-a' }, { unitId: 'syllable-lu' }, { literal: '.', note: 'Visible' },
  ] });
  assert.equal(constructionText(program, value), text); assert.deepEqual(errors(validateSegmentation(program, { ...target, display: text }, value, 5)), []);
});
test('phrase incomplète : aucune ponctuation inventée', () => {
  const value = sentenceConstruction(program, target.display, { ...phrase, segments: phrase.segments.slice(0, 3) });
  assert.equal(constructionText(program, value), 'Il a lu');
  assert.equal(errors(validateSegmentation(program, target, value, 5)).filter((issue) => issue.code === 'segmentation-mismatch').length, 1);
});
test('espaces modifiés ou graphie falsifiée refusés', () => {
  assert.ok(errors(validateSegmentation(program, target, { ...phrase, gaps: ['', '', '', '', ''] }, 5)).length);
  assert.ok(errors(validateSegmentation(program, target, { ...phrase, surface: ['Il', 'a', 'vu', '.'] }, 5)).some((issue) => issue.code === 'invalid-surface'));
});
test('Word et Sentence ciblables, phrase multi attend toutes les réponses', () => {
  const exercise = activityToExercise(service(), activity).exercise!;
  const partial = placeAnswer(exercise, {}, 2, 'lu'); assert.equal(partial.complete, false);
  assert.equal(placeAnswer(exercise, partial.placements, 1, 'a').complete, true);
  const wordActivity = { ...activity, targetId: word.id, segmentationId: blocks.id, missingSegmentIndexes: [0, 1] };
  assert.ok(activityToExercise(service({ ...program, activities: [wordActivity] }), wordActivity).exercise);
});
test('ponctuation Sentence visible non manipulable', () => {
  const value = { ...activity, missingSegmentIndexes: [3] };
  assert.ok(errors(validateCompletionActivity({ ...program, activities: [value] }, value, 5)).some((issue) => issue.code === 'unconfirmed-answer'));
});
for (const value of [word, target]) test(`${value.type} sans construction ne produit pas d’activité`, () => {
  const candidate = { ...activity, targetId: value.id, segmentationId: value.segmentations![0].id };
  const p = { ...program, units: program.units.map((unit) => unit.id === value.id ? { ...value, segmentations: [] } : unit), activities: [candidate] };
  assert.equal(activityToExercise(service(p), candidate).exercise, undefined);
});
test('sessions acceptent les phrases, gardent cinq cibles distinctes et la semaine', () => {
  let found = false;
  for (let i = 0; i < 30; i++) {
    const session = generateCompleteWordSession(service(), { random: seededRandom(i) }).challenges;
    assert.equal(session.length, 5); assert.equal(new Set(session.map((item) => item.word)).size, 5);
    found ||= session.some((item) => item.targetType === 'sentence');
    assert.ok(generateCompleteWordSession(service(program, 4), { random: seededRandom(i) }).challenges.every((item) => item.wordId !== target.id));
  }
  assert.equal(found, true);
});
test('anciennes alternatives et activités conservées, récupération partielle en brouillon', () => {
  const partial = { ...word, segmentations: blocks.segments.map((part, i) => ({ id: `old-${i}`, segments: [part] })) };
  assert.equal(partial.segmentations.flatMap((item) => mismatch(item)).length, 3);
  const recovered = recoverPartialConstruction(program, partial)!;
  assert.equal(constructionText(program, recovered), 'lavage'); assert.equal(partial.segmentations[0].segments.length, 1);
  const updated = replacePrimary(partial, recovered); assert.equal(updated.segmentations.length, 3);
  assert.deepEqual(updated.segmentations.slice(1), partial.segmentations.slice(1));
  assert.deepEqual(errors(validateParentUnit(program, updated)), []);
  assert.deepEqual(parseParentData(JSON.stringify({ ...emptyParentData(), customUnits: [partial] }))!.customUnits, [partial]);
});
test('construction seed surchargée et reset sans mutation', () => {
  const original = initialProgram.units.find((unit) => unit.type === 'sentence')!;
  assert.equal(original.type, 'sentence');
  const value = { ...original, segmentations: [phrase] };
  const saved = saveParentUnit(emptyParentData(), initialProgram, value);
  const loaded = parseParentData(JSON.stringify(saved))!;
  assert.deepEqual(effectiveProgram(initialProgram, loaded).units.find((unit) => unit.id === value.id)?.type, 'sentence');
  assert.equal(primaryConstruction(original), undefined);
  assert.equal(primaryConstruction(effectiveProgram(initialProgram, emptyParentData()).units.find((unit) => unit.id === original.id)!), undefined);
});
test('réordonnancement remappe les cases, retrait de la réponse exige reconfiguration', () => {
  const data = { ...emptyParentData(), customUnits: [target], activities: [activity] };
  const changed = { ...target, segmentations: [{ ...phrase, segments: moveBlock(phrase.segments, 1, 2) }] };
  assert.deepEqual(saveParentUnit(data, program, changed).activities[0].missingSegmentIndexes, [2, 1]);
  const removed = { ...target, segmentations: [{ ...phrase, segments: phrase.segments.filter((_, i) => i !== 1) }] };
  assert.deepEqual(saveParentUnit(data, program, removed).activities[0].missingSegmentIndexes, []);
});
test('construction et ordre Sentence persistent sans transformer les blocs', () => {
  const data = { ...emptyParentData(), customUnits: [word, target], activities: [activity], activeWeek: 5 };
  assert.deepEqual(parseParentData(JSON.stringify(data)), data);
});

test('espaces extérieurs et ponctuation typographique restent exactement conservés', () => {
  const text = '  Il a lu.\u00a0'; const value = sentenceConstruction(program, text, phrase);
  assert.equal(constructionText(program, value), text);
  assert.deepEqual(errors(validateSegmentation(program, { ...target, display: text }, value, 5)), []);
});

test('retirer la construction principale ne supprime pas une alternative historique', () => {
  const old = { ...word, segmentations: [blocks, { ...blocks, id: 'alternative' }] };
  const removed = replacePrimary(old);
  assert.equal(primaryConstruction(removed), undefined);
  assert.equal(removed.segmentations[1].id, 'alternative');
  assert.deepEqual(errors(validateProgram({ ...initialProgram, units: [...initialProgram.units, removed] })), []);
});
