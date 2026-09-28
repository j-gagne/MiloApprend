import { comparableText } from '../content/text.ts';
export type AnswerKind = 'letter' | 'syllable' | 'word';
export interface Answer { text: string; kind: AnswerKind }
export interface CompletionSlot { readonly segmentIndex: number; readonly expected: string }
export interface CompletionBoard {
  readonly gaps?: readonly string[];
  readonly segments: readonly string[];
  readonly choices: readonly Answer[];
  readonly slots: readonly CompletionSlot[];
}
export type Placements = Readonly<Record<number, string | undefined>>;

export function isSlotCorrect(board: CompletionBoard, slotIndex: number, answer: string): boolean {
  return board.slots.some((slot) => slot.segmentIndex === slotIndex && slot.expected === answer)
    && board.choices.some((choice) => choice.text === answer);
}

export function isComplete(board: CompletionBoard, placements: Placements): boolean {
  return board.slots.length > 0 && board.slots.every((slot) =>
    isSlotCorrect(board, slot.segmentIndex, placements[slot.segmentIndex] ?? ''));
}

// Une erreur laisse le plateau intact. Les choix sont réutilisables (ex. mé + mé).
export function placeAnswer(board: CompletionBoard, placements: Placements, slotIndex: number, answer: string) {
  const accepted = isSlotCorrect(board, slotIndex, answer);
  const next = accepted ? { ...placements, [slotIndex]: answer } : placements;
  return { accepted, placements: next, complete: isComplete(board, next) };
}
export interface Challenge {
  activityType?: 'complete-segments' | 'spell';
  targetType?: 'word' | 'sentence' | 'syllable';
  gaps?: readonly string[];
  id: string;
  word: string;
  audioText?: string;
  segments: readonly string[];
  missingIndex: number;
  slots?: readonly CompletionSlot[];
  choices: readonly Answer[];
  image: { emoji: string; label: string; src?: string };
  audioSrc?: string;
}

export function completionBoard(challenge: Challenge): CompletionBoard {
  return { ...challenge, slots: challenge.slots ?? [{ segmentIndex: challenge.missingIndex, expected: challenge.segments[challenge.missingIndex] }] };
}

export function isCorrect(challenge: Challenge, answer: string, slotIndex = challenge.missingIndex): boolean {
  return isSlotCorrect(completionBoard(challenge), slotIndex, answer);
}

export function validateChallenges(challenges: readonly Challenge[], allowed: readonly string[]): void {
  const ids = new Set<string>();
  for (const challenge of challenges) {
    if (ids.has(challenge.id) || comparableText(challenge.segments.join('')) !== comparableText(challenge.word)
      || !Number.isInteger(challenge.missingIndex) || challenge.missingIndex < 0
      || challenge.missingIndex >= challenge.segments.length
      || challenge.choices.length < (challenge.activityType === 'spell' ? 1 : 2)
      || new Set(challenge.choices.map((choice) => choice.text)).size !== challenge.choices.length
      || challenge.choices.some((choice) => !allowed.includes(choice.text))
      || !isCorrect(challenge, challenge.segments[challenge.missingIndex])) {
      throw new Error(`Défi invalide : ${challenge.id}`);
    }
    const board = completionBoard(challenge);
    if (!board.slots.length || new Set(board.slots.map((slot) => slot.segmentIndex)).size !== board.slots.length
      || board.slots.some((slot) => !Number.isInteger(slot.segmentIndex) || slot.segmentIndex < 0
        || slot.expected !== challenge.segments[slot.segmentIndex] || !isSlotCorrect(board, slot.segmentIndex, slot.expected))) {
      throw new Error(`Emplacements invalides : ${challenge.id}`);
    }
    ids.add(challenge.id);
  }
}
