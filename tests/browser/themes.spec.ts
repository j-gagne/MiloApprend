import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';
import { characterCatalog } from '../../src/game/characters';

const references = fileURLToPath(new URL('./themes-reference', import.meta.url));
async function setup(page: Page, character = 'dinosaur', mode: 'individual' | 'chain' = 'individual') {
  await mockSpeech(page);
  await page.addInitScript(({ character, parent }) => {
    if (!localStorage.getItem('milo-apprend.progress.v1')) localStorage.setItem('milo-apprend.progress.v1', JSON.stringify({ completedSessions: 0, selectedCharacterId: character, playerName: 'Milo' }));
    localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(parent));
  }, { character, parent: { ...chainParentData(), gameMode: mode } });
  await page.goto('/'); await page.evaluate(() => document.fonts.ready);
}
async function parents(page: Page) {
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const prompt = await page.getByTestId('gate-prompt').innerText();
  for (const [i, name] of prompt.split(' — ').entries()) await page.getByLabel(`Chiffre ${i + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
}
async function finish(page: Page) {
  for (const answers of [['la', 'ma'], ['la', 'va'], ['vo', 'ni']]) {
    for (const answer of answers) await page.getByLabel('Morceaux disponibles').getByRole('button', { name: `Choisir ${answer}`, exact: true }).first().click();
    await page.clock.runFor(2200);
  }
}
for (const width of [390, 1280]) test(`dinosaur reference ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); await setup(page);
  async function capture(name: string) {
    const picture = await page.screenshot({ fullPage: true, animations: 'disabled' });
    const path = join(references, `${width}-${name}.png`);
    if (process.env.MILO_CAPTURE_BASELINE === '1') { mkdirSync(references, { recursive: true }); writeFileSync(path, picture); }
    else {
      // Chromium can round a few antialiased edge channels by 1/255 between runs.
      const difference = await page.evaluate(async ([before, after]) => {
        async function pixels(base64: string) {
          const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
          return { width: image.width, height: image.height, data: ctx.getImageData(0, 0, image.width, image.height).data };
        }
        const a = await pixels(before), b = await pixels(after);
        if (a.width !== b.width || a.height !== b.height) return Infinity;
        let maximum = 0; for (let i = 0; i < a.data.length; i++) maximum = Math.max(maximum, Math.abs(a.data[i] - b.data[i]));
        return maximum;
      }, [readFileSync(path).toString('base64'), picture.toString('base64')]);
      expect(difference, `${name}: unchanged colors/layout, allowing only 1/255 edge rounding`).toBeLessThanOrEqual(1);
    }
  }
  await capture('home');
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).click();
  // Compare the original five-character layout; rabbit is exercised separately below.
  const rabbit = page.locator('.character-choice').filter({ has: page.locator('[data-character="rabbit"]') });
  await rabbit.evaluate((element) => { element.style.display = 'none'; });
  await capture('picker');
  await rabbit.evaluate((element) => { element.style.removeProperty('display'); });
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await parents(page); await capture('parents');
  await page.getByRole('button', { name: 'Retour au jeu' }).click();
  await page.clock.install(); await page.getByRole('button', { name: 'JOUER', exact: true }).click(); await capture('game');
  await finish(page); await capture('celebration');
});

for (const width of [390, 1280]) for (const character of characterCatalog) test(`${character.id} ${width}: saved theme, game, score and Parents`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await setup(page, character.id, width === 390 ? 'chain' : 'individual');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', character.id);
  expect(await root.evaluate((element) => getComputedStyle(element).getPropertyValue('--theme-primary').trim())).toBe(character.theme.primary);
  async function capture(screen: string) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/theme-${character.id}-${width}-${screen}.png`, fullPage: true, animations: 'disabled' });
  }
  await capture('home'); await page.reload();
  await expect(root).toHaveAttribute('data-theme', character.id);
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).click(); await capture('picker');
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await page.clock.install(); await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0'); await capture('game');
  await finish(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '3');
  await expect(page.getByLabel('Étoiles : 3 sur 3')).toBeVisible();
  await expect(root).toHaveAttribute('data-theme', character.id); await capture('celebration');
  await page.getByRole('button', { name: 'Retour à l’accueil', exact: true }).click();
  await parents(page);
  await page.getByRole('button', { name: 'Réglages', exact: true }).click(); await capture('parents');
  await expect(page.getByRole('radio', { name: 'Cibles individuelles', exact: true })).toBeEnabled();
  await expect(root).toHaveAttribute('data-theme', character.id);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!));
  expect(saved).toEqual({ completedSessions: 1, selectedCharacterId: character.id, playerName: 'Milo' });
});

for (const width of [390, 1280]) test(`preview, cancel and confirmation ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); await setup(page);
  const open = page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' });
  await open.click();
  for (const character of characterCatalog) {
    await page.getByRole('button', { name: character.name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', character.id);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dinosaur');
  await open.click();
  await page.getByRole('button', { name: 'Lion', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'lion');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'lion');
  await open.click(); await page.getByRole('button', { name: 'Tigre', exact: true }).click();
  await page.getByRole('button', { name: 'Milo apprend, accueil', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'lion');
  await open.click(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'lion');
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await open.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(open).toBeFocused(); expect(await open.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
});

test('rabbit touch preview, confirmation and refresh preserve character and pink theme', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).tap();
  await page.getByRole('button', { name: 'Lapin', exact: true }).tap();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rabbit');
  expect(await page.locator('html').evaluate((element) => getComputedStyle(element).getPropertyValue('--theme-primary').trim())).toBe('#b45b78');
  await page.getByRole('button', { name: 'Continuer', exact: true }).tap();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rabbit');
  await expect(page.locator('.hero-scene').getByRole('img', { name: 'Lapin' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!).selectedCharacterId)).toBe('rabbit');
  expect(await page.locator('html').evaluate((element) => getComputedStyle(element).getPropertyValue('--theme-primary').trim())).toBe('#b45b78');
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await expect(page.locator('[data-character="rabbit"]').first()).toBeVisible();
  await finish(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '3');
  await expect(page.locator('.character-happy[data-character="rabbit"]').first()).toBeVisible();
});
