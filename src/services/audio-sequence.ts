export const SEGMENT_PAUSE_MS = 400;
export const WHOLE_WORD_PAUSE_MS = 600;
export interface AudioStep { readonly text: string; readonly src?: string; readonly pauseAfter?: number }

// Scheduling only: speech/voice/mobile setup remains in the existing audio adapter.
export class AudioSequence {
  private cancelCurrent?: () => void;

  cancel() { this.cancelCurrent?.(); this.cancelCurrent = undefined; }

  play<Step extends AudioStep>(steps: readonly Step[], speak: (step: Step & AudioStep) => Promise<void>): Promise<void> {
    this.cancel();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let releasePause: (() => void) | undefined;
    let resolve!: () => void;
    const result = new Promise<void>((done) => { resolve = done; });
    const cancel = () => {
      cancelled = true;
      clearTimeout(timer);
      releasePause?.();
      resolve();
    };
    this.cancelCurrent = cancel;
    const run = async () => {
      try {
        for (const step of steps) {
          if (cancelled) break;
          await speak(step); // First speak is invoked synchronously by the original tap.
          if (cancelled) break;
          if (step.pauseAfter) await new Promise<void>((done) => {
            releasePause = done;
            timer = setTimeout(done, step.pauseAfter);
          });
        }
      } finally {
        if (this.cancelCurrent === cancel) this.cancelCurrent = undefined;
        resolve();
      }
    };
    void run().catch(() => {}); // Audio is optional; a failed adapter never crashes the game.
    return result;
  }
}
