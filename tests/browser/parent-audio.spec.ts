import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';

async function openAudio(page: Page) {
  await mockSpeech(page);
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)),
    { ...chainParentData(), readingSpeed: 'fast' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const prompt = await page.getByTestId('gate-prompt').innerText();
  for (const [index, name] of prompt.split(' — ').entries()) {
    await page.getByLabel(`Chiffre ${index + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  }
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('button', { name: 'Test audio', exact: true }).click();
  await page.clock.install();
}
const texts = (page: Page) => page.evaluate(() => window.speechProbe.calls.map((call) => call.text));

test('Parent OLIVE shows actual construction/texts and uses game speech and Parent speed', async ({ page }) => {
  await openAudio(page);
  await page.getByLabel('Mot du programme').selectOption('practice-olive');
  await expect(page.getByTestId('audio-test-construction')).toHaveText('olive = o + li + ve');
  await expect(page.getByTestId('audio-test-segments')).toHaveText('o → li → vé → olive');
  await page.evaluate(() => {
    const original = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = (utterance) => {
      if (utterance.rate !== 0.78) throw new Error('Incorrect Parent speed');
      original(utterance);
    };
  });
  await page.getByRole('button', { name: '🔊 Mot', exact: true }).tap();
  expect(await texts(page)).toEqual(['olive']);
  await page.getByRole('button', { name: '🐢 Découpe', exact: true }).tap();
  expect(await texts(page)).toEqual(['olive', 'o']);
  await page.clock.runFor(2000);
  expect(await texts(page)).toEqual(['olive', 'o', 'li', 'vé', 'olive']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('effective Parent words and literal blocks keep normal playback only', async ({ page }) => {
  await openAudio(page);
  await page.getByLabel('Mot du programme').selectOption('parent-word-chain-lavage');
  await expect(page.getByTestId('audio-test-construction')).toHaveText('lavage = la + va + ge');
  await expect(page.getByText('Découpe non disponible', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '🐢 Découpe', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '🔊 Mot', exact: true }).tap();
  expect(await texts(page)).toEqual(['lavage']);
});

test('normal playback, word change, mute and leaving cancel segmented playback', async ({ page }) => {
  await openAudio(page);
  const select = page.getByLabel('Mot du programme');
  const cut = page.getByRole('button', { name: '🐢 Découpe', exact: true });
  await select.selectOption('practice-olive');
  await cut.tap();
  await page.getByRole('button', { name: '🔊 Mot', exact: true }).tap();
  await page.clock.runFor(2500);
  expect(await texts(page)).toEqual(['o', 'olive']);
  await cut.tap();
  await select.selectOption('word-lama');
  await page.clock.runFor(2500);
  expect(await texts(page)).toEqual(['o', 'olive', 'o']);
  await cut.tap();
  await page.getByRole('button', { name: 'Couper le son' }).tap();
  await page.clock.runFor(2500);
  expect((await texts(page)).slice(-1)).toEqual(['la']);
  await expect(cut).toBeDisabled();
  await expect(page.getByRole('button', { name: '🔊 Mot', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Activer le son' }).tap();
  await cut.tap();
  await page.getByRole('button', { name: 'Programme', exact: true }).tap();
  await page.clock.runFor(2500);
  expect(await texts(page)).toEqual(['o', 'olive', 'o', 'la', 'la']);
});
