import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';

test('diagnostic uniquement avec debugAudio=1 ; les boutons parlent dans le handler', async ({ page }) => {
  await mockSpeech(page, ['en-US', 'fr-FR']);
  for (const query of ['', '?debugAudio=0', '?debugAudio=1']) {
    await page.goto(`/${query}`);
    await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
    await page.evaluate(() => { window.speechProbe.calls = []; });
    const panel = page.getByRole('region', { name: 'Diagnostic audio' });
    if (query !== '?debugAudio=1') { await expect(panel).toHaveCount(0); continue; }
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Voix fr-FR — fr-FR');
    await page.getByRole('button', { name: 'TEST AUDIO', exact: true }).tap();
    expect(await page.evaluate(() => window.speechProbe.calls[0])).toMatchObject({ text: 'Bonjour Milo', lang: '' });
    await expect(panel).toContainText('onstart');
    await expect(panel).toContainText('onend');
    await expect(panel.locator('dt').filter({ hasText: 'Activation utilisateur à la demande' }).locator('+ dd')).toHaveText('oui');
    // Dans la même pile JS que click() : une Promise.then ou un timer serait trop tard.
    const calls = await page.getByRole('button', { name: 'TEST VOIX FR', exact: true }).evaluate((button) => {
      (button as HTMLButtonElement).click();
      return window.speechProbe.calls;
    });
    expect(calls.at(-1)).toEqual({ text: 'Bonjour Milo', lang: 'fr-FR', voice: 'fr-FR' });
    expect(calls.length).toBe(2);
    await page.getByRole('button', { name: 'Couper le son' }).tap();
    await page.getByRole('button', { name: 'TEST AUDIO', exact: true }).tap();
    expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(2);
    await expect(panel).toContainText('lecture ignorée : muted');
    await expect(panel.locator('dt').filter({ hasText: /^Muted$/ }).locator('+ dd')).toHaveText('oui');
    await page.getByRole('button', { name: 'Activer le son' }).tap();
    await page.getByRole('button', { name: 'TEST VOIX FR', exact: true }).tap();
    expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/audio-diagnostics.png', fullPage: true });
  }
});

test('liste vide puis voix tardives ; aucune voix française : pas de fr-CA inventée', async ({ page }) => {
  await mockSpeech(page, []);
  await page.goto('/?debugAudio=1');
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  const panel = page.getByRole('region', { name: 'Diagnostic audio' });
  await page.getByRole('button', { name: 'TEST VOIX FR', exact: true }).tap();
  await expect(panel).toContainText('no-french-voice');
  expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(0);
  await page.evaluate(() => {
    window.speechProbe.languages = ['en-US'];
    window.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
  });
  await expect(panel).toContainText('Aucune voix française disponible');
  await page.getByRole('button', { name: 'TEST AUDIO', exact: true }).tap();
  expect(await page.evaluate(() => window.speechProbe.calls[0].voice)).toBeUndefined();
  await page.evaluate(() => {
    window.speechProbe.languages = ['en-US', 'fr-BE'];
    window.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
  });
  await expect(panel).toContainText('Voix fr-BE — fr-BE');
  expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(1);
  await page.getByRole('button', { name: 'TEST VOIX FR', exact: true }).tap();
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)?.voice)).toBe('fr-BE');
});

test('onerror visible et synthétiseur en pause repris sans différer speak', async ({ page }) => {
  await mockSpeech(page);
  await page.goto('/?debugAudio=1');
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.evaluate(() => {
    Object.defineProperty(window.speechSynthesis, 'paused', { configurable: true, value: true });
    window.speechSynthesis.resume = () => { Object.defineProperty(window.speechSynthesis, 'paused', { value: false }); };
    window.speechSynthesis.speak = (utterance) => {
      const event = new Event('error');
      Object.assign(event, { error: 'not-allowed', message: 'Refus simulé' });
      utterance.onerror?.(event as SpeechSynthesisErrorEvent);
    };
  });
  await page.getByRole('button', { name: 'TEST AUDIO', exact: true }).tap();
  const panel = page.getByRole('region', { name: 'Diagnostic audio' });
  await expect(panel).toContainText('resume()');
  await expect(panel).toContainText('onerror : not-allowed : Refus simulé');
});
