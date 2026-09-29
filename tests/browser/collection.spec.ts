import { test, expect } from '@playwright/test';
import { emptyEggRewards } from '../../src/game/egg-rewards';
import { mockSpeech } from './speech-mock';

test('collection displays only individual persisted rewards, in order, without mutation', async ({ page }) => {
  await mockSpeech(page);
  await page.goto('/');
  const open = () => page.getByRole('button', { name: 'MA COLLECTION', exact: true }).tap();
  const home = () => page.getByRole('button', { name: 'RETOUR À L’ACCUEIL' }).tap();
  await open();
  await expect(page.getByText('Fais éclore ton premier œuf pour commencer ta collection !')).toBeVisible();
  await expect(page.locator('.collection-screen svg')).toHaveCount(0);
  await home();
  const animals = ['unicorn', 'dinosaur', 'unicorn', 'rabbit', 'unicorn', 'dinosaur'];
  for (const count of [1, 6, 30]) {
    const eggRewards = emptyEggRewards('rabbit');
    eggRewards.currentEgg.progress = 3;
    eggRewards.hatches = Array.from({ length: count }, (_, n) => ({ id: `earned-${n}`, animalId: animals[n % 6], hatchedAt: '2026-09-29T12:00:00Z' }));
    const saved = JSON.stringify({ completedSessions: count * 5 + 3, selectedCharacterId: 'unicorn', eggRewards });
    await page.evaluate(saved => localStorage.setItem('milo-apprend.progress.v1', saved), saved);
    await page.reload(); await open();
    await expect(page.locator('.collection-count')).toHaveText(`${count} ${count === 1 ? 'animal collectionné' : 'animaux collectionnés'}`);
    await expect(page.locator('.collection-grid li svg')).toHaveCount(count);
    expect(await page.locator('.collection-grid [data-character]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-character')))).toEqual(eggRewards.hatches.map(h => h.animalId));
    expect(await page.locator('.collection-grid li').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-hatch-id')))).toEqual(eggRewards.hatches.map(h => h.id));
    if (count === 6) {
      for (const width of [390, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `test-results/collection-${width}.png`, fullPage: true });
      }
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.reload(); await open();
    await expect(page.locator('.collection-grid li')).toHaveCount(count);
    await page.getByRole('button', { name: 'Milo apprend, accueil' }).tap();
    await expect(page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' })).toHaveCount(0);
    await open(); await home();
    expect(await page.evaluate(() => localStorage.getItem('milo-apprend.progress.v1'))).toBe(saved);
  }
  for (const progress of [0, 1, 2, 4, 5]) {
    await page.evaluate(progress => {
      const saved = JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!);
      saved.eggRewards.currentEgg.progress = progress;
      localStorage.setItem('milo-apprend.progress.v1', JSON.stringify(saved));
    }, progress);
    await page.reload();
    await expect(page.getByRole('button', { name: 'MA COLLECTION', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' })).toHaveCount(progress === 0 ? 1 : 0);
  }
});
