import type { ContentService } from './service.ts';
import type { ContentIssue } from './model.ts';
import type { GeneratedMathExercise, MathGenerationPolicy } from './math-model.ts';
import { resolveMathPolicy } from './math-catalog.ts';

/** Pure selection/materialization. No session identity, storage, audio playback or rewards. */
export function generateMathExercises(service: ContentService, options: Partial<MathGenerationPolicy> = {}, random: () => number = Math.random) {
  const policy = resolveMathPolicy(options);
  const catalog = service.getMathExercises(policy);
  const issues: ContentIssue[] = [...catalog.issues];
  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Le RNG doit retourner une valeur dans [0, 1).');
      const j = Math.floor(value * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const current = shuffle(catalog.exercises.filter(item => item.introducedInWeek === service.activeWeek));
  const review = shuffle(catalog.exercises.filter(item => item.introducedInWeek < service.activeWeek));
  const currentCount = Math.round(policy.count * policy.currentWeekShare);
  const picked = [...current.slice(0, currentCount), ...review.slice(0, policy.count - currentCount)];
  picked.push(...shuffle(catalog.exercises.filter(item => !picked.includes(item))).slice(0, policy.count - picked.length));
  if (picked.length < policy.count) issues.push({ severity: 'warning', code: 'short-math-selection', path: 'mathExercises',
    message: `${picked.length} exercices admissibles sur ${policy.count} demandés, sans répétition ni élargissement du périmètre.` });
  const exercises: GeneratedMathExercise[] = shuffle(picked).map(({ definition, introducedInWeek }) => {
    const base = { id: definition.id, introducedInWeek };
    if (definition.type === 'ORDER_NUMBERS') {
      const tiles = shuffle(definition.sequence);
      // A shuffle can be the identity; ensure the child actually has something to order.
      if (tiles.every((n, i) => n === definition.sequence[i])) tiles.reverse();
      return { ...base, type: definition.type, tiles, answer: [...definition.sequence] };
    }
    const answer = definition.type === 'HEAR_NUMBER' ? definition.target : definition.sequence[definition.missingIndex];
    const choices = shuffle([answer, ...definition.distractors]);
    return definition.type === 'MISSING_NUMBER'
      ? { ...base, type: definition.type, answer, choices, missingIndex: definition.missingIndex,
        sequence: definition.sequence.map((n, i) => i === definition.missingIndex ? null : n) }
      // Numeric text is pronounced by the existing French gameAudio.playWord(prompt.text) path.
      : { ...base, type: definition.type, answer, choices, prompt: { text: String(answer) } };
  });
  return { exercises, issues };
}
