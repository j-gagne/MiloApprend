import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';
import { spellParentData } from '../fixtures/spell-program';
import { REMOTE_PROGRAM_URL } from '../../src/content/remote-program';
import { themes } from '../../src/game/themes';

declare global { interface Window { readingUtterances: SpeechSynthesisUtterance[] } }

async function setup(page: Page, target: 'lama' | 'lavage' | 'spell', missing: number[], character: keyof typeof themes = 'dinosaur') {
  await mockSpeech(page, ['fr-CA'], false, true);
  await page.route(REMOTE_PROGRAM_URL, route => route.abort());
  const base = chainParentData();
  const activity = base.activities.find(a => a.targetId === `parent-word-chain-${target}`)!;
  const data = target === 'spell' ? spellParentData('individual', missing) : {
    ...base, gameMode: 'individual', activities: [{ ...activity, missingSegmentIndexes: missing }],
    activityEnabled: { ...base.activityEnabled, ...Object.fromEntries(base.activities.map(a => [a.id, a.id === activity.id])) },
  };
  await page.addInitScript(data => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), data);
  await page.addInitScript(selectedCharacterId => localStorage.setItem('milo-apprend.progress.v1', JSON.stringify({ completedSessions: 0, selectedCharacterId })), character);
  await page.goto('/');
  await page.clock.install();
  await page.evaluate(() => {
    window.readingUtterances = [];
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = utterance => {
      window.readingUtterances.push(utterance);
      const start = utterance.onstart;
      utterance.onstart = null;
      speak(utterance);
      utterance.onstart = start;
    };
  });
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
}
async function event(page: Page, type: 'start' | 'end' | 'error', index?: number) {
  await page.evaluate(({ type, index }) => {
    const utterance = index === undefined ? window.readingUtterances.at(-1)! : window.readingUtterances[index];
    utterance.dispatchEvent(new Event(type));
  }, { type, index });
}

const borderColor = (character: keyof typeof themes) => `rgb(${themes[character].primary.slice(1).match(/../g)!.map(hex => parseInt(hex, 16)).join(', ')})`;

for (const [word, index, text, character] of [['lama', 0, 'la', 'dinosaur'], ['lama', 1, 'ma', 'rabbit'], ['lavage', 1, 'va', 'unicorn']] as const) {
  test(`${word} segment ${index}: border follows isolated speech events only, including replay`, async ({ page }) => {
    await setup(page, word, [index], character);
    const active = page.locator('.active-reading-segment');
    const slot = page.locator('.word-slot');
    const appearance = () => slot.evaluate(el => {
      const css = getComputedStyle(el), rect = el.getBoundingClientRect();
      return { fill: css.backgroundColor, transform: css.transform, width: rect.width, height: rect.height };
    });
    const before = await appearance();
    const normalColor = await slot.evaluate(el => getComputedStyle(el).borderColor);
    await expect(slot).toHaveCSS('border-style', 'dashed');
    await expect(active).toHaveCount(0);
    await page.clock.runFor(700);
    await expect(active).toHaveCount(0);
    await event(page, 'start');
    await expect(active).toHaveCount(1);
    await expect(slot).toHaveClass(/active-reading-segment/);
    await expect(page.locator('.word-segments > *').nth(index).locator('.word-slot')).toHaveClass(/active-reading-segment/);
    await expect(slot).toHaveCSS('border-width', '5px');
    await expect(slot).toHaveCSS('border-style', 'solid');
    await expect(slot).toHaveCSS('border-color', borderColor(character));
    expect(await appearance()).toEqual(before);
    await page.clock.runFor(1100);
    await expect(active).toHaveCount(1);
    await event(page, 'end');
    await expect(active).toHaveCount(0);
    await expect(slot).toHaveCSS('border-width', '3px');
    await expect(slot).toHaveCSS('border-style', 'dashed');
    await expect(slot).toHaveCSS('border-color', normalColor);
    for (const expected of ['comme dans', word]) {
      expect(await page.evaluate(() => window.readingUtterances.at(-1)!.text)).toBe(expected);
      await event(page, 'start');
      await expect(active).toHaveCount(0);
      await event(page, 'end');
    }
    expect(await page.evaluate(() => window.speechProbe.calls.map(c => c.text))).toEqual([text, 'comme dans', word]);
    for (const rate of await page.evaluate(() => window.readingUtterances.map(u => u.rate))) expect(rate).toBeCloseTo(0.6);
    await page.getByRole('button', { name: `Réécouter ${word}`, exact: true }).click();
    await expect(active).toHaveCount(0);
    await event(page, 'start');
    await expect(active).toHaveCount(1);
    await event(page, 'error');
    await expect(active).toHaveCount(0);
    await page.getByRole('button', { name: `Réécouter ${word}`, exact: true }).click();
    await event(page, 'start');
    await expect(active).toHaveCount(1);
    await page.getByRole('button', { name: 'Couper le son', exact: true }).click();
    await expect(active).toHaveCount(0);
    await event(page, 'start'); // A late event after cancellation must not restore the border.
    await expect(active).toHaveCount(0);
  });
}

for (const target of ['lama', 'spell'] as const) test(`${target}: no active reading for multiple missing segments or spelling`, async ({ page }) => {
  await setup(page, target, target === 'spell' ? [1] : [0, 1]);
  await event(page, 'start');
  await expect(page.locator('.active-reading-segment')).toHaveCount(0);
  expect(await page.evaluate(() => window.speechProbe.calls.map(c => c.text))).toEqual(['lama']);
  await event(page, 'end');
  await page.getByRole('button', { name: 'Réécouter lama', exact: true }).click();
  await event(page, 'start');
  await expect(page.locator('.active-reading-segment')).toHaveCount(0);
  expect(await page.evaluate(() => window.speechProbe.calls.map(c => c.text))).toEqual(['lama', 'lama']);
});

for (const target of ['lama', 'filled', 'spell'] as const) test(`Découpe ${target}: real button maps each emission to its displayed block, excluding spell`, async ({ page }) => {
  await setup(page, target === 'spell' ? 'spell' : 'lama', [1], 'rabbit');
  if (target === 'filled') await page.getByRole('button', { name: 'Choisir ma', exact: true }).click();
  await page.getByRole('button', { name: 'Découper lama', exact: true }).click();
  const blocks = [page.locator('.word-segment').first(), page.locator('.word-slot').first()];
  for (const [index, text] of ['la', 'ma'].entries()) {
    const fill = await blocks[index].evaluate(el => getComputedStyle(el).backgroundColor);
    expect(await page.evaluate(() => window.readingUtterances.at(-1)!.text)).toBe(text);
    await expect(page.locator('.active-reading-segment')).toHaveCount(0);
    await event(page, 'start');
    if (target !== 'spell') {
      await expect(page.locator('.active-reading-segment')).toHaveCount(1);
      await expect(blocks[index]).toHaveClass(/active-reading-segment/);
      await expect(blocks[index]).toHaveCSS('border', `5px solid ${borderColor('rabbit')}`);
      await expect(blocks[index]).toHaveCSS('background-color', fill);
      await expect(blocks[index]).toHaveCSS('transform', 'none');
    } else await expect(page.locator('.active-reading-segment')).toHaveCount(0);
    await event(page, 'end');
    await expect(page.locator('.active-reading-segment')).toHaveCount(0);
    await page.clock.runFor(index === 0 ? 400 : 600);
  }
  expect(await page.evaluate(() => window.readingUtterances.at(-1)!.text)).toBe('lama');
  await event(page, 'start');
  await expect(page.locator('.active-reading-segment')).toHaveCount(0);
  await event(page, 'end');
  await expect(page.locator('.active-reading-segment')).toHaveCount(0);
  if (target !== 'spell') {
    await expect(blocks[0]).toHaveCSS('border-style', 'none');
    await expect(blocks[1]).toHaveCSS('border-style', target === 'filled' ? 'solid' : 'dashed');
  }
  for (const rate of await page.evaluate(() => window.readingUtterances.slice(-3).map(u => u.rate))) expect(rate).toBeCloseTo(0.45);
});
