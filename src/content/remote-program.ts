import { initialProgram } from './program.ts';
import { buildSeedProgram, type SeedWeek } from './seed-bank.ts';
import type { LearningProgram } from './model.ts';
import { validateProgram } from './validation.ts';
import { isReadingExerciseDefinition } from './reading-catalog.ts';

export const REMOTE_PROGRAM_URL = 'https://raw.githubusercontent.com/j-gagne/MiloApprend-Content/refs/heads/main/program.json';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

function validDefaults(value: unknown, weeks: readonly SeedWeek[]): boolean {
  const knownWeek = (week: unknown) => typeof week === 'number' && Number.isSafeInteger(week)
    && week > 0 && weeks.some(item => item.number === week);
  return value === undefined || (object(value) && knownWeek(value.activeWeek)
    && object(value.exerciseScope) && ['all', 'selected-weeks'].includes(String(value.exerciseScope.mode))
    && Array.isArray(value.exerciseScope.selectedWeeks) && value.exerciseScope.selectedWeeks.every(knownWeek));
}

const validReadingExercises = (value: unknown): boolean => value === undefined
  || (Array.isArray(value) && value.every(isReadingExerciseDefinition));

function validPayload(value: unknown): value is { schemaVersion: 1; programId: string; weeks: SeedWeek[];
  defaults?: LearningProgram['defaults']; readingExercises?: LearningProgram['readingExercises'] } {
  return object(value) && value.schemaVersion === 1 && typeof value.programId === 'string'
    && value.programId.trim().length > 0 && validReadingExercises(value.readingExercises)
    && Array.isArray(value.weeks) && value.weeks.length > 0
    && value.weeks.every(week => object(week) && typeof week.number === 'number' && Number.isFinite(week.number)
      && typeof week.label === 'string' && validReadingExercises(week.readingExercises)
      && ['letters', 'syllables', 'toolWords', 'words', 'sentences', 'graphemes'].every(key => {
        const entries = week[key];
        if (key === 'graphemes' && entries === undefined) return true;
        return Array.isArray(entries) && entries.every(entry =>
          (key !== 'words' && key !== 'sentences' && typeof entry === 'string')
          || (object(entry) && typeof entry.id === 'string' && typeof entry.display === 'string'));
      }));
}

export async function loadBaseProgram(fetcher: typeof fetch = fetch, timeoutMs = 5000,
  build: typeof buildSeedProgram = buildSeedProgram): Promise<LearningProgram> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const remote = async () => {
      const response = await fetcher(REMOTE_PROGRAM_URL, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('HTTP response not OK');
      const payload: unknown = await response.json();
      if (!validPayload(payload)) throw new Error('Invalid remote program');
      if (!validDefaults(payload.defaults, payload.weeks)) throw new Error('Invalid program defaults');
      const built = build(payload.programId, payload.weeks);
      const program: LearningProgram = { ...built,
        ...(payload.defaults === undefined ? {} : { defaults: payload.defaults }),
        ...(payload.readingExercises === undefined ? {} : { readingExercises: [
          ...(built.readingExercises ?? []), ...payload.readingExercises,
        ] }),
      };
      // Reuse existing checks inside the fallback boundary (malformed nested content may throw).
      validateProgram(program);
      return program;
    };
    const program = await Promise.race([remote(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Remote program timeout')); }, timeoutMs);
    })]);
    console.info('[Milo] Loaded remote program');
    return program;
  } catch {
    console.info('[Milo] Using bundled program fallback');
    return initialProgram;
  } finally { clearTimeout(timer); }
}
