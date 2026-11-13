import type { ContentIssue } from './model.ts';
import type { AudioStep } from '../services/audio-sequence.ts';

interface MathDefinitionBase { readonly id: string; readonly enabled?: boolean }
export type MathExerciseDefinition = MathDefinitionBase & (
  | { readonly type: 'ORDER_NUMBERS'; readonly sequence: readonly number[] }
  | { readonly type: 'MISSING_NUMBER'; readonly sequence: readonly number[]; readonly missingIndex: number; readonly distractors: readonly number[] }
  | { readonly type: 'HEAR_NUMBER'; readonly target: number; readonly distractors: readonly number[] }
);
export type MathExerciseType = MathExerciseDefinition['type'];
export interface MathCatalogEntry {
  readonly definition: MathExerciseDefinition;
  readonly automatic: boolean;
  /** Target week; ORDER_NUMBERS uses the latest sequence member's introduction. */
  readonly introducedInWeek: number;
}
export interface MathCatalog { readonly exercises: readonly MathCatalogEntry[]; readonly issues: readonly ContentIssue[] }
export interface MathGenerationPolicy {
  readonly count: number;
  readonly currentWeekShare: number;
  readonly sequenceLength: number;
  /** Total choices, including the correct answer. */
  readonly choiceCount: number;
}
export const DEFAULT_MATH_POLICY: MathGenerationPolicy = {
  count: 6, currentWeekShare: 0.7, sequenceLength: 5, choiceCount: 3,
};
interface GeneratedBase { readonly id: string; readonly introducedInWeek: number }
export type GeneratedMathExercise = GeneratedBase & (
  | { readonly type: 'ORDER_NUMBERS'; readonly tiles: readonly number[]; readonly answer: readonly number[] }
  | { readonly type: 'MISSING_NUMBER'; readonly sequence: readonly (number | null)[]; readonly missingIndex: number; readonly answer: number; readonly choices: readonly number[] }
  | { readonly type: 'HEAR_NUMBER'; readonly answer: number; readonly choices: readonly number[]; readonly prompt: AudioStep }
);
