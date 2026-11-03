import assert from 'node:assert/strict';
import test from 'node:test';
import { silentProgram } from './fixtures/silent-program.ts';
import type { CompletionActivity, LearningProgram, Word } from '../src/content/model.ts';
import { validateProgram, validateCompletionActivity } from '../src/content/validation.ts';
import { readingCatalog, isReadingExerciseDefinition } from '../src/content/reading-catalog.ts';
import { getPedagogicalReading, getReadingSegmentIndexes } from '../src/content/segmented-reading.ts';
import { firstSegmentAudio } from '../src/game/first-segment-audio.ts';
import { getCompleteWordChallenges } from '../src/game/complete-word-content.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createReadingState, moveReadingSlider, readingExerciseComplete } from '../src/game/reading-session.ts';
import { emptyParentData, effectiveProgram, saveParentUnit } from '../src/parent/model.ts';
import { parseParentData } from '../src/services/parent-store.ts';
const word = (id: string) => silentProgram.units.find((unit): unit is Word => unit.id === `word-${id}` && unit.type === 'word')!;
const service = (program = silentProgram) => createContentService(createContentRepository(program), 1);

test('silent flags preserve spelling and only audible Reading pieces require completion', () => {
  assert.deepEqual(validateProgram(silentProgram).filter(issue => issue.severity === 'error'), []);
  const catalog = readingCatalog(silentProgram, 1, { mode: 'all', selectedWeeks: [] });
  for (const [id, texts] of [['rue', ['ru']], ['fee', ['fé']], ['fumee', ['fu', 'mé']], ['chat', ['cha']]] as const) {
    const exercise = catalog.exercises.find(item => item.targetId === `word-${id}`)!;
    const unit = exercise.displayedUnits[0];
    assert.equal(unit.display, word(id).display);
    assert.deepEqual(unit.segments.filter(segment => !segment.silent).map(segment => segment.text), texts);
    let state = createReadingState([exercise]);
    assert.equal(readingExerciseComplete(state, 0), false);
    for (const [index, segment] of unit.segments.entries()) if (!segment.silent) state = moveReadingSlider(state, 0, index, 100);
    assert.equal(readingExerciseComplete(state, 0), true);
  }
});

test('Complete excludes silent slots and target-specific distractors, including multiple missing pieces', () => {
  const challenges = getCompleteWordChallenges(service()).challenges.filter(challenge => challenge.targetType === 'word');
  assert.ok(challenges.length > 0);
  for (const challenge of challenges) {
    const target = silentProgram.units.find((u): u is Word => u.id === challenge.wordId && u.type === 'word')!;
    const silentIndex = target.segmentations[0].segments.length - 1;
    assert.ok(challenge.slots.every(slot => slot.segmentIndex !== silentIndex));
    assert.ok(challenge.choices.every(choice => choice.text !== target.display.at(-1)));
    assert.equal(challenge.segments.join(''), target.display);
  }
  assert.ok(challenges.some(challenge => challenge.wordId === 'word-fumee' && challenge.slots.length === 2));
  for (const [missing, distractors, code] of [[[1], ['letter-a'], 'silent-answer'], [[0, 1], ['letter-a'], 'silent-answer'], [[0], ['letter-e'], 'silent-distractor']] as const) {
    const activity: CompletionActivity = { id: 'old', type: 'complete-segments', targetId: 'word-rue', segmentationId: 'main', missingSegmentIndexes: missing, distractorUnitIds: distractors };
    const program = { ...silentProgram, activities: [activity] };
    assert.ok(validateCompletionActivity(program, activity, 1).some(issue => issue.code === code));
    assert.ok(!getCompleteWordChallenges(service(program)).challenges.some(challenge => challenge.id === 'old'));
  }
});

test('audio omits silent occurrences and keeps highlight indexes aligned', () => {
  for (const [id, expected] of [['rue', ['ru']], ['fee', ['fé']], ['fumee', ['fu', 'mé']], ['chat', ['cha']], ['nid', ['ni']], ['lit', ['li']]] as const) {
    const target = word(id), construction = target.segmentations[0];
    assert.deepEqual(getPedagogicalReading(silentProgram, target, construction, 1), { mode: 'segmented', segments: expected, whole: target.display });
    assert.deepEqual(getReadingSegmentIndexes(target, construction), expected.map((_, i) => i));
    assert.equal(firstSegmentAudio(silentProgram, target, construction, [construction.segments.length - 1], 1), undefined);
  }
  const target = word('rue'), construction = target.segmentations[0];
  for (const readingSequence of [[{ unitId: 'syllable-ru' }, { unitId: 'letter-e' }], [{ text: 'ru' }, { text: 'e', silent: true as const }]]) {
    assert.deepEqual(getPedagogicalReading(silentProgram, { ...target, readingSequence }, construction, 1), { mode: 'segmented', segments: ['ru'], whole: 'rue' });
    assert.equal(getReadingSegmentIndexes({ ...target, readingSequence }, construction)?.length, 1);
  }
});

test('absence of silent remains audible; literal never implies silence; repeated identities remain positional', () => {
  const target = word('rue');
  const audible = { ...target.segmentations[0], segments: [{ unitId: 'syllable-ru' }, { unitId: 'letter-e' }] };
  assert.deepEqual(getPedagogicalReading(silentProgram, target, audible, 1), { mode: 'segmented', segments: ['ru', 'e'], whole: 'rue' });
  assert.equal(getPedagogicalReading(silentProgram, target, { ...audible, segments: [{ unitId: 'syllable-ru' }, { literal: 'e', note: 'Visible' }] }, 1), null);
  const repeated: Word = { ...target, display: 'ee', text: 'ee', audioText: 'ee', readingSequence: [{ unitId: 'letter-e' }, { unitId: 'letter-e' }] };
  const construction = { id: 'repeat', segments: [{ unitId: 'letter-e', silent: true as const }, { unitId: 'letter-e' }] };
  assert.deepEqual(getReadingSegmentIndexes(repeated, construction), [1]);
  assert.deepEqual(getPedagogicalReading(silentProgram, repeated, construction, 1), { mode: 'segmented', segments: ['e'], whole: 'ee' });
});

test('validation rejects malformed flags and fully silent Reading definitions', () => {
  const invalid = JSON.parse(JSON.stringify(silentProgram)) as LearningProgram;
  const target = invalid.units.find((unit): unit is Word => unit.id === 'word-rue' && unit.type === 'word')!;
  Object.assign(target.segmentations[0].segments[1], { silent: 'true' });
  assert.ok(validateProgram(invalid).some(issue => issue.code === 'invalid-silent'));
  const displayedUnits = [{ unitId: 'word-rue', segmentUnitIds: [{ unitId: 'syllable-ru', silent: true as const }, { unitId: 'letter-e', silent: true as const }] }];
  const definition = { id: 'reading:whole:word-rue', targetId: 'word-rue', displayedUnits };
  assert.ok(readingCatalog({ ...silentProgram, readingExercises: [definition] }, 1, { mode: 'all', selectedWeeks: [] }).issues.length);
  assert.equal(isReadingExerciseDefinition({ ...definition, displayedUnits: [{ unitId: 'word-rue', segmentUnitIds: [{ unitId: 'letter-e', silent: 'yes' }] }] }), false);
});

test('Parent save/reload preserves silent annotations and explicit preferences', () => {
  const target = { ...word('rue'), readingSequence: [{ unitId: 'syllable-ru' }, { text: 'e', silent: true as const }] };
  const parent = saveParentUnit({ ...emptyParentData(), activeWeek: 1, questionCount: 3, readingExercises: [
    { ...silentProgram.readingExercises![0], id: 'reading:parent-activity-silent' },
  ] }, silentProgram, target);
  const loaded = parseParentData(JSON.stringify(parent))!;
  assert.ok(loaded);
  assert.equal(loaded.questionCount, 3);
  assert.deepEqual(loaded.readingExercises, parent.readingExercises);
  const effective = effectiveProgram(silentProgram, loaded);
  const saved = effective.units.find((u): u is Word => u.id === target.id && u.type === 'word')!;
  assert.deepEqual(saved.segmentations, target.segmentations);
  assert.deepEqual(saved.readingSequence, target.readingSequence);
});
