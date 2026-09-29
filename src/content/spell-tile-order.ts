import type { SpellActivity } from './model.ts';
import { letterPositions } from './spelling.ts';

// Answer positions distinguish repeated letters. Distractors are unique by validation.
export function spellTiles(activity: SpellActivity) {
  const letters = letterPositions(activity.targetText);
  const seen = new Set<string>();
  const first: string[] = [], copies: string[] = [];
  for (const position of activity.missingPositions) {
    const text = letters[position];
    (seen.has(text) ? copies : first).push(`answer:${position}`);
    seen.add(text);
  }
  const order = activity.distractorUnitIds.map(id => `distractor:${id}`);
  order.splice(activity.answerPosition ?? 0, 0, ...first);
  // Match the legacy answer-bank behavior: repeated answers were appended last.
  return [...order, ...copies];
}
export function reconcileSpellOrder(activity: SpellActivity): string[] {
  const valid = spellTiles(activity);
  return [...new Set([...(activity.tileOrder ?? valid).filter(id => valid.includes(id)), ...valid])];
}
export function spellTileText(activity: SpellActivity, id: string, display: (unitId: string) => string): string {
  return id.startsWith('answer:') ? letterPositions(activity.targetText)[Number(id.slice(7))] : display(id.slice(11));
}
