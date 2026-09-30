import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';
import { emptyEggRewards, advanceEgg } from '../../src/game/egg-rewards';
import type { Progress } from '../../src/services/progress';

const key = 'milo-apprend.progress.v1';
const stored = (page: Page): Promise<Progress> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
async function setup(page: Page, progress: Progress) {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.abort());
  await page.addInitScript(({ key, progress, parent }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(progress));
    if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(parent));
  }, { key, progress, parent: { ...chainParentData(1), gameMode: 'individual' } });
  await page.goto('/');
}

for (const id of ['lion', 'monkey', 'dinosaur', 'rabbit', 'unicorn', 'tiger']) {
  test(`${id}: production resolves pending animal, independently of selected character`, async ({ page }) => {
    const eggRewards = advanceEgg(emptyEggRewards(id), 'pending', '2026-09-30');
    await setup(page, { completedSessions: 1, selectedCharacterId: 'rabbit', eggRewards });
    const selector = id === 'lion' ? '.lion-reveal-scene' : id === 'monkey' ? '.monkey-banana-scene' : '.hatching-egg';
    await expect(page.locator(selector)).toHaveAttribute('data-stage', '1');
    await expect(page.locator(`${selector} svg.${id}`)).toHaveCount(1);
    expect((await stored(page)).eggRewards).toEqual(eggRewards);
    await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
    await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeVisible();
    expect((await stored(page)).eggRewards?.currentEgg).toEqual(eggRewards.currentEgg);
    expect((await stored(page)).eggRewards?.pendingTransition).toBeUndefined();
    await expect(page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' })).toHaveCount(0);
  });
}

for (const id of ['lion', 'monkey'] as const) {
  test(`${id}: five real sessions, persistence, reload, Continue and duplicate Collection`, async ({ page }) => {
    const previous = { id: 'hatch:previous', animalId: id, hatchedAt: '2026-09-01' };
    await setup(page, { completedSessions: 5, selectedCharacterId: id,
      eggRewards: { ...emptyEggRewards(id), completedSessionIds: ['previous'], hatches: [previous] } });
    await page.clock.install();
    const scene = page.locator(id === 'lion' ? '.lion-reveal-scene' : '.monkey-banana-scene');
    for (let stage = 1; stage <= 5; stage++) {
      await page.getByRole('button', { name: 'JOUER', exact: true }).click();
      for (const answer of ['la', 'ma']) await page.getByRole('button', { name: `Choisir ${answer}`, exact: true }).click();
      await page.clock.runFor(2200);
      await page.getByRole('button', { name: 'DÉCOUVRIR MA SURPRISE' }).click();
      await expect(scene).toHaveAttribute('data-stage', String(stage));
      await expect(page.getByLabel(`Découverte : ${stage} sur 5`, { exact: true })).toBeVisible();
      const progress = await stored(page);
      expect(progress.completedSessions).toBe(5 + stage);
      const rewards = progress.eggRewards!;
      expect(Object.keys(rewards).sort()).toEqual(['completedSessionIds', 'currentEgg', 'hatches', 'pendingTransition']);
      expect(rewards.currentEgg).toEqual({ progress: stage, sessionsToHatch: 5, pendingAnimalId: id });
      expect(rewards.completedSessionIds).toHaveLength(stage + 1);
      expect(rewards.hatches).toHaveLength(stage === 5 ? 2 : 1);
      expect(rewards.hatches[0]).toEqual(previous);
      if (stage === 5) expect(rewards.hatches[1]).toEqual({ id: `hatch:${rewards.pendingTransition!.sessionId}`, animalId: id, hatchedAt: expect.any(String) });
      await page.screenshot({ path: `test-results/production-${id}-${stage}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.reload();
      await expect(scene).toHaveAttribute('data-stage', String(stage));
      expect(await stored(page)).toEqual(progress);
      await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
      await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeVisible();
      expect((await stored(page)).eggRewards?.currentEgg.progress).toBe(stage === 5 ? 0 : stage);
      await expect(page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' })).toHaveCount(stage === 5 ? 1 : 0);
    }
    await page.getByRole('button', { name: 'MA COLLECTION', exact: true }).click();
    await expect(page.locator(`.collection-grid svg.${id}`)).toHaveCount(2);
    await expect(page.locator('.collection-grid [data-layer="foreground"]')).toHaveCount(0);
  });
}

test('monkey: independent motion, complete concealment, static reduced motion and distributed reveals', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?preview=monkey-reveal');
  const scene = page.locator('.monkey-banana-scene');
  const before = await page.evaluate(() => ({ ...localStorage }));
  await expect(scene.locator('[data-layer="monkey"]')).toHaveCSS('visibility', 'hidden');
  expect(await scene.locator('.banana-reaction').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).animationDuration))).toEqual(['9s', '13s', '11s']);
  await scene.evaluate(el => el.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 0; }));
  const still = await scene.screenshot();
  await scene.evaluate(el => el.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 360; }));
  expect(await scene.screenshot()).not.toEqual(still);
  await expect(scene.locator('.banana-upper')).not.toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(scene.locator('.banana-side')).toHaveCSS('transform', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await scene.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(scene.locator('.banana-reaction').first()).toHaveCSS('animation-name', 'none');
  const artwork = await scene.locator('svg.monkey').innerHTML();
  for (const stage of [2, 3, 4, 5]) {
    await page.getByRole('button', { name: `Étape ${stage}`, exact: true }).click();
    await expect(scene.locator('[data-layer="monkey"]')).toHaveCSS('visibility', 'visible');
    await expect(scene.locator('[data-bunch]')).toHaveCount([12, 10, 8, 2, 0][stage - 1]);
    await expect(scene.locator('mask, clipPath')).toHaveCount(0);
    expect(await scene.locator('svg.monkey').innerHTML()).toBe(artwork);
    const coverage = await scene.evaluate(element => {
      const svg = element as SVGSVGElement;
      function shapes(selector: string) {
        return Array.from(svg.querySelectorAll<SVGGeometryElement>(selector)).filter(el => el instanceof SVGGeometryElement)
          .map(el => ({ el, inverse: el.getScreenCTM()!.inverse(), style: getComputedStyle(el) }));
      }
      const monkey = shapes('svg.monkey path, svg.monkey circle, svg.monkey ellipse').filter(({ style }) => style.opacity !== '0.12');
      const bananas = shapes('[data-layer="foreground"] path');
      function contains(items: typeof bananas, x: number, y: number) {
        const point = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!);
        return items.some(({ el, inverse, style }) => {
          const local = point.matrixTransform(inverse);
          return (style.fill !== 'none' && el.isPointInFill(local)) || (style.stroke !== 'none' && el.isPointInStroke(local));
        });
      }
      let total = 0, visible = 0;
      for (let y = 90; y < 330; y += 3) for (let x = 75; x < 325; x += 3) {
        if (contains(monkey, x, y)) { total++; if (!contains(bananas, x, y)) visible++; }
      }
      // Ear, separate crown patch, top/center of each eye, body and foot.
      return { fraction: visible / total, clues: [[151, 164], [234, 105], [209, 142], [209, 152], [261, 138], [261, 148], [195, 268], [241, 316]].map(([x, y]) => !contains(bananas, x, y)) };
    });
    const [minimum, maximum] = [[.10, .15], [.25, .35], [.65, .75], [1, 1]][stage - 2];
    expect(coverage.fraction).toBeGreaterThanOrEqual(minimum);
    expect(coverage.fraction).toBeLessThanOrEqual(maximum);
    expect(coverage.clues).toEqual([
      [true, true, false, false, false, false, false, false],
      [true, true, true, true, false, false, false, false],
      [true, true, true, true, true, true, false, false],
      [true, true, true, true, true, true, true, true],
    ][stage - 2]);
  }
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
});
