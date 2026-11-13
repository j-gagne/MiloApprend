import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
for (const empty of [false, true]) test(`Home subjects and navigation, empty=${empty}`, async ({ page }) => {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: { schemaVersion: 1, programId: 'home', defaults: { activeWeek: 10, exerciseScope: { mode: 'all', selectedWeeks: [] } }, weeks: [{ number: 10, label: '10', letters: [], syllables: [], toolWords: [], words: [], sentences: [], mathematics: { numbers: empty ? [] : [11,12,13,14,15] } }] } }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'LECTURE', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'JE LIS', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'MATHS', exact: true }).click();
  await expect(page.getByRole('button', { name: 'JE LIS', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'COMPLÈTE', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'MATHS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.hero-scene').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(215);
  for (const [label, heading] of [['JE RANGE','Je range'], ['NOMBRE MANQUANT','Nombre manquant'], ["J'ÉCOUTE",'J’écoute']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    if (empty) { await expect(page.getByRole('status')).toContainText('Pas de nombres'); }
    else {
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
    }
  }
  await expect(page.getByRole('button', { name: 'MA COLLECTION', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Parents', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'LECTURE', exact: true }).click();
  await page.reload(); await expect(page.getByRole('button', { name: 'JE LIS', exact: true })).toBeVisible();
});
