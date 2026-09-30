import { test, expect, type Page } from '@playwright/test';
import { characterCatalog } from '../../src/game/characters';
import type { Progress } from '../../src/services/progress';
import { chainParentData } from '../fixtures/chain-program';
import { mockSpeech } from './speech-mock';

const key = 'milo-apprend.progress.v1';
async function setup(page: Page) {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.abort());
  await page.addInitScript(data => {
    if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data));
  }, { ...chainParentData(1), gameMode: 'individual' });
}
const stored = (page: Page): Promise<Progress> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);

for (const { id } of characterCatalog) test(`${id}: all variants pass through the real reveal and Collection`, async ({ page }) => {
  await setup(page);
  await page.goto('/');
  const selector = id === 'dinosaur' ? '.hatching-egg' : id === 'monkey' ? '.monkey-banana-scene' : `.${id}-reveal-scene`;
  let normalArms: string | null = null;
  for (const variantId of ['normal', 'sleeping', 'celebrating'] as const) {
    const progress: Progress = { completedSessions: 5, selectedCharacterId: id === 'lion' ? 'tiger' : 'lion', eggRewards: {
      currentEgg: { progress: 5, sessionsToHatch: 5, pendingAnimalId: id, pendingVariantId: variantId },
      completedSessionIds: ['complete'], pendingTransition: { sessionId: 'complete', progress: 5, sessionsToHatch: 5, animalId: id },
      hatches: [{ id: 'hatch:complete', animalId: id, variantId, hatchedAt: '2026-10-01' }],
    } };
    await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key, progress });
    await page.reload();
    const scene = page.locator(selector);
    await expect(scene).toHaveAttribute('data-stage', '5');
    const artwork = scene.locator(`svg.${id}`);
    await expect(artwork).toBeVisible();
    await expect(artwork).toHaveAttribute('data-variant', variantId);
    await expect(artwork.locator('[data-sleeping-eyes] path')).toHaveCount(variantId !== 'sleeping' ? 0 : id === 'dinosaur' ? 1 : 2);
    await expect(artwork.locator('ellipse[rx="7"][ry="10"]')).toHaveCount(variantId === 'sleeping' ? 0 : id === 'dinosaur' ? 1 : 2);
    const revealed = await artwork.innerHTML();
    const arms = await artwork.locator(`path[stroke-width="${id === 'dinosaur' ? 12 : 13}"]`).last().getAttribute('d');
    if (variantId === 'normal') normalArms = arms;
    if (variantId === 'celebrating') expect(arms).not.toBe(normalArms);
    await page.reload();
    expect(await stored(page)).toEqual(progress);
    expect(await artwork.innerHTML()).toBe(revealed);
    await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
    await page.getByRole('button', { name: 'MA COLLECTION', exact: true }).click();
    const collected = page.locator(`.collection-grid svg.${id}`);
    await expect(collected).toHaveAttribute('data-variant', variantId);
    expect(await collected.innerHTML()).toBe(revealed);
  }
});

test('Collection preserves legacy normal, sleeping and duplicate sleeping in order', async ({ page }) => {
  await setup(page);
  await page.goto('/');
  const hatches = [undefined, 'sleeping', 'sleeping', 'normal'].map((variantId, i) => ({ id: `h${i}`, animalId: 'rabbit', variantId, hatchedAt: '2026-10-01' }));
  const progress = { completedSessions: 20, selectedCharacterId: 'rabbit', eggRewards: {
    currentEgg: { progress: 0, sessionsToHatch: 5, pendingAnimalId: 'rabbit' }, completedSessionIds: [], hatches,
  } };
  await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key, progress });
  await page.reload();
  await page.getByRole('button', { name: 'MA COLLECTION', exact: true }).click();
  expect(await page.locator('.collection-grid li').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-hatch-id')))).toEqual(['h0', 'h1', 'h2', 'h3']);
  expect(await page.locator('.collection-grid svg.rabbit').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-variant')))).toEqual(['normal', 'sleeping', 'sleeping', 'normal']);
  await expect(page.getByRole('img', { name: 'Lapin — Dodo', exact: true })).toHaveCount(2);
  expect(await stored(page)).toEqual(JSON.parse(JSON.stringify(progress)));
});

test('new cycle variant is saved before play, survives zero-stage navigation, and fills five sessions unchanged', async ({ page }) => {
  await setup(page);
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  const initial = (await stored(page)).eggRewards!.currentEgg;
  expect(['normal', 'sleeping', 'celebrating']).toContain(initial.pendingVariantId);
  expect(initial.progress).toBe(0);
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  expect((await stored(page)).eggRewards!.currentEgg).toEqual(initial);
  await page.reload();
  for (let stage = 1; stage <= 5; stage++) {
    await page.getByRole('button', { name: 'JOUER', exact: true }).click();
    for (const answer of ['la', 'ma']) await page.getByRole('button', { name: `Choisir ${answer}`, exact: true }).click();
    await page.clock.runFor(2200);
    await page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE', exact: true }).click();
    await expect(page.locator('.hatching-egg svg.dinosaur')).toHaveAttribute('data-variant', initial.pendingVariantId!);
    const saved = await stored(page);
    expect(saved.eggRewards!.currentEgg).toEqual({ ...initial, progress: stage });
    if (stage === 5) expect(saved.eggRewards!.hatches[0]).toMatchObject({ animalId: 'dinosaur', variantId: initial.pendingVariantId });
    await page.reload();
    expect(await stored(page)).toEqual(saved);
    await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
  }
  const next = (await stored(page)).eggRewards!;
  expect(['normal', 'sleeping', 'celebrating'].filter(id => id !== initial.pendingVariantId)).toContain(next.currentEgg.pendingVariantId);
  expect(next.hatches).toHaveLength(1);
});
