import type { ExerciseScope, LearningProgram, ContentIssue } from './model.ts';
import { getEligibleMathNumbers, validateMathematics } from './mathematics.ts';
import { DEFAULT_MATH_POLICY, type MathGenerationPolicy, type MathCatalog, type MathExerciseDefinition } from './math-model.ts';
import { inspectMathDefinitions, validateMathExercise } from './math-validation.ts';

export function resolveMathPolicy(options: Partial<MathGenerationPolicy> = {}): MathGenerationPolicy {
  const policy = { ...DEFAULT_MATH_POLICY, ...options };
  if (!Number.isSafeInteger(policy.count) || policy.count < 1
    || !Number.isFinite(policy.currentWeekShare) || policy.currentWeekShare < 0 || policy.currentWeekShare > 1
    || !Number.isSafeInteger(policy.sequenceLength) || policy.sequenceLength < 3
    || !Number.isSafeInteger(policy.choiceCount) || policy.choiceCount < 2) throw new Error('Politique de génération mathématique invalide.');
  return policy;
}

export function mathCatalog(program: LearningProgram, week: number, scope: ExerciseScope,
  options: Partial<MathGenerationPolicy> = {}): MathCatalog {
  const policy = resolveMathPolicy(options);
  const eligible = getEligibleMathNumbers(program, week, scope);
  const owners = new Map(eligible.map(item => [item.value, item.introducedInWeek]));
  const allowed = new Set(owners.keys());
  const { definitions, reserved, issues } = inspectMathDefinitions(program, allowed);
  issues.push(...validateMathematics(program.weeks));
  const values = [...allowed].sort((a, b) => a - b);
  const nearest = (answer: number) => values.filter(n => n !== answer)
    .sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer) || a - b).slice(0, policy.choiceCount - 1);
  const automatic: MathExerciseDefinition[] = [];
  // Sliding windows of actual eligible values only, never a numeric range expansion.
  for (let start = 0; start + policy.sequenceLength <= values.length; start++) {
    const sequence = values.slice(start, start + policy.sequenceLength);
    if (sequence.some((n, i) => i > 0 && n - sequence[i - 1] !== 1)) continue;
    const key = sequence.join('-');
    automatic.push({ id: `math:auto:order:${key}`, type: 'ORDER_NUMBERS', sequence });
    if (values.length >= policy.choiceCount) for (let missingIndex = 1; missingIndex < sequence.length - 1; missingIndex++) {
      automatic.push({ id: `math:auto:missing:${key}:${missingIndex}`, type: 'MISSING_NUMBER', sequence, missingIndex,
        distractors: nearest(sequence[missingIndex]) });
    }
  }
  if (values.length >= policy.choiceCount) for (const target of values) {
    automatic.push({ id: `math:auto:hear:${target}`, type: 'HEAR_NUMBER', target, distractors: nearest(target) });
  }
  for (const type of ['ORDER_NUMBERS', 'MISSING_NUMBER', 'HEAR_NUMBER'] as const) {
    if (!automatic.some(item => item.type === type)) issues.push({ severity: 'warning', code: 'insufficient-math-numbers',
      path: `mathExercises.automatic.${type}`, message: `${type} : nombres admissibles insuffisants (séquence consécutive de ${policy.sequenceLength}, choix : ${policy.choiceCount}).` });
  }
  for (const definition of automatic) if (!reserved.has(definition.id)) definitions.set(definition.id, definition);
  const exercises: MathCatalog['exercises'][number][] = [];
  for (const definition of definitions.values()) {
    if (!(program.activityEnabled?.[definition.id] ?? definition.enabled ?? true)) continue;
    // Same validation for explicit and automatic definitions, including every number.
    const errors: ContentIssue[] = validateMathExercise(definition, allowed, `mathExercises.${definition.id}`);
    if (errors.length) { issues.push(...errors); continue; }
    const targets = definition.type === 'ORDER_NUMBERS' ? definition.sequence
      : [definition.type === 'HEAR_NUMBER' ? definition.target : definition.sequence[definition.missingIndex]];
    exercises.push({ definition, automatic: !reserved.has(definition.id),
      introducedInWeek: Math.max(...targets.map(n => owners.get(n)!)) });
  }
  return { exercises, issues };
}
