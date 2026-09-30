import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { emptyParentData } from '../../src/parent/model';
import { initialProgram } from '../../src/content/program';
import { activityCatalog } from '../../src/content/activity-catalog';

for (const missing of [[0], [1], [0, 1]]) test(`normal hint for any single missing slot: ${missing}`, async ({ page }) => {
  await mockSpeech(page, ['fr-CA'], true, true);
  const data = { ...emptyParentData(), activeWeek: 5, readingSpeed: 'normal',
    audioOverrides: { 'syllable-la': { audioText: 'lah' } },
    activityEnabled: Object.fromEntries(activityCatalog(initialProgram, 5).map((a) => [a.id, false])),
    activities: [{ id: 'parent-activity-hint', type: 'complete-segments', targetId: 'word-lama', segmentationId: 'initial',
      missingSegmentIndexes: missing, distractorUnitIds: ['syllable-li'], order: 0 }],
  };
  await page.addInitScript((value) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(value)), data);
  await page.goto('/'); await page.clock.install();
  await page.evaluate(() => {
    Object.assign(window, { hintRates: [] });
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = (u) => { (window as unknown as { hintRates: number[] }).hintRates.push(u.rate); speak(u); };
  });
  const expected = missing.length === 1 ? [missing[0] === 0 ? 'lah' : 'ma', 'comme dans', 'lama'] : ['lama'];
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.clock.runFor(500);
  expect(await page.evaluate(() => window.speechProbe.calls.map((c) => c.text))).toEqual(expected);
  const rates = await page.evaluate(() => (window as unknown as { hintRates: number[] }).hintRates);
  for (const rate of rates) expect(rate).toBeCloseTo(0.6, 5);
  await page.getByRole('button', { name: 'Réécouter lama', exact: true }).tap(); await page.clock.runFor(500);
  expect(await page.evaluate((length) => window.speechProbe.calls.slice(-length).map((c) => c.text), expected.length)).toEqual(expected);
  await page.getByRole('button', { name: 'Découper lama', exact: true }).tap(); await page.clock.runFor(1600);
  expect(await page.evaluate(() => window.speechProbe.calls.slice(-3).map((c) => c.text))).toEqual(['lah', 'ma', 'lama']);
  const slowRates = await page.evaluate(() => (window as unknown as { hintRates: number[] }).hintRates.slice(-3));
  for (const rate of slowRates) expect(rate).toBeCloseTo(0.45, 5);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
  await expect(page.getByLabel('Étoiles : 0 sur 1')).toBeVisible();
  for (const index of missing) await page.getByRole('button', { name: `Choisir ${index === 0 ? 'la' : 'ma'}`, exact: true }).click();
  await page.clock.runFor(500);
  expect(await page.evaluate((length) => window.speechProbe.calls.slice(-length).map((c) => c.text), expected.length)).toEqual(expected);
  await page.clock.runFor(2200);
  await expect(page.getByRole('heading', { name: 'Bravo Milo !', exact: true })).toBeVisible();
});
