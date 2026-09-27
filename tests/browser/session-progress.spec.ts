import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { sessionParentData } from '../fixtures/session-program';
import { chainParentData } from '../fixtures/chain-program';

for (const mode of ['individual', 'chain'] as const) test(`${mode}: six targets, independent progression and stars, mobile`, async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), sessionParentData(mode));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  const global = page.getByRole('progressbar', { name: 'Progression de la session' });
  const bank = page.getByLabel('Morceaux disponibles');
  const choose = (text: string) => bank.getByRole('button', { name: `Choisir ${text}`, exact: true }).first();
  await expect(global).toHaveAttribute('max', '6');
  await expect(global).toHaveAttribute('value', '0');
  const targets = ['lama', 'lavage', 'Il a volé le nid.', 'lune', 'nid', 'ami'];
  const answers = [['la', 'ma'], ['la', 'va'], ['vo', 'ni'], ['ne'], ['ni'], ['a']];
  let stars = 0;
  for (let i = 0; i < targets.length; i++) {
    await expect(page.getByRole('button', { name: `Réécouter ${targets[i]}`, exact: true })).toBeVisible();
    await expect(page.locator('.challenge-card')).toHaveCount(1);
    await expect(global).toHaveAttribute('value', String(i));
    await expect(page.getByLabel(`Étoiles : ${stars} sur 6`)).toBeVisible();
    if (mode === 'chain') {
      await expect(page.getByLabel(`Chaîne : ${i % 3} sur 3`)).toBeVisible();
      expect(await page.locator('.chain-progress').innerText()).not.toContain('★');
    } else await expect(page.locator('.chain-progress')).toHaveCount(0);
    if (i === 0) {
      await choose('la').click();
      await expect(page.getByLabel('Étoiles : 0 sur 6')).toBeVisible(); // Multi-slot, no partial star.
      await page.getByRole('button', { name: 'Retirer la de la case 1' }).click();
      await page.getByRole('button', { name: 'Réécouter lama', exact: true }).click();
    }
    if (i === 1) {
      await choose(mode === 'chain' ? 'vo' : 'li').click();
      await choose(mode === 'chain' ? 'vo' : 'li').click();
      await expect(page.getByLabel('Étoiles : 1 sur 6')).toBeVisible();
    }
    if (mode === 'chain' && i === 3) {
      expect(await bank.getByRole('button').allTextContents()).toEqual(['ne', 'ni', 'a']);
      await expect(choose('vo')).toHaveCount(0); // New chain's bank, no old remaining occurrences.
    }
    for (const answer of answers[i]) await choose(answer).click();
    if (i !== 1) stars++;
    await expect(global).toHaveAttribute('value', String(i + 1));
    await expect(page.getByLabel(`Étoiles : ${stars} sur 6`)).toBeVisible();
    await expect(page.getByLabel('Étoile gagnée')).toHaveCount(i === 1 ? 0 : 1);
    if (mode === 'chain') await expect(page.getByLabel(`Chaîne : ${i % 3 + 1} sur 3`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.clock.runFor(2100);
  }
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
  await expect(page.getByText('6 exercices terminés')).toBeVisible();
  await expect(global).toHaveAttribute('value', '6');
  await expect(page.getByLabel('Étoiles : 5 sur 6')).toBeVisible();
  await expect(page.locator('.chain-progress')).toHaveCount(0);
  await page.screenshot({ path: `test-results/session-performance-${mode}.png` });
  await page.getByRole('button', { name: 'REJOUER', exact: true }).click();
  await expect(global).toHaveAttribute('value', '0');
  await expect(page.getByLabel('Étoiles : 0 sur 6')).toBeVisible();
});

test('insufficient targets use actual denominator and a final single-target chain', async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)),
    { ...chainParentData(), questionCount: 6, chainLength: 2 });
  await page.goto('/'); await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('max', '3');
  await expect(page.getByLabel('Chaîne : 0 sur 2')).toBeVisible();
  for (const answers of [['la', 'ma'], ['la', 'va']]) {
    for (const answer of answers) await page.getByLabel('Morceaux disponibles').getByRole('button', { name: `Choisir ${answer}`, exact: true }).first().click();
    await page.clock.runFor(2100);
  }
  await expect(page.getByLabel('Chaîne : 0 sur 1')).toBeVisible();
  await expect(page.getByLabel('Étoiles : 2 sur 3')).toBeVisible();
});

test('touch placement consumes only the tapped occurrence, not the tile that moves into its place', async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), sessionParentData('individual'));
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/'); await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.getByRole('button', { name: 'Choisir la', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Choisir ma', exact: true })).toHaveCount(1);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
});
