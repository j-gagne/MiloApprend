import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { emptyParentData } from '../../src/parent/model';

test('cible syllabe : aucune illustration ni hauteur réservée sur mobile et desktop', async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), {
    ...emptyParentData(), activeWeek: 6,
    customWeeks: [{ id: 'parent-week-six', number: 6, label: 'Syllabe' }],
    exerciseScope: { mode: 'selected-weeks', selectedWeeks: [6] },
    customUnits: [{ id: 'parent-syllable-ra', type: 'syllable', display: 'RA', audioText: 'ra',
      introducedInWeek: 6, enabled: true, tags: ['practice'] }],
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Retrouve la syllabe' })).toBeVisible();
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const card = page.locator('.challenge-card');
    await expect(card.locator('.word-image')).toHaveCount(0);
    await expect(card.getByRole('img')).toHaveCount(0);
    await expect(card).not.toContainText('🔤');
    const spaceAboveBlocks = await card.evaluate((element) =>
      element.querySelector('.word-segments')!.getBoundingClientRect().top - element.getBoundingClientRect().top);
    expect(spaceAboveBlocks).toBeLessThan(60);
  }
});
