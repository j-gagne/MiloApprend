import assert from 'node:assert/strict';
import test from 'node:test';
import { createCompleteWordSession } from '../src/game/complete-word-session.ts';
import { contentService } from '../src/content/service.ts';
import { isCorrect, validateChallenges } from '../src/game/complete-word.ts';
import type { Challenge } from '../src/game/complete-word.ts';

const demoChallenges = createCompleteWordSession(undefined, { random: () => 0.999 });
const learningContent = {
  letters: contentService.getAvailableLetters().map((unit) => unit.display),
  syllables: contentService.getAvailableSyllables().map((unit) => unit.display),
  words: contentService.getAvailableWords().map((unit) => unit.display),
};

test('les cinq défis utilisent uniquement les réponses autorisées', () => {
  assert.equal(demoChallenges.length, 5);
  validateChallenges(demoChallenges, [...learningContent.letters, ...learningContent.syllables]);
  for (const challenge of demoChallenges) {
    for (const choice of challenge.choices) {
      assert.equal(isCorrect(challenge, choice.text), choice.text === challenge.segments[challenge.missingIndex]);
    }
    assert.equal(isCorrect(challenge, 'inconnu'), false);
  }
});

test('le moteur accepte une syllabe voyelle-consonne et une réponse mot', () => {
  const challenge: Challenge = { id: 'os', word: 'os', segments: ['os'], missingIndex: 0,
    choices: [{ text: 'os', kind: 'syllable' }, { text: 'iv', kind: 'syllable' }], image: { emoji: '🦴', label: 'Un os' } };
  validateChallenges([challenge], learningContent.syllables);
  assert.ok(isCorrect(challenge, 'os'));
  const wordChallenge: Challenge = { ...challenge, choices: [{ text: 'os', kind: 'word' }, { text: 'animal', kind: 'word' }] };
  validateChallenges([wordChallenge], learningContent.words);
  assert.ok(isCorrect(wordChallenge, 'os'));
});

test('le moteur refuse le contenu non autorisé et les données incohérentes', () => {
  const challenge = demoChallenges[0];
  const allowed = [...learningContent.letters, ...learningContent.syllables];
  assert.throws(() => validateChallenges([{ ...challenge, missingIndex: 9 }], allowed));
  assert.throws(() => validateChallenges([{ ...challenge, word: 'autre' }], allowed));
  assert.throws(() => validateChallenges([{ ...challenge, choices: [...challenge.choices, { text: 'inconnue', kind: 'syllable' }] }], allowed));
  assert.throws(() => validateChallenges([challenge, challenge], allowed));
});
