import type { ContentIssue, LearningProgram } from './model.ts';
import type { MathExerciseDefinition } from './math-model.ts';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const numbers = (value: unknown): value is number[] => Array.isArray(value) && value.every(number);
export function isMathExerciseDefinition(value: unknown): value is MathExerciseDefinition {
  return object(value) && typeof value.id === 'string' && value.id.startsWith('math:') && value.id.length > 5
    && (value.enabled === undefined || typeof value.enabled === 'boolean')
    && (value.type === 'ORDER_NUMBERS' ? numbers(value.sequence)
      : value.type === 'MISSING_NUMBER' ? numbers(value.sequence) && number(value.missingIndex) && numbers(value.distractors)
        : value.type === 'HEAR_NUMBER' && number(value.target) && numbers(value.distractors));
}
export function mathExerciseNumbers(definition: MathExerciseDefinition): readonly number[] {
  return definition.type === 'ORDER_NUMBERS' ? definition.sequence
    : definition.type === 'MISSING_NUMBER' ? [...definition.sequence, ...definition.distractors]
      : [definition.target, ...definition.distractors];
}
export function validateMathExercise(value: unknown, allowed: ReadonlySet<number>, path = 'mathExercises'): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const error = (code: string, message: string) => issues.push({ severity: 'error', code, path, message });
  if (!isMathExerciseDefinition(value)) {
    error('invalid-math-exercise', 'Définition mathématique invalide (identifiant math:, type et entiers requis).');
    return issues;
  }
  if (value.type !== 'HEAR_NUMBER') {
    const minimum = value.type === 'ORDER_NUMBERS' ? 2 : 3;
    if (value.sequence.length < minimum || value.sequence.some((n, i) => i > 0 && n - value.sequence[i - 1] !== 1))
      error('invalid-math-sequence', `La séquence doit contenir au moins ${minimum} entiers consécutifs croissants.`);
    if (value.type === 'MISSING_NUMBER' && value.missingIndex >= value.sequence.length)
      error('invalid-math-missing-index', 'La position manquante doit appartenir à la séquence.');
  }
  if (value.type !== 'ORDER_NUMBERS') {
    const answer = value.type === 'HEAR_NUMBER' ? value.target : value.sequence[value.missingIndex];
    if (!value.distractors.length || new Set(value.distractors).size !== value.distractors.length || value.distractors.includes(answer))
      error('invalid-math-distractors', 'Au moins un distracteur distinct est requis, sans doublon ni réponse correcte.');
  }
  if (mathExerciseNumbers(value).some(n => !allowed.has(n)))
    error('unavailable-math-number', 'Chaque nombre, y compris les distracteurs et les cases fixes, doit appartenir au périmètre autorisé.');
  return issues;
}

/** Reserve invalid/duplicate IDs too: automatic generation must never hide a broken explicit definition. */
export function inspectMathDefinitions(program: LearningProgram, allowed: ReadonlySet<number>) {
  const configured: unknown = program.mathExercises;
  const issues: ContentIssue[] = [];
  const reserved = new Set<string>();
  const definitions = new Map<string, MathExerciseDefinition>();
  const otherIds = new Set([...(program.activities ?? []).map(item => item.id),
    ...(program.readingExercises ?? []).map(item => item.id),
    ...program.units.flatMap(unit => unit.type === 'word' ? (unit.completeWord ?? []).map(item => `${unit.id}:${item.id}`) : [])]);
  if (configured !== undefined && !Array.isArray(configured)) issues.push({ severity: 'error', code: 'invalid-math-exercises',
    path: 'mathExercises', message: 'Les exercices mathématiques doivent être une liste.' });
  for (const [index, value] of (Array.isArray(configured) ? configured : []).entries()) {
    const path = `mathExercises[${index}]`;
    const id = object(value) && typeof value.id === 'string' ? value.id : undefined;
    const duplicate = id !== undefined && (reserved.has(id) || otherIds.has(id));
    if (id !== undefined) reserved.add(id);
    const errors = validateMathExercise(value, allowed, path);
    issues.push(...errors);
    if (duplicate) issues.push({ severity: 'error', code: 'duplicate-math-exercise', path, message: `Identifiant d'exercice dupliqué : ${id}.` });
    if (errors.length || duplicate) { if (id !== undefined) definitions.delete(id); continue; }
    if (isMathExerciseDefinition(value)) definitions.set(value.id, value);
  }
  return { definitions, reserved, issues };
}
