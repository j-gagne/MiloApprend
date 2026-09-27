import assert from 'node:assert/strict';
import test from 'node:test';
import type { CompletionActivity, LearningProgram, Word, LearningUnit } from '../src/content/model.ts';
import { initialProgram } from '../src/content/program.ts';
import { comparableText } from '../src/content/text.ts';
import { validateSegmentation, validateCompletionActivity, validateProgram } from '../src/content/validation.ts';
import { emptyParentData, effectiveProgram, effectiveWeek, duplicateActivity, removeCustomActivity, removeCustomWeek, weekError } from '../src/parent/model.ts';
import { validateParentUnit } from '../src/parent/content.ts';
import { parseParentData } from '../src/services/parent-store.ts';
import { parentActivities } from '../src/parent/activities.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { getCompleteWordChallenges } from '../src/game/complete-word-content.ts';

const week = { id: 'parent-week-six', number: 6, label: 'Semaine 6' };
const base = { enabled: true, introducedInWeek: 6, tags: ['parent', 'practice'] };
const lila: Word = { ...base, id: 'parent-word-lila', type: 'word', text: 'LILA', display: 'LILA', audioText: 'lila',
  segmentations: [{ id: 'parts', segments: [{ unitId: 'syllable-li' }, { unitId: 'syllable-la' }] }] };
const lavage: Word = { ...lila, id: 'parent-word-lavage', text: 'LAVAGE', display: 'LAVAGE', audioText: 'lavage',
  segmentations: [{ id: 'parts', segments: [{ unitId: 'syllable-la' }, { unitId: 'syllable-va' }, { literal: 'ge', note: 'Visible seulement' }] }] };
const letter: LearningUnit = { ...base, id: 'parent-letter-r', type: 'letter', display: 'R', grapheme: 'R', audioText: 'r' };
const syllable: LearningUnit = { ...base, id: 'parent-syllable-ra', type: 'syllable', display: 'RA', audioText: 'ra' };
const sentence: LearningUnit = { ...base, id: 'parent-sentence-lila', type: 'sentence', display: 'Lila lave.', audioText: 'Lila lave.' };
const activity: CompletionActivity = { id: 'parent-activity-lavage', type: 'complete-segments', targetId: lavage.id,
  segmentationId: 'parts', availableFromWeek: 6, missingSegmentIndexes: [1], distractorUnitIds: ['syllable-li', 'syllable-mu'] };
const data = { ...emptyParentData(), customWeeks: [week], customUnits: [lila, lavage, letter, syllable, sentence], activities: [activity] };
const program = effectiveProgram(initialProgram, data);
const errors = (issues: ReturnType<typeof validateProgram>) => issues.filter((issue) => issue.severity === 'error');
const validate = (value: CompletionActivity, p: LearningProgram = program, at = 6) => errors(validateCompletionActivity({ ...p, activities: [value] }, value, at));
const challenges = (at: number, p = program) => getCompleteWordChallenges(createContentService(createContentRepository(p), at)).challenges;

test('LILA = LI + LA : comparaison des graphies, jamais des IDs', () => {
  assert.deepEqual(errors(validateSegmentation(program, lila, lila.segmentations[0], 6)), []);
  assert.deepEqual(errors(validateParentUnit(program, lila)), []);
  assert.equal(lila.display, 'LILA');
});
test('comparaison Unicode canonique, casse et espaces, sans perdre accents ni ponctuation', () => {
  assert.equal(comparableText('  VÉLO  '), comparableText('ve\u0301lo'));
  assert.equal(comparableText('Il\u00a0a  lu.'), comparableText('il a lu.'));
  assert.notEqual(comparableText('vélo'), comparableText('velo'));
  assert.notEqual(comparableText('Il a lu.'), comparableText('Il a lu'));
});
test('références à IDs arbitraires et displays majuscules conservent LILA', () => {
  const p = { ...program, units: program.units.map((unit) => unit.id === 'syllable-li' || unit.id === 'syllable-la' ? { ...unit, display: unit.display.toUpperCase() } : unit) };
  assert.deepEqual(errors(validateSegmentation(p, { ...lila, display: 'lila' }, lila.segmentations[0], 6)), []);
});
test('LAVAGE = LA + VA + literal ge est valide sans GE appris', () => assert.deepEqual(errors(validateParentUnit(program, lavage)), []));
test('LA + VA seul ne reconstruit pas LAVAGE', () => assert.ok(errors(validateSegmentation(program, lavage, { ...lavage.segmentations[0], segments: lavage.segmentations[0].segments.slice(0, 2) }, 6)).some((issue) => issue.code === 'segmentation-mismatch')));
test('literal ge ne génère ni GE ni G ni E ni autre unité', () => {
  const before = new Set(initialProgram.units.map((unit) => unit.id));
  assert.deepEqual(program.units.filter((unit) => !before.has(unit.id)).map((unit) => unit.id), data.customUnits.map((unit) => unit.id));
  assert.equal(program.units.filter((unit) => unit.type === 'syllable').length, initialProgram.units.filter((unit) => unit.type === 'syllable').length + 1);
});
for (const indexes of [[0], [1], [0, 1]]) test(`LAVAGE accepte les parties ${indexes.join('+')} uniquement`, () => assert.deepEqual(validate({ ...activity, missingSegmentIndexes: indexes }), []));
test('literal ge ne peut pas être une réponse', () => assert.ok(validate({ ...activity, missingSegmentIndexes: [2] }).some((issue) => issue.code === 'unconfirmed-answer')));
test('literal ge ne peut pas être un distracteur', () => assert.ok(validate({ ...activity, distractorUnitIds: ['ge'] }).some((issue) => issue.code === 'unknown-reference')));
test('GE créé plus tard ne transforme jamais le littéral en réponse', () => {
  const p = { ...program, weeks: [...program.weeks, { number: 7, label: '7' }], units: [...program.units, { ...syllable, id: 'parent-syllable-ge', display: 'ge', introducedInWeek: 7 }] };
  assert.deepEqual(validate(activity, p), []);
  assert.ok(validate({ ...activity, missingSegmentIndexes: [2] }, p, 7).some((issue) => issue.code === 'unconfirmed-answer'));
});
test('semaine 6 Parent valide et fusionnée au programme', () => { assert.equal(weekError(initialProgram, week), undefined); assert.ok(program.weeks.some((item) => item.number === 6)); });
test('semaine 6 dupliquée refusée', () => { assert.ok(weekError(program, week)); assert.equal(parseParentData(JSON.stringify({ ...data, customWeeks: [week, { ...week, id: 'parent-week-duplicate' }] })), undefined); });
test('semaine Parent peut devenir active', () => assert.equal(effectiveWeek(initialProgram, { ...data, activeWeek: 6 }, 5), 6));
test('lettre Parent valide en semaine 6', () => assert.deepEqual(errors(validateParentUnit(program, letter)), []));
test('syllabe Parent valide sans génération automatique', () => assert.deepEqual(errors(validateParentUnit(program, syllable)), []));
test('mot Parent avec construction devient automatiquement jouable', () => { assert.ok(program.units.some((unit) => unit.id === lila.id)); assert.ok(challenges(6).some((item) => item.word === 'LILA')); });
test('phrase Parent sans exercice conservée et distincte', () => { assert.deepEqual(errors(validateParentUnit(program, sentence)), []); assert.ok(!challenges(6).some((item) => item.word === sentence.display)); });
test('plusieurs exercices par mot sans copie de segmentation', () => {
  const copy = duplicateActivity(activity); const p = effectiveProgram(initialProgram, { ...data, activities: [activity, copy] });
  assert.equal(challenges(6, p).filter((item) => item.word === 'LAVAGE' && !item.id.startsWith('generated:')).length, 2);
  assert.equal(copy.segmentation, undefined); assert.equal(copy.segmentationId, 'parts');
});
test('duplication nouvel ID stable et configuration identique après reload', () => {
  const copy = duplicateActivity(activity); assert.notEqual(copy.id, activity.id);
  const loaded = parseParentData(JSON.stringify({ ...data, activities: [activity, copy] }))!;
  assert.deepEqual(loaded.activities, [activity, copy]);
});
test('suppression activité Parent conserve le mot', () => { const next = removeCustomActivity(data, initialProgram, activity.id); assert.equal(next.activities.length, 0); assert.ok(next.customUnits.some((unit) => unit.id === lavage.id)); });
test('activité seed jamais supprimée', () => assert.equal(removeCustomActivity(data, initialProgram, parentActivities(initialProgram)[0].id), data));
test('toutes les unités et semaines Parent survivent au reload', () => { const next = parseParentData(JSON.stringify(data))!; assert.deepEqual(next.customUnits, data.customUnits); assert.deepEqual(next.customWeeks, data.customWeeks); });
test('contenu et activité semaine 6 exclus semaine 5, admissibles semaine 6', () => { assert.ok(!challenges(5).some((item) => item.word === 'LAVAGE')); assert.ok(challenges(6).some((item) => item.word === 'LAVAGE')); });
test('réponse future référencée refusée', () => assert.ok(validate(activity, program, 5).some((issue) => issue.code === 'future-reference')));
test('seed non muté et reset complet', () => {
  const before = JSON.stringify(initialProgram); effectiveProgram(initialProgram, data);
  assert.equal(JSON.stringify(initialProgram), before);
  const reset = effectiveProgram(initialProgram, emptyParentData()); assert.equal(reset.units.length, initialProgram.units.length); assert.deepEqual(reset.weeks, initialProgram.weeks);
  assert.equal(challenges(5, reset).filter((item) => !item.id.startsWith('generated:')).length, 22);
});
test('variantes seed et LAMA multi valides', () => { assert.deepEqual(errors(validateProgram(initialProgram)), []); assert.equal(challenges(5).find((item) => item.id === 'word-lama:deux-emplacements')?.slots.length, 2); });
test('suppression semaine remplie bloquée, vide permise, seed protégé', () => {
  assert.equal(removeCustomWeek(data, program, week.id), data);
  const empty = { ...emptyParentData(), customWeeks: [week], activeWeek: 6 };
  assert.equal(removeCustomWeek(empty, effectiveProgram(initialProgram, empty), week.id).customWeeks.length, 0);
  assert.equal(removeCustomWeek(data, program, 'seed-week-5'), data);
});
test('migration V1 conserve mots, activités inline et overrides', () => {
  const old = { version: 1, customWords: [lila], activities: [{ ...activity, segmentationId: undefined, segmentation: lavage.segmentations[0] }], unitEnabled: { 'word-lune': false }, activityEnabled: {}, activeWeek: 5 };
  const next = parseParentData(JSON.stringify(old))!; assert.equal(next.version, 2); assert.deepEqual(next.customUnits, [lila]); assert.ok(next.activities[0].segmentation); assert.equal(next.unitEnabled['word-lune'], false);
});
for (const [name, patch, code] of [
  ['cible absente', { targetId: 'absent' }, 'invalid-target'], ['découpage absent', { segmentationId: 'absent' }, 'unknown-segmentation'],
  ['aucune partie', { missingSegmentIndexes: [] }, 'invalid-missing-index'], ['distracteur correct', { distractorUnitIds: ['syllable-va'] }, 'duplicate-choice'],
  ['activité désactivée', { enabled: false }, 'disabled-exercise'], ['semaine inexistante', { availableFromWeek: 99 }, 'invalid-week'],
] as const) test(`validation : ${name}`, () => assert.ok(validate({ ...activity, ...patch }).some((issue) => issue.code === code)));
test('mot désactivé ou unité orpheline exclus', () => {
  assert.ok(validate(activity, { ...program, units: program.units.map((unit) => unit.id === lavage.id ? { ...unit, enabled: false } : unit) }).some((issue) => issue.code === 'disabled-reference'));
  assert.ok(validate(activity, { ...program, units: program.units.filter((unit) => unit.id !== 'syllable-va') }).some((issue) => issue.code === 'unknown-reference'));
});
test('IDs custom dupliqués refusés par le stockage et le validateur', () => {
  assert.equal(parseParentData(JSON.stringify({ ...data, customUnits: [lila, lila] })), undefined);
  assert.ok(errors(validateProgram({ ...program, units: [...program.units, lila] })).some((issue) => issue.code === 'duplicate-id'));
});
