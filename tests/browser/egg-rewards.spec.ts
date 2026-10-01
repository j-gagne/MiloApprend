import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';
import type { Progress } from '../../src/services/progress';

const key = 'milo-apprend.progress.v1';
test('initial save failure stays home and JOUER retries the exact pending reward', async ({ page }) => {
  await page.route('**/MiloApprend-Content/**', route => route.abort());
  await setup(page);
  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    let first = true;
    Object.assign(window, { initialReward: undefined });
    Storage.prototype.setItem = function (name, value) {
      if (name === key && first) {
        first = false;
        Object.assign(window, { initialReward: JSON.parse(value).eggRewards.currentEgg });
        Math.random = () => 0;
        throw new DOMException('Storage temporarily unavailable', 'QuotaExceededError');
      }
      return write.call(this, name, value);
    };
  }, key);
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await expect(page.getByText('La sauvegarde est indisponible. La partie n’a pas commencé. Réessaie JOUER.', { exact: true })).toBeVisible();
  await expect(page.locator('.game-screen')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await finish(page);
  const initial = await page.evaluate(() => (window as unknown as { initialReward: NonNullable<Progress['eggRewards']>['currentEgg'] }).initialReward);
  expect(initial.pendingVariantId).toBe('silly');
  const completed = await stored(page);
  expect(completed.eggRewards!.currentEgg).toEqual({ ...initial, progress: 1 });
  expect(completed.completedSessions).toBe(1);
  expect(completed.eggRewards!.completedSessionIds).toHaveLength(1);
  expect(completed.eggRewards!.hatches).toEqual([]);
  await page.reload();
  expect(await stored(page)).toEqual(completed);
});
async function stored(page: Page): Promise<Progress> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
}
async function setup(page: Page) {
  await mockSpeech(page);
  await page.addInitScript(data => {
    if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data));
  }, { ...chainParentData(1), gameMode: 'individual' });
  await page.goto('/');
  await page.clock.install();
}
async function finish(page: Page, mistake = false) {
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  if (mistake) await page.getByRole('button', { name: 'Choisir li', exact: true }).tap();
  for (const answer of ['la', 'ma']) await page.getByRole('button', { name: `Choisir ${answer}`, exact: true }).tap();
  await page.clock.runFor(2200);
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
}

test('five sessions, mistakes allowed, saved hatch before CONTINUER, refresh and next egg', async ({ page }) => {
  await setup(page);
  for (let n = 1; n <= 5; n++) {
    await finish(page, n === 1);
    const completed = await stored(page);
    expect(completed.completedSessions).toBe(n);
    expect(completed.eggRewards!.currentEgg.progress).toBe(n);
    expect(completed.eggRewards!.hatches).toHaveLength(n === 5 ? 1 : 0);
    await page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' }).tap();
    await expect(page.getByLabel(`Éclosion : ${n} sur 5`, { exact: true })).toBeVisible();
    await expect(page.locator('.hatching-egg')).toHaveAttribute('data-stage', String(n));
    await expect(page.locator('.hatch-controls')).toHaveCount(0);
    await expect(page.getByTestId('hatching-animal').locator('svg.dinosaur')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload();
    await expect(page.getByLabel(`Éclosion : ${n} sur 5`, { exact: true })).toBeVisible();
    expect(await stored(page)).toEqual(completed);
    if (n === 5) await page.screenshot({ path: 'test-results/real-hatch-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'CONTINUER' }).tap();
    await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeVisible();
    await expect(page.locator('.challenge-card')).toHaveCount(0);
    expect((await stored(page)).eggRewards!.currentEgg.progress).toBe(n === 5 ? 0 : n);
    await expect(page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' })).toHaveCount(n === 5 ? 1 : 0);
  }
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).tap();
  await page.getByRole('button', { name: 'Licorne', exact: true }).tap();
  await page.getByRole('button', { name: 'Continuer', exact: true }).tap();
  expect((await stored(page)).eggRewards!.currentEgg).toMatchObject({ progress: 0, pendingAnimalId: 'unicorn' });
  await finish(page);
  expect((await stored(page)).eggRewards!.currentEgg.progress).toBe(1);
  expect((await stored(page)).eggRewards!.currentEgg.pendingAnimalId).toBe('unicorn');
  expect((await stored(page)).eggRewards!.hatches).toHaveLength(1);
});

test('character choice follows persisted egg progress, including an abandoned first session', async ({ page }) => {
  await setup(page);
  const choice = page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' });
  async function choose(name: string) {
    await choice.tap();
    await page.getByRole('button', { name, exact: true }).tap();
    await page.getByRole('button', { name: 'Continuer', exact: true }).tap();
  }
  await expect(choice).toBeVisible();
  await choose('Lapin');
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).tap();
  await choose('Licorne');
  expect((await stored(page)).eggRewards!.currentEgg).toMatchObject({ progress: 0, pendingAnimalId: 'unicorn' });
  await page.reload();
  await expect(choice).toBeVisible();
  expect((await stored(page)).selectedCharacterId).toBe('unicorn');
  await finish(page);
  expect((await stored(page)).eggRewards!.currentEgg).toMatchObject({ progress: 1, pendingAnimalId: 'unicorn' });
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).tap();
  await expect(choice).toHaveCount(0);
  await page.reload();
  await expect(choice).toHaveCount(0);
  await page.getByRole('button', { name: 'CONTINUER', exact: true }).tap();
  await expect(choice).toHaveCount(0);
  await page.reload();
  await expect(choice).toHaveCount(0);
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).tap();
  await expect(choice).toHaveCount(0);
  expect((await stored(page)).eggRewards!.currentEgg.pendingAnimalId).toBe('unicorn');
});

test('refresh from results resumes pending transition; preview leaves actual rewards intact', async ({ page }) => {
  await setup(page);
  await finish(page);
  const before = await stored(page);
  await page.reload();
  await expect(page.getByLabel('Éclosion : 1 sur 5')).toBeVisible();
  await page.goto('/?preview=hatching');
  await page.getByRole('button', { name: 'État 5', exact: true }).tap();
  expect(await stored(page)).toEqual(before);
  await page.goto('/');
  await expect(page.getByLabel('Éclosion : 1 sur 5')).toBeVisible();
  await page.getByRole('button', { name: 'CONTINUER' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeVisible();
});

test('completion and acknowledgement can retry failed storage without losing or doubling progress', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, { restoreWrites: () => { Storage.prototype.setItem = original; } });
    Storage.prototype.setItem = function(key, value) { if (key === 'milo-apprend.progress.v1') throw Error('blocked'); original.call(this, key, value); };
  });
  await finish(page);
  await expect(page.getByText(/Garde cette page ouverte/)).toBeVisible();
  await page.evaluate(() => (window as unknown as { restoreWrites(): void }).restoreWrites());
  await page.getByRole('button', { name: 'RÉESSAYER LA SAUVEGARDE' }).tap();
  await expect(page.getByLabel('Éclosion : 1 sur 5')).toBeVisible();
  expect((await stored(page)).completedSessions).toBe(1);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, { restoreWrites: () => { Storage.prototype.setItem = original; } });
    Storage.prototype.setItem = () => { throw Error('blocked'); };
  });
  await page.getByRole('button', { name: 'CONTINUER' }).tap();
  await expect(page.getByText(/Ta surprise reste en attente/)).toBeVisible();
  expect((await stored(page)).eggRewards!.pendingTransition).toBeTruthy();
  await page.evaluate(() => (window as unknown as { restoreWrites(): void }).restoreWrites());
  await page.getByRole('button', { name: 'CONTINUER' }).tap();
  await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeVisible();
  expect((await stored(page)).completedSessions).toBe(1);
});
