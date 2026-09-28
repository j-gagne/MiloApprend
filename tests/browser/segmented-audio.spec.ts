import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';
import { initialProgram } from '../../src/content/program';
import { automaticActivities } from '../../src/content/activity-catalog';
import { effectiveProgram } from '../../src/parent/model';
import type { Word } from '../../src/content/model';

async function setup(page: Page, mode: 'individual' | 'chain' = 'individual', ends = true, speed: 'normal' | 'slow' | 'fast' = 'fast') {
  await mockSpeech(page, ['fr-CA'], ends);
  const previous = chainParentData();
  const original = initialProgram.units.find((u): u is Word => u.id === 'word-ami' && u.type === 'word')!;
  const { completeWord: _variants, ...base } = original;
  const ami: Word = { ...base, id: 'parent-word-audio-ami', introducedInWeek: 6, tags: ['practice'] };
  const data = { ...previous, gameMode: mode, questionCount: 6, readingSpeed: speed,
    customUnits: [ami, ...previous.customUnits], activities: [
      { id: 'parent-activity-audio-ami', type: 'complete-segments' as const, targetId: ami.id, segmentationId: 'initial',
        missingSegmentIndexes: [1], distractorUnitIds: ['syllable-ma', 'syllable-mu'] }, ...previous.activities,
    ].map((a, order) => ({ ...a, order })) };
  const settings = { ...data, activityEnabled: Object.fromEntries(automaticActivities(effectiveProgram(initialProgram, data), 6).map((a) => [a.id, false])) };
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), settings);
  await page.goto('/'); await page.clock.install();
  await page.evaluate(() => {
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    Object.assign(window, { sequenceRates: [], sequenceTimes: [] });
    speechSynthesis.speak = (utterance) => {
      (window as unknown as { sequenceRates: number[] }).sequenceRates.push(utterance.rate);
      (window as unknown as { sequenceTimes: number[] }).sequenceTimes.push(Date.now());
      speak(utterance);
    };
  });
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
}
const texts = (page: Page) => page.evaluate(() => window.speechProbe.calls.map((c) => c.text));
const choose = (page: Page, answer: string) => page.getByLabel('Morceaux disponibles').getByRole('button', { name: `Choisir ${answer}`, exact: true }).first().click();

for (const speed of ['normal', 'slow'] as const) for (const mode of ['individual', 'chain'] as const) test(`${mode} ${speed}: AMI, LAMA utterances, whole construction, unchanged score; LAVAGE and phrase normal only`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, mode, true, speed);
  await expect(page.getByRole('button', { name: 'Réécouter ami', exact: true })).toContainText('Mot');
  const cut = page.getByRole('button', { name: 'Découper ami', exact: true });
  await expect(cut).toContainText('Découpe');
  expect(await texts(page)).toEqual(['ami']);
  await cut.tap();
  expect(await texts(page)).toEqual(['ami', 'a']);
  await page.clock.runFor(1400); expect(await texts(page)).toEqual(['ami', 'a', 'mi', 'ami']);
  const times = await page.evaluate(() => (window as unknown as { sequenceTimes: number[] }).sequenceTimes.slice(-3));
  expect(times[1] - times[0]).toBeGreaterThanOrEqual(500); // 100 ms speech + 400 ms pause.
  expect(times[2] - times[1]).toBeGreaterThanOrEqual(700); // 100 ms speech + 600 ms pause.
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
  await expect(page.getByLabel('Étoiles : 0 sur 4')).toBeVisible();
  const rates = await page.evaluate(() => (window as unknown as { sequenceRates: number[] }).sequenceRates);
  const normalRate = speed === 'normal' ? 0.60 : 0.45;
  const slowRate = speed === 'normal' ? 0.45 : 0.3375;
  expect(rates[0]).toBeCloseTo(normalRate);
  expect(rates.slice(1)).toHaveLength(3);
  for (const rate of rates.slice(1)) expect(rate).toBeCloseTo(slowRate, 5);
  await page.getByRole('button', { name: 'Réécouter ami', exact: true }).tap();
  expect((await texts(page)).at(-1)).toBe('ami');
  expect(await page.evaluate(() => (window as unknown as { sequenceRates: number[] }).sequenceRates.at(-1))).toBeCloseTo(normalRate);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/segmented-audio-${mode}.png` });
  await choose(page, 'mi'); await expect(page.getByLabel('Étoiles : 1 sur 4')).toBeVisible();
  await page.clock.runFor(2100);
  await page.getByRole('button', { name: 'Découper lama', exact: true }).tap();
  await page.clock.runFor(1400);
  expect((await texts(page)).slice(-3)).toEqual(['la', 'ma', 'lama']);
  for (const answer of ['la', 'ma']) await choose(page, answer);
  await expect(page.getByLabel('Étoiles : 2 sur 4')).toBeVisible();
  await page.clock.runFor(2100);
  await expect(page.getByRole('button', { name: 'Réécouter lavage', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Découper/ })).toHaveCount(0);
  for (const answer of ['la', 'va']) await choose(page, answer);
  await page.clock.runFor(2100);
  await expect(page.getByRole('button', { name: 'Réécouter Il a volé le nid.', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Découper/ })).toHaveCount(0);
});

test('double tap and normal replay replace a sequence, including during pauses', async ({ page }) => {
  await setup(page);
  const cut = page.getByRole('button', { name: 'Découper ami', exact: true });
  await cut.tap(); await page.clock.runFor(200); await cut.tap();
  await page.clock.runFor(1400);
  expect(await texts(page)).toEqual(['ami', 'a', 'a', 'mi', 'ami']);
  await cut.tap(); await page.clock.runFor(200);
  await page.getByRole('button', { name: 'Réécouter ami', exact: true }).tap();
  await page.clock.runFor(2000);
  expect((await texts(page)).slice(-2)).toEqual(['a', 'ami']);
  expect((await texts(page)).length).toBe(7);
});

test('success and next target never resume old segments; leaving also cancels', async ({ page }) => {
  await setup(page, 'chain');
  await page.getByRole('button', { name: 'Découper ami', exact: true }).tap();
  await choose(page, 'mi');
  await page.clock.runFor(2100);
  await expect(page.getByRole('button', { name: 'Réécouter lama', exact: true })).toBeVisible();
  expect(await texts(page)).toEqual(['ami', 'a', 'ami', 'lama']);
  await page.getByRole('button', { name: 'Découper lama', exact: true }).tap();
  await page.clock.runFor(200);
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
  await page.clock.runFor(3000);
  expect((await texts(page)).slice(-1)).toEqual(['la']);
});

test('mute cancels a paused sequence and disables both buttons', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Découper ami', exact: true }).click();
  await page.clock.runFor(200);
  await page.getByRole('button', { name: 'Couper le son' }).click();
  await page.clock.runFor(3000);
  expect(await texts(page)).toEqual(['ami', 'a']);
  await expect(page.getByRole('button', { name: 'Découper ami', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Réécouter ami', exact: true })).toBeDisabled();
});

test('missing end event stops the sequence through the existing watchdog', async ({ page }) => {
  await setup(page, 'individual', false);
  await page.getByRole('button', { name: 'Découper ami', exact: true }).click();
  await page.clock.runFor(10000);
  expect(await texts(page)).toEqual(['ami', 'a']);
  await expect(page.getByRole('button', { name: 'Choisir mi', exact: true })).toBeEnabled();
});
