// Baseline V1.2 : mêmes 22 exercices explicites, les nouvelles variantes sont désactivées
// via les overrides publics. Les tests V1.3 vérifient séparément le pool complet par défaut.
import { automaticActivities } from '../../src/content/activity-catalog.ts';
import { createContentRepository } from '../../src/content/repository.ts';
import { contentService, createContentService, type ContentService } from '../../src/content/service.ts';
import { getCompleteWordChallenges as allChallenges } from '../../src/game/complete-word-content.ts';
import { generateCompleteWordSession as allSession, type SessionOptions } from '../../src/game/complete-word-session.ts';
export function explicitService(service: ContentService = contentService, week = service.activeWeek): ContentService {
  const program = service.getProgram();
  return createContentService(createContentRepository({ ...program, activityEnabled: { ...program.activityEnabled,
    ...Object.fromEntries(automaticActivities(program, week).map((a) => [a.id, false])) } }), week, service.exerciseScope);
}
export function getCompleteWordChallenges(service: ContentService = contentService, week = service.activeWeek) {
  return allChallenges(explicitService(service, week), week);
}
export function generateCompleteWordSession(service: ContentService = contentService, options: SessionOptions = {}) {
  return allSession(explicitService(service), options);
}
