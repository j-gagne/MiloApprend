import { test, expect, type Page } from '@playwright/test';
import { emptyParentData } from '../../src/parent/model';
import { mockSpeech } from './speech-mock';

const key = 'milo-apprend.progress.v1';
const remote = { schemaVersion: 1, programId: 'remote-reading-browser', weeks: [
  { number: 1, label: '1', letters: ['m', 'a'], syllables: ['ma', 'sa', 'va', 'ne'], toolWords: [], sentences: [],
    words: [{ id: 'word-old', display: 'ancien' }] },
  { number: 2, label: '2', letters: [], syllables: [], toolWords: [], sentences: [], words: [
    { id: 'word-savane', display: 'savane' }, { id: 'word-disabled', display: 'exclu' },
    { id: 'word-reading-disabled', display: 'masqué' }], readingExercises: [
    { id: 'reading:compound', displayedUnits: [{ unitId: 'letter-m' }, { unitId: 'letter-a' }, { unitId: 'syllable-ma' }] },
    { id: 'reading:segmented', targetId: 'word-savane', displayedUnits: [{ unitId: 'word-savane', segmentUnitIds: ['syllable-sa', 'syllable-va', 'syllable-ne'] }] },
  ] },
  { number: 3, label: '3', letters: [], syllables: [], toolWords: [], sentences: [], words: [{ id: 'word-future', display: 'futur' }] },
] };
async function setup(page: Page, empty = false) {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: remote }));
  await page.addInitScript(({ parent, key }) => {
    if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(parent));
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ completedSessions: 0, selectedCharacterId: 'lion' }));
  }, { key, parent: { ...emptyParentData(), activeWeek: 2, questionCount: 6,
    exerciseScope: { mode: 'selected-weeks', selectedWeeks: empty ? [] : [1, 2] },
    unitEnabled: { 'word-disabled': false, 'word-old': false },
    activityEnabled: { 'reading:whole:word-reading-disabled': false },
    customUnits: [{ id: 'parent-word-test', type: 'word', display: 'parent', text: 'parent', audioText: 'parent',
      introducedInWeek: 2, enabled: true, segmentations: [], tags: ['practice'] }],
  } });
  await page.goto('/MiloApprend/');
  await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'JE LIS', exact: true }).click();
}
const stored = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);

test('Home launches effective remote/Parent pages, preserves page progress and awards exactly once across reload', async ({ page }) => {
  await setup(page);
  await expect(page.getByRole('main', { name: 'Je lis' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'lion');
  await expect(page.locator('.reading-dot')).toHaveCount(4);
  await page.getByRole('button', { name: 'Exercice suivant' }).click();
  await expect(page.locator('.reading-dot.done')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Exercice précédent' }).click();
  const seen: string[] = [];
  for (let index = 0; index < 4; index++) {
    const words = await page.locator('.reading-text').allTextContents();
    const sliders = page.getByRole('slider');
    const count = await sliders.count();
    seen.push(`${words.join('|')}:${count}`);
    for (let segment = 0; segment < count; segment++) await sliders.nth(segment).press('End');
    await expect(page.locator('.reading-dot.done')).toHaveCount(index + 1);
    if (index === 0) {
      await page.getByRole('button', { name: 'Exercice suivant' }).click();
      await page.getByRole('button', { name: 'Exercice précédent' }).click();
      await expect(sliders.first()).toHaveAttribute('aria-valuenow', '100');
    }
    if (index < 3) {
      await expect(page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Exercice suivant' }).click();
    }
  }
  expect(seen.sort()).toEqual(['m|a|ma:3', 'parent:1', 'savane:1', 'savane:3'].sort());
  await page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' }).click();
  await expect(page.locator('.lion-reveal-scene')).toHaveAttribute('data-stage', '1');
  const saved = await stored(page);
  expect(saved.completedSessions).toBe(1);
  expect(saved.eggRewards.completedSessionIds).toHaveLength(1);
  expect(saved.eggRewards.completedSessionIds[0]).toMatch(/^reading:/);
  await page.reload();
  await expect(page.locator('.lion-reveal-scene')).toHaveAttribute('data-stage', '1');
  expect(await stored(page)).toEqual(saved);
  await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'JE LIS', exact: true }).click();
  await expect(page.locator('.reading-dot.done')).toHaveCount(0);
  expect((await stored(page)).completedSessions).toBe(1);
});

test('empty effective catalog returns Home without preview fallback or reward initialization', async ({ page }) => {
  await setup(page, true);
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' })).toHaveCount(0);
  await page.getByRole('button', { name: 'RETOUR À L’ACCUEIL' }).click();
  await expect(page.getByRole('button', { name: 'JE LIS', exact: true })).toBeVisible();
  expect((await stored(page)).eggRewards).toBeUndefined();
});
