import type { ContentService } from '../content/service.ts';
import type { RandomSource } from './complete-word-session.ts';
import { DEFAULT_QUESTION_COUNT, type PlaySettings } from './play-settings.ts';

/** Select pages once, without repetition, using the game's recent/review proportions. */
export function createReadingSession(service: ContentService, settings: PlaySettings = {}, random: RandomSource = Math.random) {
  const { exercises, issues } = service.getReadingExercises();
  const size = settings.questionCount ?? DEFAULT_QUESTION_COUNT;
  const shuffle = <T,>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const latest = Math.max(...exercises.map(exercise => exercise.introducedInWeek));
  const recentCount = Math.ceil(size * 3 / 5);
  const recent = shuffle(exercises.filter(exercise => exercise.introducedInWeek === latest));
  const review = shuffle(exercises.filter(exercise => exercise.introducedInWeek < latest));
  const picked = [...recent.slice(0, recentCount), ...review.slice(0, size - recentCount)];
  picked.push(...shuffle(exercises.filter(exercise => !picked.includes(exercise))).slice(0, size - picked.length));
  return { exercises: shuffle(picked), issues };
}
