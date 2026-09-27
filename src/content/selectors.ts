import type { LearningProgram, LearningUnit, LearningUnitType } from './model.ts';

export function isValidWeek(program: LearningProgram, week: number): boolean {
  return Number.isInteger(week) && week > 0 && program.weeks.some((item) => item.number === week);
}
export function isAvailable(program: LearningProgram, unit: LearningUnit, week: number): boolean {
  return isValidWeek(program, week) && isValidWeek(program, unit.introducedInWeek)
    && unit.enabled && unit.introducedInWeek <= week;
}
export function getAvailableUnits<T extends LearningUnitType>(program: LearningProgram, week: number, type: T): Extract<LearningUnit, { type: T }>[] {
  return program.units.filter((unit): unit is Extract<LearningUnit, { type: T }> =>
    unit.type === type && isAvailable(program, unit, week));
}
export const getAvailableLetters = (program: LearningProgram, week: number) => getAvailableUnits(program, week, 'letter');
export const getAvailableSounds = (program: LearningProgram, week: number) => getAvailableUnits(program, week, 'sound');
export const getAvailableSyllables = (program: LearningProgram, week: number) => getAvailableUnits(program, week, 'syllable');
export const getAvailableWords = (program: LearningProgram, week: number) => getAvailableUnits(program, week, 'word');
export const getAvailableToolWords = (program: LearningProgram, week: number) => getAvailableUnits(program, week, 'tool-word');
export const getAvailableSentences = (program: LearningProgram, week: number) => getAvailableUnits(program, week, 'sentence');
