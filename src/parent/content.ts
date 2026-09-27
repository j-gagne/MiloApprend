import type { ContentIssue, LearningProgram, LearningUnit } from '../content/model.ts';
import { comparableText } from '../content/text.ts';
import { validateProgram } from '../content/validation.ts';
import { primaryConstruction } from '../content/construction.ts';

export function validateParentUnit(program: LearningProgram, unit: LearningUnit): ContentIssue[] {
  // L'éditeur V1.2 ne modifie ni ne bloque sur les alternatives historiques masquées.
  const primary = primaryConstruction(unit);
  const visible = unit.type === 'word' || unit.type === 'sentence' ? { ...unit, segmentations: primary ? [primary] : [] } : unit;
  const candidate = { ...program, units: [...program.units.filter((item) => item.id !== unit.id), visible] };
  const issues = validateProgram(candidate).filter((issue) => issue.path === unit.id || issue.path.startsWith(`${unit.id}.`));
  if (program.units.some((item) => item.id !== unit.id && item.type === unit.type
    && comparableText(item.display) === comparableText(unit.display))) {
    issues.push({ severity: 'error', code: 'duplicate-content', path: unit.id, message: 'Ce contenu existe déjà. Utilisez son entrée existante.' });
  }
  return issues;
}
