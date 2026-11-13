import type { ContentIssue, ExerciseScope, LearningProgram, SchoolWeek, WeeklyMathematics } from './model.ts';
import { isValidWeek } from './selectors.ts';

export function isWeeklyMathematics(value: unknown): value is WeeklyMathematics {
  if (!value || typeof value !== 'object' || !('numbers' in value)) return false;
  const numbers: unknown = value.numbers;
  return Array.isArray(numbers) && numbers.every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0)
    && new Set(numbers).size === numbers.length;
}

// Ownership is unique across the entire program, even outside the selected scope.
export function validateMathematics(weeks: readonly SchoolWeek[]): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const owners = new Map<number, number>();
  weeks.forEach((week, index) => {
    if (week.mathematics === undefined) return;
    const path = `weeks[${index}].mathematics.numbers`;
    if (!isWeeklyMathematics(week.mathematics)) {
      issues.push({ severity: 'error', code: 'invalid-mathematics', path,
        message: 'Les nombres doivent être des entiers non négatifs représentables exactement, sans doublons.' });
      return;
    }
    for (const number of week.mathematics.numbers) {
      if (owners.has(number)) issues.push({ severity: 'error', code: 'duplicate-math-number', path,
        message: `Le nombre ${number} est déjà introduit en semaine ${owners.get(number)}.` });
      else owners.set(number, week.number);
    }
  });
  return issues;
}

export interface EligibleMathNumber { readonly value: number; readonly introducedInWeek: number }

// This exact set must govern every future math target, distractor and sequence element.
// Future sampling preference: 70% current week, 30% eligible review; never widen scope.
export function getEligibleMathNumbers(program: LearningProgram, activeWeek: number, scope: ExerciseScope): EligibleMathNumber[] {
  if (!isValidWeek(program, activeWeek) || validateMathematics(program.weeks).length) return [];
  return program.weeks.filter(week => week.number <= activeWeek
    && (scope.mode === 'all' || scope.selectedWeeks.includes(week.number)))
    .flatMap(week => (week.mathematics?.numbers ?? []).map(value => ({ value, introducedInWeek: week.number })));
}
