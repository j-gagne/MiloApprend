import { test, expect } from '@playwright/test';
import { mockSpeech } from './legacy-speech-mock';
import { generateCompleteWordSession } from '../../src/game/complete-word-session';

test.beforeEach(async ({ page }) => { await mockSpeech(page); });

test('partie tactile complète, erreur douce, annulation et sauvegarde', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Milo apprend.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/home-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.getByRole('button', { name: 'Choisir na', exact: true }).tap();
  await expect(page.getByRole('status')).toHaveText('Essaie un autre morceau !');
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
  await page.screenshot({ path: 'test-results/game-mobile.png' });

  const session = await context.newCDPSession(page);
  const tile = await page.getByRole('button', { name: 'Choisir ne', exact: true }).boundingBox();
  const slot = await page.getByLabel('Case manquante', { exact: true }).boundingBox();
  if (!tile || !slot) throw new Error('Blocs introuvables');
  const from = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
  const to = { x: slot.x + slot.width / 2, y: slot.y + slot.height / 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 20, y: from.y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await expect(page.getByLabel('Case manquante', { exact: true })).toHaveText('?');

  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [to] });
  await expect(page.locator('.drag-ghost')).toBeVisible();
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('status')).toContainText('Bravo ! lune');
  for (const [answer, word] of [['la', 'lama'], ['a', 'ami'], ['lo', 'vélo'], ['ni', 'nid']]) {
    const button = page.getByRole('button', { name: `Choisir ${answer}`, exact: true });
    await expect(button).toBeEnabled();
    await button.tap();
    await expect(page.getByRole('status')).toContainText(`Bravo ! ${word}`);
  }
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '5');
  await expect(page.getByLabel('Étoiles : 4 sur 5')).toBeVisible();
  // Include the existing first-segment audio hints; the pedagogical audio engine is unchanged.
  expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual([
    'lune', 'lune', 'lune', 'la', 'comme dans', 'lama', 'la', 'comme dans', 'lama',
    'a', 'comme dans', 'ami', 'a', 'comme dans', 'ami', 'vélo', 'vélo',
    'ni', 'comme dans', 'nid', 'ni', 'comme dans', 'nid',
  ]);
  await page.screenshot({ path: 'test-results/celebration-mobile.png' });
  await page.reload();
  await expect(page.getByText('1 aventure terminée')).toBeVisible();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
  expect(errors).toEqual([]);
});

test('clavier, sortie durant le délai de réussite et petit écran', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'JOUER', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Choisir ne', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('status')).toContainText('Bravo ! lune');
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
  await page.waitForTimeout(2100);
  await expect(page.getByRole('heading', { name: 'Milo apprend.' })).toBeVisible();
  await expect(page.getByText('Ta première aventure t’attend !')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('stockage indisponible : la partie reste jouable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Stockage désactivé'); };
    Storage.prototype.setItem = () => { throw new Error('Stockage désactivé'); };
  });
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  const expected = generateCompleteWordSession(undefined, { random: () => 0.999, strategy: { size: 6, recentCount: 4 } }).challenges;
  for (const challenge of expected) {
    for (const slot of challenge.slots) {
      const button = page.getByRole('button', { name: `Choisir ${slot.expected}`, exact: true }).first();
      await expect(button).toBeEnabled();
      await button.tap();
    }
    await page.clock.runFor(2100);
  }
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
  await expect(page.getByText(/La sauvegarde est indisponible/)).toBeVisible();
});

test('affichage tablette et ordinateur, glissement à la souris', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await mockSpeech(page);
  await page.goto('http://localhost:5173');
  await page.screenshot({ path: 'test-results/home-desktop.png' });
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  const tile = await page.getByRole('button', { name: 'Choisir ne', exact: true }).boundingBox();
  const slot = await page.getByLabel('Case manquante', { exact: true }).boundingBox();
  if (!tile || !slot) throw new Error('Blocs introuvables');
  await page.mouse.move(tile.x + tile.width / 2, tile.y + tile.height / 2);
  await page.mouse.down();
  await page.mouse.move(slot.x + slot.width / 2, slot.y + slot.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('status')).toContainText('Bravo ! lune');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: 'test-results/game-tablet.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
