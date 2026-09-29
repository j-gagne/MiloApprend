import { test, expect } from '@playwright/test';
import { mockSpeech } from './legacy-speech-mock';

test('first automatic speech survives empty voices, StrictMode, rerenders and late voices without replay', async ({ page }) => {
  await mockSpeech(page, [], false);
  await page.goto('/?debugAudio=1');
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  expect(await page.evaluate(() => window.speechProbe.calls)).toEqual([{ text: 'lune', lang: 'fr-CA', voice: undefined }]);
  expect(await page.evaluate(() => window.speechProbe.cancels)).toBe(0);
  await page.evaluate(() => {
    window.speechProbe.languages = ['fr-FR'];
    window.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(1100);
  expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(1);
  await page.getByRole('button', { name: 'Réécouter lune' }).tap();
  await page.evaluate(() => window.speechSynthesis.dispatchEvent(new Event('voiceschanged')));
  expect(await page.evaluate(() => window.speechProbe.calls.map(c => c.text))).toEqual(['lune','lune']);
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)?.voice)).toBe('fr-FR');
});
