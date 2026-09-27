import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { initialProgram } from '../src/content/program.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { effectiveProgram, emptyParentData } from '../src/parent/model.ts';
import { createParentStore, parseParentData } from '../src/services/parent-store.ts';
import { DEFAULT_QUESTION_COUNT } from '../src/game/play-settings.ts';
import { createPlaySession } from '../src/game/play-session.ts';
import { createSessionProgress, completeTarget, incorrectAttempt, nextTarget } from '../src/game/session-progress.ts';
import { advanceChain, remainingChainBank } from '../src/game/chain.ts';
import { availableAnswers, placeOccurrence, removeOccurrence } from '../src/game/answer-bank.ts';
import type { OccurrencePlacements } from '../src/game/answer-bank.ts';
import { chainParentData } from './fixtures/chain-program.ts';

mock.method(console, 'warn', () => {});
const service = createContentService(createContentRepository(initialProgram));

test('old settings default to six, persisted question counts 3/6/9 and compatible 5 survive reload', () => {
  const old = parseParentData(JSON.stringify(emptyParentData()))!;
  assert.equal(old.questionCount ?? DEFAULT_QUESTION_COUNT, 6);
  assert.equal(createPlaySession(service, old).challenges.length, 6);
  let raw: string | null = null;
  const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
  for (const questionCount of [3, 6, 9, 5]) {
    const data = { ...old, questionCount };
    assert.equal(createParentStore(() => storage).save(data), true);
    assert.deepEqual(createParentStore(() => storage).load().data, data);
  }
  for (const questionCount of [0, 10, 3.5, '6']) assert.equal(parseParentData(JSON.stringify({ ...old, questionCount })), undefined);
});

test('both modes select the same six targets once; chain groups 3+3, with independent banks', () => {
  const individual = createPlaySession(service, { gameMode: 'individual', questionCount: 6 }, () => 0.999);
  const chain = createPlaySession(service, { gameMode: 'chain', questionCount: 6, chainLength: 3 }, () => 0.999);
  assert.deepEqual(chain.challenges, individual.challenges);
  assert.equal(individual.challenges.length, 6);
  assert.equal(individual.chains, undefined);
  assert.deepEqual(chain.chains!.map((c) => c.targets.length), [3, 3]);
  assert.equal(new Set(chain.challenges.map((c) => c.wordId)).size, 6);
  assert.notEqual(chain.chains![0].bank, chain.chains![1].bank);
  assert.deepEqual(chain.chains![1].bank.map((a) => a.text), chain.challenges.slice(3).flatMap((c) => c.slots.map((s) => s.expected)));
});

test('non-divisible sessions use 3+2 or 2+2+1 without inventing targets', () => {
  for (const chainLength of [2, 3] as const) {
    const result = createPlaySession(service, { gameMode: 'chain', questionCount: 5, chainLength }, () => 0.999);
    assert.deepEqual(result.chains!.map((c) => c.targets.length), chainLength === 3 ? [3, 2] : [2, 2, 1]);
    assert.equal(new Set(result.challenges.map((c) => c.wordId)).size, 5);
  }
});

test('insufficient content sets actual session length and star maximum', () => {
  const data = chainParentData(2);
  const svc = createContentService(createContentRepository(effectiveProgram(initialProgram, data)), 6, data.exerciseScope);
  const result = createPlaySession(svc, { ...data, questionCount: 6 });
  assert.equal(result.challenges.length, 2);
  const progress = createSessionProgress(result.challenges.length);
  assert.equal(progress.totalTargets, 2);
});

for (const gameMode of ['individual', 'chain'] as const) test(`${gameMode}: progression counts every target; errors only suppress its star`, () => {
  const result = createPlaySession(service, { gameMode, questionCount: 6 });
  let progress = createSessionProgress(result.challenges.length);
  progress = completeTarget(progress);
  assert.equal(progress.completedTargets, 1); assert.equal(progress.perfectTargets, 1);
  assert.equal(completeTarget(progress), progress); // Duplicate success / replay cannot award again.
  assert.equal(incorrectAttempt(progress), progress);
  progress = nextTarget(progress);
  progress = incorrectAttempt(incorrectAttempt(progress));
  progress = completeTarget(progress);
  assert.equal(progress.completedTargets, 2); assert.equal(progress.perfectTargets, 1);
  progress = nextTarget(progress);
  assert.equal(progress.incorrectAttemptsForCurrentTarget, 0);
  progress = completeTarget(progress);
  assert.equal(progress.completedTargets, 3); assert.equal(progress.perfectTargets, 2);
  for (let i = 3; i < 6; i++) progress = completeTarget(nextTarget(progress));
  assert.equal(progress.completedTargets, 6); assert.equal(progress.perfectTargets, 5);
  assert.equal(completeTarget(progress), progress);
});

test('multi-slot words and phrase award one star per target; inventory edits are not performance events', () => {
  const data = chainParentData();
  const svc = createContentService(createContentRepository(effectiveProgram(initialProgram, data)), 6, data.exerciseScope);
  let chain = createPlaySession(svc, data, () => 0.999).chains![0];
  let progress = createSessionProgress(3);
  for (let targetIndex = 0; targetIndex < 3; targetIndex++) {
    const target = chain.targets[targetIndex];
    const bank = remainingChainBank(chain);
    let placements: OccurrencePlacements = {};
    for (const slot of target.slots) {
      const occurrence = availableAnswers(bank, placements).find((a) => a.text === slot.expected)!;
      let result = placeOccurrence(target, bank, placements, slot.segmentIndex, occurrence.id);
      if (!result.complete) {
        placements = removeOccurrence(result.placements, slot.segmentIndex);
        result = placeOccurrence(target, bank, placements, slot.segmentIndex, occurrence.id);
      }
      placements = result.placements;
      if (result.complete) progress = completeTarget(progress);
    }
    assert.equal(progress.perfectTargets, targetIndex + 1);
    assert.equal(progress.incorrectAttemptsForCurrentTarget, 0);
    chain = advanceChain(chain, placements);
    progress = nextTarget(progress);
  }
  assert.equal(progress.completedTargets, 3);
  assert.equal(progress.perfectTargets, 3);
});
