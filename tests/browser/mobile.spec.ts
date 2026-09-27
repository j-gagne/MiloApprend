import { test, expect } from '@playwright/test';
import { mockSpeech } from './legacy-speech-mock';

test('petit iPhone : défilement libre hors blocs, page stable pendant le glissement', async ({ page, context }) => {
  await mockSpeech(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Choisir ne', exact: true }).scrollIntoViewIfNeeded();
  const tile = await page.getByRole('button', { name: 'Choisir ne', exact: true }).boundingBox();
  const slot = await page.getByLabel('Case manquante', { exact: true }).boundingBox();
  if (!tile || !slot) throw new Error('Blocs introuvables');
  const scrollBefore = await page.evaluate(() => scrollY);
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: slot.x + slot.width / 2, y: slot.y + slot.height / 2 }] });
  await expect(page.locator('.drag-ghost')).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 0));
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 8, y: 450 }] });
  for (const y of [400, 350, 300, 250]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 8, y }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test('rebond de mauvaise réponse sans verrou et réduction des animations', async ({ page }) => {
  await mockSpeech(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  const wrong = page.getByRole('button', { name: 'Choisir na', exact: true });
  await wrong.tap();
  expect(await wrong.evaluate((element) => element.getAnimations().length)).toBeGreaterThan(0);
  await expect(wrong).toBeEnabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await wrong.tap();
  expect(await wrong.evaluate((element) => element.getAnimations().length)).toBe(0);
  await page.getByRole('button', { name: 'Choisir ne', exact: true }).tap();
  await expect(page.getByRole('status')).toContainText('lune');
  expect(await page.locator('.dinosaur').evaluate((element) => element.getAnimations().length)).toBe(0);
});
