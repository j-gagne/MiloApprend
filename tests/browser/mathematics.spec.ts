import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { emptyParentData } from '../../src/parent/model';
import { buildSeedProgram } from '../../src/content/seed-bank';
import { mathCatalog } from '../../src/content/math-catalog';
import type { MathExerciseDefinition } from '../../src/content/math-model';
const sequence = [11, 12, 13, 14, 15];
const definitions: MathExerciseDefinition[] = [
  { id: 'math:test-order', type: 'ORDER_NUMBERS', sequence },
  ...[0, 2, 4].map(missingIndex => ({ id: `math:test-missing-${missingIndex}`, type: 'MISSING_NUMBER' as const, sequence, missingIndex,
    distractors: sequence.filter(n => n !== sequence[missingIndex]).slice(0, 2) })),
  { id: 'math:test-hear', type: 'HEAR_NUMBER', target: 11, distractors: [13, 15] },
];
const weeks = [9, 10].map(number => ({ number, label: String(number), letters: [], syllables: [], toolWords: [], words: [], sentences: [],
  mathematics: { numbers: number === 10 ? sequence : [8, 9, 10] } }));
async function setup(page: Page, empty = false, hearOnly = false) {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: { schemaVersion: 1, programId: 'math-browser', weeks, mathExercises: hearOnly ? definitions.filter(item => item.type === 'HEAR_NUMBER') : definitions } }));
  const automatic = mathCatalog(buildSeedProgram('math', weeks), 10, { mode: 'selected-weeks', selectedWeeks: [10] });
  await page.addInitScript(parent => {
    localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(parent));
  }, { ...emptyParentData(), activeWeek: 10, questionCount: 9, exerciseScope: { mode: 'selected-weeks', selectedWeeks: empty ? [11] : [10] },
    activityEnabled: Object.fromEntries(automatic.exercises.map(item => [item.definition.id, false])) });
  await page.goto('/?activity=math');
  await page.getByRole('button', { name: 'JOUER AUX NOMBRES' }).click();
}
async function tap(page: Page, value: number, slot = 0) {
  await page.getByRole('button', { name: `Choisir ${value}`, exact: true }).click();
  if (await page.getByRole('heading', { name: 'Je range', exact: true }).isVisible()) await page.locator('.math-slot button').nth(slot).click();
}
test('touch-sized math: drag, swap, retry, endpoints, audio and exactly one reward after reload', async ({ page }) => {
  await setup(page);
  await expect(page.getByRole('heading', { name: 'Je range', exact: true })).toBeVisible();
  const source = await page.getByRole('button', { name: 'Choisir 12', exact: true }).boundingBox();
  const destination = await page.locator('.math-slot').first().boundingBox();
  await page.mouse.move(source!.x + 20, source!.y + 20); await page.mouse.down();
  await page.mouse.move(destination!.x + 20, destination!.y + 20, { steps: 8 }); await page.mouse.up();
  await tap(page, 11, 1); await tap(page, 13, 2); await tap(page, 14, 3); await tap(page, 15, 4);
  await expect(page.getByRole('status')).toContainText('Essaie encore');
  await page.getByRole('button', { name: 'Case 2, 11', exact: true }).click();
  await page.getByRole('button', { name: 'Case 1, 12', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Bravo');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.getByRole('button', { name: 'CONTINUER', exact: true }).evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
  await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
  for (const answer of [11, 13, 15]) {
    await expect(page.getByRole('heading', { name: 'Nombre manquant' })).toBeVisible();
    const wrong = answer === 11 ? 12 : 11;
    await tap(page, wrong); await expect(page.getByRole('status')).toContainText('Essaie encore');
    await tap(page, answer);
    await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'J’écoute' })).toBeVisible();
  const before = await page.evaluate(() => window.speechProbe.calls.length);
  await page.getByRole('button', { name: 'ÉCOUTER ENCORE' }).click();
  expect(await page.evaluate(() => window.speechProbe.calls.length)).toBe(before + 1);
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)?.text)).toBe('11');
  await tap(page, 15); await tap(page, 11);
  await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Bravo/ })).toBeVisible();
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!));
  expect((await stored()).completedSessions).toBe(1);
  expect((await stored()).eggRewards.completedSessionIds).toHaveLength(1);
  await page.reload(); expect((await stored()).completedSessions).toBe(1);
});
test('empty scope never launches math or initializes rewards', async ({ page }) => {
  await setup(page, true);
  await expect(page.getByRole('status')).toContainText('Pas de nombres');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1') || '{}').eggRewards)).toBeUndefined();
});

test('touch drag and keyboard fallback remain usable at 320px', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 844 }); await setup(page);
  const from = (await page.getByRole('button', { name: 'Choisir 11', exact: true }).boundingBox())!;
  const to = (await page.locator('.math-slot').first().boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + 20, y: from.y + 20 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + 20, y: to.y + 20 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('button', { name: 'Case 1, 11', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Choisir 12', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Case 2', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Case 2, 12', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('failed reward initialization blocks interaction and permits retry', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'milo-apprend.progress.v1' && !sessionStorage.getItem('allow-save')) throw new Error('blocked');
      original.call(this, key, value);
    };
  });
  await setup(page);
  await expect(page.getByRole('status')).toContainText('Sauvegarde indisponible');
  await expect(page.locator('.math-slot')).toHaveCount(0);
  await page.evaluate(() => sessionStorage.setItem('allow-save', 'yes'));
  await page.getByRole('button', { name: 'JOUER AUX NOMBRES' }).click();
  await expect(page.locator('.math-slot')).toHaveCount(5);
});

test('first hear prompt plays once, missing speech remains replayable and Home stays reachable', async ({ page }) => {
  await setup(page, false, true);
  expect(await page.evaluate(() => window.speechProbe.calls.filter(call => call.text === '11').length)).toBe(1);
  await page.evaluate(() => Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'ÉCOUTER ENCORE' }).click();
  await expect(page.getByText('Pas de son ?', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
  await expect(page.getByRole('button', { name: 'JE LIS', exact: true })).toBeVisible();
});

test('long explicit sequence wraps into large targets without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const numbers = Array.from({ length: 9 }, (_, i) => i + 11);
  const bank = [{ ...weeks[1], mathematics: { numbers } }];
  const automatic = mathCatalog(buildSeedProgram('long', bank), 10, { mode: 'all', selectedWeeks: [] });
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: { schemaVersion: 1, programId: 'long', weeks: bank,
    mathExercises: [{ id: 'math:long', type: 'ORDER_NUMBERS', sequence: numbers }] } }));
  await page.addInitScript(parent => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(parent)),
    { ...emptyParentData(), activeWeek: 10, activityEnabled: Object.fromEntries(automatic.exercises.map(item => [item.definition.id, false])) });
  await page.goto('/?activity=math'); await page.getByRole('button', { name: 'JOUER AUX NOMBRES' }).click();
  await expect(page.locator('.math-slot')).toHaveCount(9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const boxes = await page.locator('.math-slot').evaluateAll(elements => elements.map(el => { const rect = el.getBoundingClientRect(); return { width: rect.width, height: rect.height, top: rect.top }; }));
  expect(boxes.every(box => box.width >= 54 && box.height >= 60)).toBe(true);
  expect(new Set(boxes.map(box => box.top)).size).toBeGreaterThan(1);
});
