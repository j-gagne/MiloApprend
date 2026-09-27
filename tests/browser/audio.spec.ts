import { test, expect } from '@playwright/test';
import { mockSpeech } from './legacy-speech-mock';

test('lecture initiale unique, réécoutes et erreurs rapides remplacent la voix active', async ({ page }) => {
  await mockSpeech(page, ['fr-CA'], false);
  await page.goto('/');
  await page.clock.install();
  await page.evaluate(() => {
    const monitor = { active: 0, max: 0 };
    Object.assign(window, { speechConcurrency: monitor });
    const synthesis = window.speechSynthesis;
    const speak = synthesis.speak.bind(synthesis);
    const cancel = synthesis.cancel.bind(synthesis);
    synthesis.speak = (utterance) => {
      monitor.active += 1;
      monitor.max = Math.max(monitor.max, monitor.active);
      speak(utterance);
    };
    synthesis.cancel = () => { monitor.active = 0; cancel(); };
  });
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual(['lune']);
  expect(await page.evaluate(() => window.speechProbe.cancels)).toBe(0);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Réécouter lune' }).tap();
    await page.getByRole('button', { name: 'Choisir na', exact: true }).tap();
  }
  expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual(Array(7).fill('lune'));
  expect(await page.evaluate(() => window.speechProbe.cancels)).toBe(6);
  expect(await page.evaluate(() => (window as Window & { speechConcurrency: { max: number } }).speechConcurrency.max)).toBe(1);
  await expect(page.getByLabel('Case manquante', { exact: true })).toHaveText('?');
  await expect(page.getByRole('button', { name: 'Choisir ne', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).tap();
  await page.clock.runFor(5000);
  expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(7);
  await page.getByRole('button', { name: 'Couper le son' }).tap();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.getByRole('button', { name: 'Choisir na', exact: true }).tap();
  expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(7);
  await expect(page.getByRole('button', { name: 'Réécouter lune' })).toBeDisabled();
});

for (const [languages, expected] of [
  [['en-US', 'fr-FR', 'fr-CA'], 'fr-CA'],
  [['en-US', 'fr-BE', 'fr-FR'], 'fr-FR'],
  [['en-US', 'fr-BE'], 'fr-BE'],
] as const) {
  test(`prononce le mot complet en ${expected} au début, après erreur et après réussite`, async ({ page }) => {
    await mockSpeech(page, [...languages]);
    await page.goto('/');
    await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
    await expect(page.getByRole('button', { name: 'Réécouter lune' })).toBeEnabled();
    expect(await page.evaluate(() => window.speechProbe.calls)).toEqual([{ text: 'lune', lang: expected, voice: expected }]);
    await page.getByRole('button', { name: 'Choisir na', exact: true }).tap();
    expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual(['lune', 'lune']);
    await page.getByRole('button', { name: 'Choisir ne', exact: true }).tap();
    expect(await page.evaluate(() => window.speechProbe.calls)).toEqual(Array.from({ length: 3 }, () => ({ text: 'lune', lang: expected, voice: expected })));
    await expect(page.getByRole('button', { name: 'Choisir na', exact: true })).toBeDisabled();
    await expect(page.getByLabel('1 œuf éclos sur 5')).toBeVisible();
  });
}

test('réécoute prolonge la pause, muet arrête et empêche la voix', async ({ page }) => {
  await mockSpeech(page);
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.getByRole('button', { name: 'Choisir ne', exact: true }).tap();
  await page.clock.runFor(1500);
  await expect(page.getByRole('status')).toContainText('lune');
  await page.getByRole('button', { name: 'Réécouter lune' }).tap();
  expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(3);
  const cancelled = await page.evaluate(() => window.speechProbe.cancels);
  await page.getByRole('button', { name: 'Couper le son' }).tap();
  expect(await page.evaluate(() => window.speechProbe.cancels)).toBeGreaterThan(cancelled);
  await expect(page.getByRole('button', { name: 'Réécouter lune' })).toBeDisabled();
  await page.clock.runFor(700);
  await expect(page.getByRole('status')).toContainText('lune');
  await page.clock.runFor(1300);
  await page.getByRole('button', { name: 'Choisir la', exact: true }).tap();
  expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(3);
  await page.getByRole('button', { name: 'Activer le son' }).tap();
  await page.getByRole('button', { name: 'Réécouter lama' }).tap();
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)?.text)).toBe('lama');
});

test('voix chargées tardivement et moteur vocal sans événement de fin', async ({ page }) => {
  await mockSpeech(page, [], false);
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.evaluate(() => {
    window.speechProbe.languages = ['fr-CA'];
    window.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
  });
  await page.getByRole('button', { name: 'Choisir ne', exact: true }).tap();
  expect(await page.evaluate(() => window.speechProbe.calls[0].voice)).toBe('fr-CA');
  await page.clock.runFor(2000);
  await expect(page.getByRole('status')).toContainText('lune');
  await page.clock.runFor(2600);
  await expect(page.getByRole('button', { name: 'Choisir la', exact: true })).toBeEnabled();
});

for (const unavailable of ['absent', 'throws']) {
  test(`synthèse ${unavailable} : le jeu continue`, async ({ page }) => {
    await page.addInitScript((mode) => {
      Math.random = () => 0.999;
      Object.defineProperty(window, 'speechSynthesis', { configurable: true,
        get: () => { if (mode === 'throws') throw new Error('Audio indisponible'); return undefined; },
      });
    }, unavailable);
    await page.goto('/');
    await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
    await page.getByRole('button', { name: 'Choisir ne', exact: true }).tap();
    await expect(page.getByRole('status')).toContainText('lune');
    await expect(page.getByRole('button', { name: 'Choisir la', exact: true })).toBeEnabled();
  });
}
