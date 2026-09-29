import { test, expect } from '@playwright/test';

import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';

test('Rabbit shares all five masks and preview leaves the profile untouched', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?preview=hatching');
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page.getByLabel('Animal à prévisualiser').selectOption('rabbit');
  for (const stage of [1,2,3,4,5]) {
    await page.getByRole('button', { name: `État ${stage}`, exact: true }).click();
    await expect(page.locator('.hatching-egg')).toHaveAttribute('data-stage', String(stage));
    await expect(page.getByTestId('hatching-animal').locator('svg.rabbit')).toHaveCount(1);
    await expect(page.locator('.hatching-egg stop').first()).toHaveAttribute('stop-color', '#fff8eb');
    await expect(page.locator('[data-reveal]')).toHaveAttribute('data-reveal', ['hidden','hidden','small','large','full'][stage-1]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/rabbit-stage-${stage}.png`, fullPage: true });
  }
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  await page.getByLabel('Animal à prévisualiser').selectOption('dinosaur');
  await expect(page.getByTestId('hatching-animal').locator('svg.dinosaur')).toHaveCount(1);
  await expect(page.locator('.hatching-egg stop').first()).toHaveAttribute('stop-color', '#fff5d9');
  await page.screenshot({ path: 'test-results/dinosaur-after.png', fullPage: true });
});

test('Rabbit SVG selects, saves and restores across all child avatar locations', async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript(data => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), chainParentData(1));
  await page.goto('/');
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).click();
  const rabbit = page.getByRole('button', { name: 'Lapin', exact: true });
  await expect(rabbit.locator('svg.rabbit')).toBeVisible();
  await expect(rabbit.locator('.character-emoji')).toHaveCount(0);
  await rabbit.tap();
  await page.screenshot({ path: 'test-results/rabbit-picker.png', fullPage: true });
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.reload();
  await page.clock.install();
  await expect(page.locator('.hero-scene svg.rabbit')).toBeVisible();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await expect(page.locator('.character-marker svg.rabbit')).toBeVisible();
  await expect(page.locator('.game-companion svg.rabbit')).toBeVisible();
  for (const answer of ['la','ma']) await page.getByRole('button', { name: `Choisir ${answer}`, exact: true }).tap();
  await expect(page.locator('.game-companion .character-happy svg.rabbit')).toBeVisible();
  await page.clock.runFor(2200);
  await expect(page.locator('.celebration-screen svg.rabbit').last()).toBeVisible();
  await page.screenshot({ path: 'test-results/rabbit-happy.png', fullPage: true });
  await page.getByRole('button', { name: 'DÉCOUVRIR MON ŒUF' }).tap();
  await expect(page.getByTestId('hatching-animal').locator('svg.rabbit')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!).eggRewards.currentEgg.pendingAnimalId)).toBe('rabbit');
});
