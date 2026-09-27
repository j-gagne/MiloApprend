import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { generateCompleteWordSession } from '../../src/game/complete-word-session';
import { seededRandom } from '../helpers/random';

async function setSeed(page: Page, seed: number) {
  await page.evaluate((seed) => {
    let state = seed >>> 0;
    Math.random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  }, seed);
}

test('deux nouvelles parties mobiles sélectionnent réellement des mots différents', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mockSpeech(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/?debugContent=1');
  await page.clock.install();
  const sessions: string[][] = [];
  for (const [round, seed] of [13, 42].entries()) {
    await setSeed(page, seed);
    await page.getByRole('button', { name: round === 0 ? 'JOUER' : 'REJOUER', exact: true }).tap();
    const expected = generateCompleteWordSession(undefined, { random: seededRandom(seed) }).challenges;
    const words: string[] = [];
    for (const [index, challenge] of expected.entries()) {
      const debug = page.getByRole('complementary', { name: 'Diagnostic contenu' });
      await expect(debug).toContainText(`mot : ${challenge.word}`);
      await expect(debug).toContainText(`source : ${challenge.source}`);
      await expect(debug).toContainText(`introduit : semaine ${challenge.introducedInWeek}`);
      await expect(debug).toContainText(`segmentation : ${challenge.segments.join(' + ')}`);
      await expect(debug).toContainText(challenge.slots.length > 1
        ? `segments manquants : ${challenge.slots.map((slot) => slot.expected).join(' + ')}`
        : `segment manquant : ${challenge.slots[0].expected}`);
      words.push(challenge.word);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const fits = await page.locator('.word-segments').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return [...element.children].every((child) => {
          const box = child.getBoundingClientRect();
          return box.left >= rect.left - 1 && box.right <= rect.right + 1;
        });
      });
      expect(fits).toBe(true);
      for (const [slotNumber, targetSlot] of challenge.slots.entries()) {
      const button = page.getByRole('button', { name: `Choisir ${targetSlot.expected}`, exact: true });
      if (index === 0 && round === 0 && slotNumber === 0) {
        await button.scrollIntoViewIfNeeded();
        const tile = await button.boundingBox();
        const slot = await page.getByLabel(challenge.slots.length > 1
          ? `Case ${targetSlot.segmentIndex + 1} à compléter` : 'Case manquante', { exact: true }).boundingBox();
        if (!tile || !slot) throw new Error('Blocs introuvables');
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: slot.x + slot.width / 2, y: slot.y + slot.height / 2 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      } else await button.tap();
      }
      await expect(page.getByRole('status')).toContainText(`Bravo ! ${challenge.word}`);
      await page.clock.runFor(2000);
    }
    expect(new Set(words).size).toBe(5);
    await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
    sessions.push(words);
  }
  expect([...sessions[0]].sort()).not.toEqual([...sessions[1]].sort());
  expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual(sessions.flatMap((words) => words.flatMap((word) => [word, word])));
  expect(errors).toEqual([]);
});

test('debugContent absent du parcours normal et désactivé avec 0', async ({ page }) => {
  await mockSpeech(page);
  for (const url of ['/', '/?debugContent=0']) {
    await page.goto(url);
    await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
    await expect(page.getByRole('complementary', { name: 'Diagnostic contenu' })).toHaveCount(0);
  }
});
