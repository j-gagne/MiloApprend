import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { emptyParentData } from '../../src/parent/model';

test('Sentence image src persistante : aperçu et enfant, phrase sans point dans les blocs', async ({ page }) => {
  await mockSpeech(page);
  const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="30" cy="30" r="25" fill="green"/></svg>');
  const data = { ...emptyParentData(), activeWeek: 6,
    customWeeks: [{ id: 'parent-week-six', number: 6, label: 'Phrase' }], exerciseScope: { mode: 'selected-weeks', selectedWeeks: [6] },
    customUnits: [{ id: 'parent-sentence-image', type: 'sentence', display: 'Il a lu.', audioText: 'Il a lu.', enabled: true, introducedInWeek: 6, tags: ['practice'],
      imageAsset: { src: image, label: 'Illustration de la phrase' }, segmentations: [{ id: 'main', segments: [{ unitId: 'tool-word-Il' }, { unitId: 'letter-a' }, { unitId: 'syllable-lu' }], gaps: ['', ' ', ' ', ''], surface: ['Il', 'a', 'lu'] }] }],
    activities: [{ id: 'parent-activity-image', type: 'complete-segments', targetId: 'parent-sentence-image', segmentationId: 'main', missingSegmentIndexes: [2], distractorUnitIds: ['syllable-ma'] }] };
  await page.addInitScript((data) => { if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)); }, data);
  await page.goto('/'); await page.reload();
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const prompt = await page.getByTestId('gate-prompt').innerText();
  for (const [i, name] of prompt.split(' — ').entries()) await page.getByLabel(`Chiffre ${i + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name: 'Exercices', exact: true }).click();
  await page.getByRole('article', { name: 'Exercice Il a lu. variante 1', exact: true }).getByRole('button', { name: 'Modifier l’exercice' }).click();
  const media = page.getByRole('img', { name: 'Illustration de la phrase', exact: true });
  await expect(media).toBeVisible(); await expect(media.locator('img')).toHaveAttribute('src', image);
  await expect.poll(() => media.locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.sentence-line')).toHaveText('Il a ?.');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click(); await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.getByRole('button', { name: 'JOUER', exact: true }).click(); await expect(media).toBeVisible();
  await page.getByRole('button', { name: 'Choisir lu', exact: true }).click(); await expect(page.locator('.sentence-line')).toHaveText('Il a lu.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
});
