import type { Answer, CompletionBoard } from './complete-word.ts';
import { isComplete } from './complete-word.ts';
import { availableAnswers, placementTexts } from './answer-bank.ts';
import type { AnswerOccurrence, OccurrencePlacements } from './answer-bank.ts';

export interface ChainState {
  readonly targets: readonly CompletionBoard[];
  readonly bank: readonly AnswerOccurrence[];
  readonly completed: readonly OccurrencePlacements[];
}

// One occurrence per selected slot, never per inferred syllable or unique text.
// Optional extra answers prepare distractors without changing completion rules.
export function createChain(targets: readonly CompletionBoard[], distractors: readonly Answer[] = []): ChainState {
  const bank: AnswerOccurrence[] = targets.flatMap((target, index) => target.slots.map((slot) => {
    const answer = target.choices.find((choice) => choice.text === slot.expected);
    if (!answer) throw new Error('Slot sans réponse dans un exercice sélectionné.');
    return { ...answer, id: `target-${index}-slot-${slot.segmentIndex}` };
  }));
  bank.push(...distractors.map((answer, index) => ({ ...answer, id: `extra-${index}` })));
  return { targets, bank, completed: [] };
}

export function remainingChainBank(chain: ChainState): readonly AnswerOccurrence[] {
  const used = Object.fromEntries(chain.completed.flatMap((placements, target) =>
    Object.entries(placements).map(([slot, id]) => [`${target}:${slot}`, id])));
  return availableAnswers(chain.bank, used);
}

export function chainFinished(chain: ChainState): boolean {
  return chain.targets.length > 0 && chain.completed.length === chain.targets.length;
}

export function advanceChain(chain: ChainState, placements: OccurrencePlacements): ChainState {
  const target = chain.targets[chain.completed.length];
  if (!target) return chain;
  const ids = Object.values(placements).filter((id): id is string => id !== undefined);
  const available = remainingChainBank(chain);
  if (ids.length !== target.slots.length || new Set(ids).size !== ids.length
    || ids.some((id) => !available.some((answer) => answer.id === id))
    || !isComplete(target, placementTexts(available, placements))) return chain;
  return { ...chain, completed: [...chain.completed, { ...placements }] };
}
