import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';

type VoiceCall = { text: string; pitch: number; rate: number; lang: string };
async function setup(page: Page) {
  await mockSpeech(page, ['fr-FR'], false);
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)),
    { ...chainParentData(), readingSpeed: 'fast' });
  await page.goto('/');
  await page.evaluate(() => {
    const original = speechSynthesis.speak.bind(speechSynthesis);
    Object.assign(window, { characterVoiceCalls: [] });
    speechSynthesis.speak = (utterance) => {
      (window as unknown as { characterVoiceCalls: VoiceCall[] }).characterVoiceCalls.push({
        text: utterance.text, pitch: utterance.pitch, rate: utterance.rate, lang: utterance.lang,
      });
      original(utterance);
    };
  });
}
const calls = (page: Page) => page.evaluate(() => (window as unknown as { characterVoiceCalls: VoiceCall[] }).characterVoiceCalls);
async function confirm(page: Page, name: string, character: string) {
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).tap();
  await page.getByRole('button', { name: character, exact: true }).tap();
  await page.getByLabel('Ton prénom').fill(name);
  await page.getByRole('button', { name: 'Continuer', exact: true }).tap();
}

test('one greeting per confirmation, current Unicode name/profile, mute and navigation', async ({ page }) => {
  await setup(page);
  expect(await calls(page)).toEqual([]);
  await confirm(page, '  Élodie  ', 'Lion');
  expect(await calls(page)).toEqual([{ text: 'Salut Élodie !', pitch: 0.8, rate: 0.95, lang: 'fr-FR' }]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!).playerName)).toBe('Élodie');
  const before = await page.evaluate(() => window.speechProbe.cancels);
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).tap();
  expect(await page.evaluate(() => window.speechProbe.cancels)).toBeGreaterThan(before);
  expect((await calls(page)).length).toBe(1);
  await confirm(page, 'Élodie', 'Licorne');
  expect((await calls(page)).at(-1)).toEqual({ text: 'Salut Élodie !', pitch: 1.2, rate: 1, lang: 'fr-FR' });
  await confirm(page, 'Zoë', 'Licorne');
  expect((await calls(page)).at(-1)?.text).toBe('Salut Zoë !');
  expect((await calls(page)).length).toBe(3);
  await page.getByRole('button', { name: 'Couper le son' }).tap();
  await confirm(page, 'Emma', 'Tigre');
  expect((await calls(page)).length).toBe(3);
  await page.getByRole('button', { name: 'Activer le son' }).tap();
  expect((await calls(page)).length).toBe(3);
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).tap();
  await page.getByRole('button', { name: 'Retour', exact: true }).tap();
  expect((await calls(page)).length).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  expect(await page.evaluate(() => window.speechProbe.calls)).toEqual([]);
});

test('character profile never leaks into normal or segmented pedagogical speech', async ({ page }) => {
  await setup(page);
  await confirm(page, 'Emma', 'Licorne');
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  expect((await calls(page)).at(-1)).toEqual({ text: 'lama', pitch: 1, rate: 0.78, lang: 'fr-FR' });
  await page.getByRole('button', { name: 'Découper lama', exact: true }).tap();
  expect((await calls(page)).at(-1)).toEqual({ text: 'la', pitch: 1, rate: 0.78, lang: 'fr-FR' });
  await page.getByRole('button', { name: 'Réécouter lama', exact: true }).tap();
  expect((await calls(page)).at(-1)?.pitch).toBe(1);
  expect((await calls(page)).filter((call) => call.text.startsWith('Salut'))).toHaveLength(1);
  expect(await page.evaluate(() => window.speechProbe.cancels)).toBeGreaterThanOrEqual(3);
});
