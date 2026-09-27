import type { Page } from '@playwright/test';
import { mockSpeech as speech } from './speech-mock';
import { initialProgram } from '../../src/content/program';
import { automaticActivities } from '../../src/content/activity-catalog';
import { emptyParentData } from '../../src/parent/model';
export const legacyData = { ...emptyParentData(), questionCount: 5, activityEnabled: Object.fromEntries(automaticActivities(initialProgram, 5).map((activity) => [activity.id, false])) };
// Scénarios de gestes/audio V1.2 : mêmes activités explicites, overrides Parent réels.
export async function mockSpeech(page: Page, languages?: string[], ends?: boolean) {
  await speech(page, languages, ends);
  await page.addInitScript((data) => {
    try {
      if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data));
    } catch { /* Le scénario de stockage bloqué vérifie le repli réel de l'application. */ }
  }, legacyData);
}
