import { isComplete, isSlotCorrect } from './complete-word.ts';
import type { Answer, CompletionBoard, Placements } from './complete-word.ts';

export interface AnswerOccurrence extends Answer { readonly id: string }
// Slot -> occurrence ID. Text is derived, never used as inventory identity.
export type OccurrencePlacements = Readonly<Record<number, string | undefined>>;

export function createAnswerBank(board: CompletionBoard): readonly AnswerOccurrence[] {
  const bank = board.choices.map((choice, index) => ({ ...choice, id: board.tileOrder?.[index] ?? `choice-${index}` }));
  // Content choices can be deduplicated; repeated expected segments need distinct tiles.
  for (const text of new Set(board.slots.map((slot) => slot.expected))) {
    const choice = bank.find((answer) => answer.text === text);
    if (!choice) continue;
    const needed = board.slots.filter((slot) => slot.expected === text).length;
    const count = bank.filter((answer) => answer.text === text).length;
    for (let copy = count; copy < needed; copy++) {
      bank.push({ ...choice, id: `${choice.id}-copy-${copy}` });
    }
  }
  return bank;
}

export function availableAnswers(bank: readonly AnswerOccurrence[], placements: OccurrencePlacements) {
  const used = new Set(Object.values(placements));
  return bank.filter((answer) => !used.has(answer.id));
}

export function placementTexts(bank: readonly AnswerOccurrence[], placements: OccurrencePlacements): Placements {
  return Object.fromEntries(Object.entries(placements).map(([slot, id]) =>
    [slot, bank.find((answer) => answer.id === id)?.text]));
}

export function removeOccurrence(placements: OccurrencePlacements, slotIndex: number): OccurrencePlacements {
  const next = { ...placements };
  delete next[slotIndex];
  return next;
}

export function placeOccurrence(board: CompletionBoard, bank: readonly AnswerOccurrence[], placements: OccurrencePlacements,
  slotIndex: number, id: string, fromIndex?: number) {
  const occurrence = bank.find((answer) => answer.id === id);
  const validSource = fromIndex === undefined
    ? !Object.values(placements).includes(id) : placements[fromIndex] === id;
  const accepted = Boolean(occurrence && validSource && isSlotCorrect(board, slotIndex, occurrence.text));
  const next = accepted
    ? { ...(fromIndex === undefined ? placements : removeOccurrence(placements, fromIndex)), [slotIndex]: id }
    : placements;
  return { accepted, placements: next, complete: isComplete(board, placementTexts(bank, next)) };
}
