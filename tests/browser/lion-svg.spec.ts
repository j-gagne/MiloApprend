import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';

test('Lion SVG registration, mobile expressions and existing egg masks', async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript(data => { if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)); }, chainParentData(1));
  await page.goto('/?preview=hatching');
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page.getByLabel('Animal à prévisualiser').selectOption('lion');
  for (const stage of [1,2,3,4,5]) {
    await page.getByRole('button', { name: `État ${stage}`, exact: true }).click();
    await expect(page.getByTestId('hatching-animal').locator('svg.lion')).toHaveCount(1);
    await expect(page.locator('.hatching-egg stop').first()).toHaveAttribute('stop-color', '#fff5de');
    await expect(page.locator('[data-reveal]')).toHaveAttribute('data-reveal', ['hidden','hidden','small','large','full'][stage-1]);
    if (stage >= 3) await page.screenshot({ path: `test-results/lion-stage-${stage}.png`, fullPage: true });
  }
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  for (const animal of ['dinosaur','rabbit']) {
    await page.getByLabel('Animal à prévisualiser').selectOption(animal);
    await page.screenshot({ path: `test-results/lion-compare-${animal}.png`, fullPage: true });
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).tap();
  const lion = page.getByRole('button', { name: 'Lion', exact: true });
  await expect(lion.locator('svg.lion')).toBeVisible();
  await expect(lion.locator('.character-emoji')).toHaveCount(0);
  await lion.tap();
  await page.screenshot({ path: 'test-results/lion-selector.png', fullPage: true });
  await page.getByRole('button', { name: 'Continuer', exact: true }).tap();
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await expect(page.locator('.game-companion svg.lion')).toBeVisible();
  await page.screenshot({ path: 'test-results/lion-game.png', fullPage: true });
  for (const text of ['la','ma']) await page.getByRole('button', { name: `Choisir ${text}`, exact: true }).tap();
  await expect(page.locator('.game-companion .character-happy svg.lion')).toBeVisible();
  await page.clock.runFor(2200);
  await page.screenshot({ path: 'test-results/lion-happy.png', fullPage: true });
  await page.getByRole('button', { name: 'DÉCOUVRIR MON ŒUF' }).tap();
  await expect(page.getByTestId('hatching-animal').locator('svg.lion')).toHaveCount(1);
  await expect(page.locator('.hatching-egg stop').first()).toHaveAttribute('stop-color', '#fff5de');
});
