import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';
import type { Progress } from '../../src/services/progress';

async function setup(page: Page) {
  await mockSpeech(page);
  await page.addInitScript(data => {
    if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data));
  }, chainParentData(1));
  await page.goto('/'); await page.clock.install();
}
async function select(page: Page, name: string) {
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).tap();
  await page.getByRole('button', { name, exact: true }).tap();
  await page.getByRole('button', { name: 'Continuer', exact: true }).tap();
}
async function state(page: Page): Promise<Progress> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!));
}
async function complete(page: Page) {
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  for (const text of ['la','ma']) await page.getByRole('button', { name: `Choisir ${text}`, exact: true }).tap();
  await page.clock.runFor(2200);
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
  await page.getByRole('button', { name: 'DÉCOUVRIR MON ŒUF' }).tap();
}
async function checkEgg(page: Page, animal: string, stage: number) {
  await expect(page.locator('.hatching-egg')).toHaveAttribute('data-stage', String(stage));
  await expect(page.getByTestId('hatching-animal').locator(`svg.${animal}`)).toHaveCount(1);
  await expect(page.locator('.hatching-egg stop').first()).toHaveAttribute('stop-color', animal === 'rabbit' ? '#fff8eb' : '#fff5d9');
  expect((await state(page)).eggRewards!.currentEgg.pendingAnimalId).toBe(animal);
}

test('real Rabbit stages 1–5 persist, match preview and allow switching only for the next egg', async ({ page }) => {
  await setup(page); await select(page, 'Lapin');
  const images = new Map<number, Buffer>();
  for (let n = 1; n <= 5; n++) {
    await complete(page); await checkEgg(page, 'rabbit', n);
    await expect(page.locator('.hatch-controls')).toHaveCount(0);
    const saved = await state(page);
    expect(saved.eggRewards!.hatches).toHaveLength(n === 5 ? 1 : 0);
    if (n >= 3) {

      images.set(n, await page.locator('.hatching-egg').screenshot());
      await page.screenshot({ path: `test-results/production-rabbit-${n}.png`, fullPage: true });
    }
    await page.reload(); await checkEgg(page, 'rabbit', n);
    expect(await state(page)).toEqual(saved);
    await page.getByRole('button', { name: 'CONTINUER', exact: false }).tap();
    await expect(page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' })).toHaveCount(n === 5 ? 1 : 0);
  }
  expect((await state(page)).eggRewards!.currentEgg).toMatchObject({ pendingAnimalId: 'rabbit', progress: 0 });
  await select(page, 'Dinosaure');
  const rewards = (await state(page)).eggRewards!;
  expect(rewards.hatches[0].animalId).toBe('rabbit');
  expect(rewards.currentEgg).toMatchObject({ pendingAnimalId: 'dinosaur', progress: 0 });
  await complete(page); await checkEgg(page, 'dinosaur', 1);
  const saved = await state(page);
  await page.goto('/?preview=hatching');
  await page.getByLabel('Animal à prévisualiser').selectOption('rabbit');
  for (const [n, image] of images) {
    await page.getByRole('button', { name: 'État ' + n, exact: true }).click();
    expect(await page.locator('.hatching-egg').screenshot()).toEqual(image);
  }
  expect(await state(page)).toEqual(saved);
});

test('two real Rabbit cycles award two distinct instances without duplicate rewards after refresh', async ({ page }) => {
  await setup(page); await select(page, 'Lapin');
  for (let n = 1; n <= 10; n++) {
    await complete(page);
    await checkEgg(page, 'rabbit', (n - 1) % 5 + 1);
    await page.getByRole('button', { name: 'CONTINUER', exact: false }).tap();
  }
  const before = await state(page);
  expect(before.eggRewards!.hatches.map(h => h.animalId)).toEqual(['rabbit','rabbit']);
  expect(new Set(before.eggRewards!.hatches.map(h => h.id)).size).toBe(2);
  await page.reload(); expect(await state(page)).toEqual(before);
});
