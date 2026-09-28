import type { ContentIssue, LearningProgram, Letter, SpellActivity, Word } from './model.ts';
import { isAvailable, isValidWeek } from './selectors.ts';

// Preserve exact graphemes (including combining accents); never strip accents.
export function letterPositions(text: string): string[] {
  return Array.from(new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(text), (part) => part.segment);
}
const sameLetter = (a: string, b: string) => a.normalize('NFC').toLocaleLowerCase('fr') === b.normalize('NFC').toLocaleLowerCase('fr');
export function letterForPosition(program: LearningProgram, text: string, week: number): Letter | undefined {
  if (!/^\p{L}\p{M}*$/u.test(text)) return undefined;
  const matches = program.units.filter((unit): unit is Letter => unit.type === 'letter'
    && sameLetter(unit.grapheme, text) && sameLetter(unit.display, text) && isAvailable(program, unit, week));
  return matches.length === 1 && program.units.filter((u) => u.id === matches[0].id).length === 1 ? matches[0] : undefined;
}
export function newSpellActivity(program: LearningProgram, word: Word, week: number, id: string): SpellActivity {
  const letterUnitIds: Record<number, string> = {};
  letterPositions(word.display).forEach((text, index) => {
    const unit = letterForPosition(program, text, week); if (unit) letterUnitIds[index] = unit.id;
  });
  return { id, type: 'spell', targetId: word.id, targetText: word.display,
    missingPositions: Object.keys(letterUnitIds).map(Number), letterUnitIds, distractorUnitIds: [], availableFromWeek: week };
}

export function validateSpellActivity(program: LearningProgram, activity: SpellActivity, week: number): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const add = (code: string, message: string) => issues.push({ severity: 'error', code, path: `activities.${activity.id}`, message });
  if (!activity.id || program.activities?.filter((a) => a.id === activity.id).length !== 1) add('unknown-activity', 'Activité absente ou ambiguë.');
  if (activity.enabled === false) add('disabled-exercise', 'Cette activité est désactivée.');
  const word = program.units.find((unit) => unit.id === activity.targetId);
  if (word?.type !== 'word' || program.units.filter((u) => u.id === word.id).length !== 1) { add('invalid-target', 'Écris le mot doit cibler un mot unique.'); return issues; }
  if (!isAvailable(program, word, week)) add('unavailable-target', 'Le mot est désactivé ou indisponible à cette semaine.');
  const from = activity.availableFromWeek ?? word.introducedInWeek;
  if (!isValidWeek(program, week) || !isValidWeek(program, from) || from < word.introducedInWeek || from > week) add('invalid-week', 'Semaine de disponibilité invalide pour cette activité.');
  if (activity.targetText !== word.display || word.text !== word.display) add('spell-word-changed', 'Le texte du mot a changé. Reconfigurez les positions de cet exercice.');
  const positions = letterPositions(word.display);
  if (!activity.missingPositions.length || new Set(activity.missingPositions).size !== activity.missingPositions.length) add('invalid-missing-index', 'Sélectionnez au moins une position, sans doublon.');
  for (const index of activity.missingPositions) {
    if (!Number.isInteger(index) || index < 0 || index >= positions.length) { add('invalid-missing-index', 'Position de lettre hors limites.'); continue; }
    const letter = letterForPosition(program, positions[index], week);
    if (!letter || letter.id !== activity.letterUnitIds[index]) add('invalid-spell-letter', `La position ${index + 1} (${positions[index]}) doit référencer une lettre autorisée correspondante.`);
  }
  if (Object.keys(activity.letterUnitIds).some((index) => !activity.missingPositions.includes(Number(index)))) add('invalid-spell-reference', 'Une référence de lettre ne correspond à aucune position à trouver.');
  const seen = new Set(activity.missingPositions.map((index) => positions[index]?.normalize('NFC').toLocaleLowerCase('fr')));
  for (const id of activity.distractorUnitIds) {
    const unit = program.units.find((u) => u.id === id);
    if (unit?.type !== 'letter' || !isAvailable(program, unit, week) || !/^\p{L}\p{M}*$/u.test(unit.grapheme)
      || !sameLetter(unit.display, unit.grapheme)) { add('invalid-spell-distractor', 'Un distracteur doit être une lettre autorisée.'); continue; }
    const text = unit.display.normalize('NFC').toLocaleLowerCase('fr');
    if (seen.has(text)) add('duplicate-choice', 'Un distracteur est répété ou correspond à une réponse.');
    seen.add(text);
  }
  if (!Number.isInteger(activity.answerPosition ?? 0) || (activity.answerPosition ?? 0) < 0 || (activity.answerPosition ?? 0) > activity.distractorUnitIds.length) add('invalid-answer-position', 'Position de réponse invalide.');
  return issues;
}
