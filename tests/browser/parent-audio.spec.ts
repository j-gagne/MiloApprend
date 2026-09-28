import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';

async function openAudio(page: Page, speed: 'normal' | 'slow' | 'fast' = 'fast') {
  await mockSpeech(page, ['fr-FR'], true, true);
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)),
    { ...chainParentData(), readingSpeed: speed });
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

for (const speed of ['normal', 'slow', 'fast'] as const) for (const [id, construction, mode, button, spoken] of [
  ['word-ami', 'ami = a + mi', 'Segmenté', 'Découpe', ['a', 'mi', 'ami']],
  ['word-vis', 'vis = vi + s', 'Mot complet lent', 'Lentement', ['vis']],
  ['practice-olive', 'olive = o + li + ve', 'Mot complet lent', 'Lentement', ['olive']],
] as const) test(`Parent ${id} ${speed}: native utterance, displayed and applied rates`, async ({ page }) => {
  await openAudio(page, speed);
  await page.getByLabel('Mot du programme').selectOption(id);
  await expect(page.getByTestId('audio-test-construction')).toHaveText(construction);
  await expect(page.getByText(`Mode de lecture : ${mode}`, { exact: true })).toBeVisible();
  await expect(page.getByTestId('audio-test-segments')).toHaveText(spoken.join(' → '));
  await page.evaluate(() => {
    const original = speechSynthesis.speak.bind(speechSynthesis);
    Object.assign(window, { audioRates: [] });
    speechSynthesis.speak = (utterance) => {
      if (!(utterance instanceof SpeechSynthesisUtterance)) throw new Error('Expected native utterance');
      (window as unknown as { audioRates: number[] }).audioRates.push(utterance.rate);
      original(utterance);
    };
  });
  await page.getByRole('button', { name: '🔊 Mot', exact: true }).tap();
  const normal = speed === 'normal' ? 0.60 : speed === 'slow' ? 0.45 : 0.78;
  const slow = speed === 'normal' ? 0.45 : speed === 'slow' ? 0.3375 : 0.585;
  await expect(page.getByTestId('audio-test-rates')).toContainText(`Mot : ${normal.toFixed(2)}`);
  await expect(page.getByTestId('audio-test-final-rate')).toContainText(`TTS : ${normal.toFixed(2)}`);
  await page.getByRole('button', { name: `🐢 ${button}`, exact: true }).tap();
  await page.clock.runFor(2000);
  expect(await texts(page)).toEqual([spoken.at(-1), ...spoken]);
  const rates = await page.evaluate(() => (window as unknown as { audioRates: number[] }).audioRates);
  expect(rates[0]).toBeCloseTo(normal);
  const expected = slow;
  for (const rate of rates.slice(1)) expect(rate).toBeCloseTo(expected);
  await expect(page.getByTestId('audio-test-rates')).toContainText(`${button === 'Découpe' ? 'Découpe' : 'Lentement'} : ${expected.toFixed(2)}`);
  await expect(page.getByTestId('audio-test-final-rate')).toContainText(`TTS : ${expected.toFixed(2)}`);
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
  await select.selectOption('word-ami');
  await cut.tap();
  await page.getByRole('button', { name: '🔊 Mot', exact: true }).tap();
  await page.clock.runFor(2500);
  expect(await texts(page)).toEqual(['a', 'ami']);
  await cut.tap();
  await select.selectOption('word-lama');
  await page.clock.runFor(2500);
  expect(await texts(page)).toEqual(['a', 'ami', 'a']);
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
  expect(await texts(page)).toEqual(['a', 'ami', 'a', 'la', 'la']);
});
