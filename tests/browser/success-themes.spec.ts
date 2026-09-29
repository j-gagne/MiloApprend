import { test, expect } from '@playwright/test';
import { characterCatalog } from '../../src/game/characters';
import { emptyEggRewards } from '../../src/game/egg-rewards';
import { chainParentData } from '../fixtures/chain-program';
import { spellParentData } from '../fixtures/spell-program';
import { mockSpeech } from './speech-mock';

test('all playable success themes, including Spell, ignore the animal in the egg', async ({ page }) => {
  await mockSpeech(page);
  await page.goto('/');
  await page.clock.install();
  const rgb = (hex: string) => `rgb(${hex.slice(1).match(/../g)!.map(v => parseInt(v, 16)).join(', ')})`;
  for (const { id, theme } of characterCatalog) {
    for (const spell of [false, true]) {
      const eggRewards = emptyEggRewards(id === 'rabbit' ? 'dinosaur' : 'rabbit');
      eggRewards.currentEgg.progress = 3;
      await page.evaluate(({ id, eggRewards, data }) => {
        localStorage.setItem('milo-apprend.progress.v1', JSON.stringify({ completedSessions: 3, selectedCharacterId: id, eggRewards }));
        localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data));
      }, { id, eggRewards, data: spell ? spellParentData() : chainParentData(1) });
      await page.reload();
      await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
      for (const text of spell ? ['l','a','m','a'] : ['la','ma']) {
        await page.getByRole('button', { name: `Choisir ${text}`, exact: true }).first().tap();
        await expect(page.locator('.word-slot.filled').first()).toHaveCSS('background-color', rgb(theme['success-bg']));
      }
      const slots = page.locator('.word-slot.filled');
      await expect(slots).toHaveCount(spell ? 4 : 2);
      for (const slot of await slots.all()) {
        await expect(slot).toHaveCSS('background-color', rgb(theme['success-bg']));
        await expect(slot).toHaveCSS('border-top-color', rgb(theme['success-border']));
        await expect(slot).toHaveCSS('color', rgb(theme['success-text']));
      }
      await expect(page.locator('.is-solved .feedback')).toHaveCSS('color', rgb(theme['success-feedback']));
      await expect(page.locator('.is-solved .feedback strong')).toHaveCSS('color', rgb(theme['success-word']));
      await expect(page.locator('.is-solved')).toHaveCSS('border-top-color', rgb(theme['success-surface-border']));
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!).eggRewards.currentEgg.pendingAnimalId)).toBe(eggRewards.currentEgg.pendingAnimalId);
      await page.screenshot({ path: `test-results/success-${id}-${spell ? 'spell' : 'word'}.png`, fullPage: true });
    }
  }
});
