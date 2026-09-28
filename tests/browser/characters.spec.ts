import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';

for (const mode of ['individual', 'chain'] as const) test(`${mode}: character selection, persistence and movement after an imperfect target`, async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)),
    { ...chainParentData(), gameMode: mode });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.hero-scene').getByRole('img', { name: 'Dinosaure' })).toBeVisible();
  const open = page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE', exact: true });
  await expect(open).toBeVisible(); await open.tap();
  const choices = page.getByLabel('Personnages disponibles').getByRole('button');
  await expect(choices).toHaveCount(5);
  for (const name of ['Dinosaure', 'Lion', 'Singe', 'Tigre', 'Licorne']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dinosaure', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Lion', exact: true }).tap();
  await page.getByLabel('Ton prénom').fill('  Éloïse  ');
  await page.getByRole('button', { name: 'Continuer', exact: true }).tap();
  await expect(page.getByText('Salut Éloïse !')).toBeVisible();
  await expect(open).toBeFocused();
  await expect(page.locator('.hero-scene').getByRole('img', { name: 'Lion' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Salut Éloïse !')).toBeVisible();
  await expect(page.locator('.hero-scene').getByRole('img', { name: 'Lion' })).toBeVisible();
  await open.click();
  await expect(page.getByLabel('Ton prénom')).toHaveValue('Éloïse');
  await expect(page.getByRole('button', { name: 'Lion', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Lion', exact: true })).toContainText('✓ Ton ami');
  await page.keyboard.press('Escape');
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  const marker = page.locator('.character-marker');
  await expect(marker.getByRole('img', { name: 'Lion' })).toBeVisible();
  const first = (await marker.boundingBox())!;
  expect(await marker.evaluate((e) => (e as HTMLElement).style.left)).toBe('0%');
  const bank = page.getByLabel('Morceaux disponibles');
  const choose = (text: string) => bank.getByRole('button', { name: `Choisir ${text}`, exact: true }).first();
  await choose(mode === 'chain' ? 'vo' : 'li').tap();
  await choose('la').tap(); await choose('ma').tap();
  await expect(page.getByLabel('Étoiles : 0 sur 3')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1');
  await expect(page.getByText('Bien joué, Éloïse !')).toBeVisible();
  expect((await marker.boundingBox())!.x).toBeGreaterThan(first.x);
  await expect(marker.locator('.character-happy')).toHaveCount(1);
  // Reduced motion retains the advanced position without the bounce animation.
  expect(await marker.locator('.child-character').evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await marker.locator('.child-character').evaluate((e) => getComputedStyle(e).animationName)).toBe('character-hop');
  expect(await marker.locator('.child-character').evaluate((e) => getComputedStyle(e).animationDuration)).toBe('0.65s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (mode === 'chain') await expect(page.getByLabel('Chaîne : 1 sur 3')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/character-${mode}.png` });
  await page.clock.runFor(2100);
  for (const answers of [['la', 'va'], ['vo', 'ni']]) {
    for (const answer of answers) await choose(answer).tap();
    await page.clock.runFor(2100);
  }
  await expect(page.getByRole('heading', { name: 'Bravo Éloïse !' })).toBeVisible();
  await expect(page.locator('.celebration-screen > .child-character')).toHaveAttribute('data-character', 'lion');
  expect(await marker.evaluate((e) => (e as HTMLElement).style.left)).toBe('100%');
  await page.getByRole('button', { name: 'REJOUER', exact: true }).tap();
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).tap();
  await expect(page.getByText('Salut Éloïse !')).toBeVisible();
  await page.reload();
  await expect(page.locator('.hero-scene').getByRole('img', { name: 'Lion' })).toBeVisible();
  await expect(page.getByText('1 aventure terminée')).toBeVisible();
});

test('keyboard choice and narrow mobile grid', async ({ page }) => {
  await mockSpeech(page); await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Licorne', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.locator('.hero-scene').getByRole('img', { name: 'Licorne' })).toBeVisible();
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/character-picker.png' });
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
});
