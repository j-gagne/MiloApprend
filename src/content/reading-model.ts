import type { ReadingExercise } from '../game/reading-session.ts';

/** Reading configuration references the shared bank, never a completion construction. */
export interface ReadingExerciseDefinition {
  readonly id: string;
  /** Optional legacy whole-page target; omit for independent displayed targets. */
  readonly targetId?: string;
  readonly enabled?: boolean;
  /** Omitted: display and pronounce the whole target as one segment. */
  readonly displayedUnits?: readonly {
    readonly unitId: string;
    /** Explicit Unicode character offsets [start, end) into a shared Sentence.display. */
    readonly range?: readonly [number, number];
    /** Omitted: one segment for the referenced display (excluding terminal punctuation). */
    readonly segmentUnitIds?: readonly string[];
  }[];
}

/** Directly consumable by the existing Reading screen/session. */
export interface ProgramReadingExercise extends ReadingExercise {
  readonly targetId?: string;
  readonly introducedInWeek: number;
}

/** Use this ID in an explicit definition to replace the generated whole-word exercise. */
export const wholeWordReadingId = (targetId: string): string => `reading:whole:${targetId}`;
