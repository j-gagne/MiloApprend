import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { emptyParentData } from '../../src/parent/model';
import { initialProgram } from '../../src/content/program';
import { automaticActivities } from '../../src/content/activity-catalog';

for (const [id, word] of [['word-vis', 'vis'], ['practice-olive', 'olive']] as const) {
  test(`${word}: whole aid, normal speed restored, score and cancellation`, async ({ page }) => {
    await mockSpeech(page, ['fr-CA'], false, true);
    const target = initialProgram.units.find((u) => u.id === id)!;
    const activities = automaticActivities(initialProgram, 5);
    await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), {
      ...emptyParentData(), activeWeek: 5, readingSpeed: 'normal',
      unitEnabled: Object.fromEntries(initialProgram.units.filter((u) => u.type === 'word' || u.type === 'sentence').map((u) => [u.id, u.id === target.id])),
      activityEnabled: Object.fromEntries(activities.map((a) => [a.id, a.targetId === target.id])),
    });
    await page.goto('/'); await page.clock.install();
    await page.evaluate(() => {
      const original = speechSynthesis.speak.bind(speechSynthesis);
      Object.assign(window, { audioRates: [] });
      speechSynthesis.speak = (utterance) => {
        (window as unknown as { audioRates: number[] }).audioRates.push(utterance.rate); original(utterance);
      };
    });
    await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
    const slow = page.getByRole('button', { name: `Écouter lentement ${word}`, exact: true });
    await expect(slow).toContainText('Lentement');
    await expect(page.getByRole('button', { name: /^Découper/ })).toHaveCount(0);
    await slow.tap(); await slow.tap();
    await page.getByRole('button', { name: `Réécouter ${word}`, exact: true }).tap();
    const rates = await page.evaluate(() => (window as unknown as { audioRates: number[] }).audioRates);
    expect(rates).toHaveLength(4);
    for (const [index, expected] of [0.6, 0.45, 0.45, 0.6].entries()) expect(rates[index]).toBeCloseTo(expected);
    expect(await page.evaluate(() => window.speechProbe.calls.map((c) => c.text))).toEqual([word, word, word, word]);
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
    await expect(page.getByLabel('Étoiles : 0 sur 1')).toBeVisible();
    const beforeMute = await page.evaluate(() => window.speechProbe.cancels);
    await page.getByRole('button', { name: 'Couper le son' }).tap();
    expect(await page.evaluate(() => window.speechProbe.cancels)).toBeGreaterThan(beforeMute);
    await expect(slow).toBeDisabled();
    await page.getByRole('button', { name: 'Activer le son' }).tap();
    await slow.tap();
    const beforeExit = await page.evaluate(() => window.speechProbe.cancels);
    await page.getByRole('button', { name: 'Milo apprend, accueil' }).tap();
    expect(await page.evaluate(() => window.speechProbe.cancels)).toBeGreaterThan(beforeExit);
    await page.clock.runFor(6000);
    expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(5);
  });
}
