import { test, expect, type Page } from '@playwright/test';
import { emptyParentData } from '../../src/parent/model';
import { DEFAULT_QUESTION_COUNT } from '../../src/game/play-settings';
import type { Progress } from '../../src/services/progress';
import { mockSpeech } from './speech-mock';

const key = 'milo-apprend.progress.v1';
const url = '/MiloApprend/?preview=reading';
declare global { interface Window { readingDings: number; readingRejectSave: boolean; readingAttempt?: Progress } }
async function setup(page: Page, count = DEFAULT_QUESTION_COUNT, progress: Progress = { completedSessions: 0, selectedCharacterId: 'lion' }, rejectSave = false) {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.abort());
  await page.addInitScript(({ data, progress, key, rejectSave }) => {
    if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data));
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(progress));
    window.readingRejectSave = rejectSave;
    window.readingDings = 0;
    // Observe the real Web Audio output: the existing success sound starts three tones.
    const startTone = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when) {
      window.readingDings += 1 / 3;
      startTone.call(this, when);
    };
    const save = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && window.readingRejectSave) { window.readingAttempt = JSON.parse(value); throw new Error('test storage failure'); }
      save.call(this, name, value);
    };
  }, { data: { ...emptyParentData(), activeWeek: 5, questionCount: count }, progress, key, rejectSave });
  await page.goto(url);
  await expect(page.getByRole('main', { name: 'Je lis' })).toBeVisible();
}
const stored = (page: Page): Promise<Progress> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
const next = (page: Page) => page.getByRole('button', { name: 'Exercice suivant' }).click();
const previous = (page: Page) => page.getByRole('button', { name: 'Exercice précédent' }).click();
test('preview phrase wraps five displayed words with six required pronunciation sliders', async ({ page }) => {
  await setup(page);
  await next(page); await next(page); await next(page);
  await expect(page.locator('.reading-text')).toHaveText(['Il', 'a', 'vu', 'le', 'lila.']);
  await expect(page.locator('.reading-unit')).toHaveCount(5);
  const word = page.getByRole('group', { name: 'lila.', exact: true });
  await expect(word.getByRole('slider')).toHaveCount(2);
  await expect(word.getByRole('slider').nth(0)).toHaveAttribute('aria-label', 'Prononcer li, morceau 5');
  await expect(word.getByRole('slider').nth(1)).toHaveAttribute('aria-label', 'Prononcer la, morceau 6');
  await expect(page.getByRole('slider')).toHaveCount(6);
  await expect(page.locator('.reading-dot')).toHaveCount(DEFAULT_QUESTION_COUNT + 1);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('.reading-units')).toHaveCSS('flex-wrap', 'wrap');
    await expect(page.locator('.reading-units > .reading-unit')).toHaveCount(5);
    for (const unit of await page.locator('.reading-unit').all()) {
      await expect(unit.locator('.reading-text')).toHaveCSS('white-space', 'nowrap');
      await expect(unit).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(unit).toHaveCSS('border-top-style', 'none');
      await expect(unit).toHaveCSS('display', 'grid');
      await expect(unit.locator('.reading-unit-sliders')).toHaveCSS('display', 'flex');
      await expect(unit.locator('.reading-unit-sliders')).toHaveCSS('flex-wrap', 'nowrap');
      await expect(unit.locator('.reading-text')).toBeVisible();
    }
    await expect(word.getByRole('slider').nth(0)).toBeVisible();
    await expect(word.getByRole('slider').nth(1)).toBeVisible();
    await expect(word.locator('.reading-unit-sliders')).toHaveCSS('direction', 'ltr');
    expect(await word.evaluate(node => {
      const group = getComputedStyle(node.querySelector('.reading-unit-sliders')!);
      const thumb = getComputedStyle(node.querySelector('.pronunciation-thumb')!);
      return parseFloat(group.columnGap) > 0 && parseFloat(group.columnGap) < parseFloat(thumb.width) / 4;
    })).toBe(true);
    for (const slider of await word.getByRole('slider').all()) {
      await expect(slider.locator('.pronunciation-rail')).toBeVisible();
      await expect(slider).toHaveCSS('overflow', 'hidden');
      expect(await slider.evaluate(node => {
        const capsule = getComputedStyle(node);
        const rail = getComputedStyle(node.querySelector('.pronunciation-rail')!);
        const thumb = getComputedStyle(node.querySelector('.pronunciation-thumb')!);
        return parseFloat(capsule.paddingLeft) > parseFloat(rail.borderLeftWidth)
          && parseFloat(capsule.height) > parseFloat(thumb.height)
          && rail.inset === '0px';
      })).toBe(true);
    }
  }
  for (let i = 0; i < 5; i++) await page.getByRole('slider').nth(i).press('End');
  await expect(word.getByRole('slider').nth(0)).toHaveAttribute('aria-valuenow', '100');
  await expect(word.getByRole('slider').nth(1)).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.reading-dot.done')).toHaveCount(0);
  expect(await page.evaluate(() => window.readingDings)).toBe(0);
  await page.getByRole('slider').nth(5).press('End');
  await expect(page.locator('.reading-dot').nth(3)).toHaveClass('reading-dot done');
  await page.getByRole('slider').nth(5).press('Home');
  await page.getByRole('slider').nth(5).press('End');
  expect(await page.evaluate(() => window.readingDings)).toBe(1);
});

test('short preview reaches both phrases, with independent non-overlapping sliders and seven whole words', async ({ page }) => {
  await setup(page, 3);
  await expect(page.locator('.reading-dot')).toHaveCount(5);
  await next(page); await next(page); await next(page);
  const lila = page.getByRole('group', { name: 'lila.', exact: true });
  await expect(lila.locator('.reading-text')).toHaveText('lila.');
  await expect(lila.getByRole('slider')).toHaveCount(2);
  await expect(lila.locator('.reading-unit-sliders')).toHaveCSS('display', 'flex');
  for (const segment of await lila.locator('.reading-segment').all()) {
    await expect(segment).toHaveCSS('position', 'static');
    await expect(segment).toHaveCSS('flex-shrink', '0');
    await expect(segment).toHaveCSS('pointer-events', 'auto');
    await expect(segment.getByRole('slider')).toHaveAttribute('aria-disabled', 'false');
  }
  await lila.getByRole('slider').nth(1).press('End');
  await expect(lila.getByRole('slider').nth(0)).toHaveAttribute('aria-valuenow', '0');
  await next(page);
  await expect(page.getByRole('button', { name: 'Exercice suivant' })).toBeDisabled();
  await expect(page.locator('.reading-text')).toHaveText(['Le', 'lion', 'se', 'promène', 'dans', 'la', 'savane.']);
  await expect(page.locator('.reading-unit')).toHaveCount(7);
  await expect(page.getByRole('slider')).toHaveCount(7);
  await expect(page.getByRole('group', { name: 'savane.', exact: true }).getByRole('slider')).toHaveAttribute('aria-label', 'Prononcer savane, morceau 7');
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('.reading-units')).toHaveCSS('flex-wrap', 'wrap');
    await expect(page.locator('.reading-units > .reading-unit')).toHaveCount(7);
    for (const unit of await page.locator('.reading-unit').all()) {
      await expect(unit.locator('.reading-text')).toHaveCSS('white-space', 'nowrap');
      await expect(unit.getByRole('slider')).toHaveCount(1);
      await expect(unit.getByRole('slider')).toBeVisible();
    }
  }
  for (const slider of await page.getByRole('slider').all()) await slider.press('End');
  await expect(page.locator('.reading-dot').last()).toHaveClass('reading-dot done');
  await expect(page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' })).toHaveCount(0);
  await previous(page);
  await expect(lila.getByRole('slider').nth(1)).toHaveAttribute('aria-valuenow', '100');
  await lila.getByRole('slider').nth(1).press('Home');
  await expect(lila.getByRole('slider').nth(1)).toHaveAttribute('aria-valuenow', '0');
});

test('reading a uses the main game pedagogical font', async ({ page }) => {
  await setup(page);
  await next(page);
  await expect(page.locator('.reading-text')).toHaveText('a');
  const fonts = await page.locator('.reading-text').evaluate(async node => {
    const reference = document.createElement('span');
    reference.className = 'word-segment'; reference.textContent = 'a';
    document.body.append(reference);
    const actual = getComputedStyle(node);
    const expected = getComputedStyle(reference);
    const comparison = { actualFamily: actual.fontFamily, expectedFamily: expected.fontFamily,
      actualWeight: actual.fontWeight, expectedWeight: expected.fontWeight };
    const loaded = await document.fonts.load(`${actual.fontWeight} 48px Andika`, 'a');
    reference.remove();
    return { ...comparison, loaded: loaded.length > 0 };
  });
  expect(fonts.actualFamily).toBe(fonts.expectedFamily);
  expect(fonts.actualFamily).toContain('Andika');
  expect(fonts.actualWeight).toBe(fonts.expectedWeight);
  expect(fonts.loaded).toBe(true);
});

test('three unequal segments use the same single-word slider group', async ({ page }) => {
  // Replace only the data provider in this test; render the real App, Reading and sliders.
  const exercises = [{ id: 'three-segment-fixture', displayedUnits: [{ display: 'animal', segments: [
    { unitId: 'test-a', text: 'a' }, { unitId: 'test-ni', text: 'ni' }, { unitId: 'test-mal', text: 'mal' },
  ] }] }];
  await page.route('**/src/content/reading-preview.ts*', route => route.fulfill({ contentType: 'application/javascript',
    body: `export function readingPreviewExercises() { return ${JSON.stringify(exercises)}; }` }));
  await setup(page);
  const word = page.getByRole('group', { name: 'animal', exact: true });
  await expect(page.locator('.reading-unit')).toHaveCount(1);
  await expect(word.locator('.reading-text')).toHaveText('animal');
  await expect(word.locator('.reading-unit-sliders')).toHaveCount(1);
  await expect(word.getByRole('slider')).toHaveCount(3);
  await expect(word.getByRole('slider').nth(0)).toHaveAttribute('aria-disabled', 'false');
  for (const i of [1, 2]) {
    await expect(word.getByRole('slider').nth(i)).toHaveAttribute('aria-disabled', 'false');
  }
  await expect(word.locator('.reading-segment-size')).toHaveText(['a', 'ni', 'mal']);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await expect(word.locator('.reading-unit-sliders')).toHaveCSS('flex-wrap', 'nowrap');
    await expect(word.locator('.reading-unit-sliders')).toHaveCSS('direction', 'ltr');
    for (let i = 0; i < 3; i++) {
      const slider = word.getByRole('slider').nth(i);
      await expect(slider).toHaveAttribute('aria-label', `Prononcer ${['a', 'ni', 'mal'][i]}, morceau ${i + 1}`);
      await expect(slider).toBeVisible();
      await expect(slider.locator('.pronunciation-rail')).toBeVisible();
    }
  }
  await word.getByRole('slider').nth(0).press('End');
  await expect(word.getByRole('slider').nth(0)).toHaveAttribute('aria-disabled', 'false');
  await expect(word.getByRole('slider').nth(1)).toHaveAttribute('aria-disabled', 'false');
  await expect(word.getByRole('slider').nth(2)).toHaveAttribute('aria-disabled', 'false');
  await expect(word.getByRole('slider').nth(1)).toHaveAttribute('aria-valuenow', '0');
  await word.getByRole('slider').nth(1).press('End');
  await expect(word.getByRole('slider').nth(2)).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('.reading-dot.done')).toHaveCount(0);
  await word.getByRole('slider').nth(2).press('End');
  await expect(word.locator('[aria-disabled="true"]')).toHaveCount(0);
  await expect(page.locator('.reading-dot.done')).toHaveCount(1);
  expect(await page.evaluate(() => window.readingDings)).toBe(1);
});

test('the same displayed word can explicitly request just one full track', async ({ page }) => {
  const exercises = [{ id: 'whole-fixture', displayedUnits: [{ display: 'lila.',
    segments: [{ unitId: 'test-lila', text: 'lila' }] }] }];
  await page.route('**/src/content/reading-preview.ts*', route => route.fulfill({ contentType: 'application/javascript',
    body: `export function readingPreviewExercises() { return ${JSON.stringify(exercises)}; }` }));
  await setup(page);
  const word = page.getByRole('group', { name: 'lila.', exact: true });
  await expect(word.locator('.reading-text')).toHaveText('lila.');
  await expect(word.getByRole('slider')).toHaveCount(1);
  await expect(word.locator('.pronunciation-rail')).toBeVisible();
  await word.getByRole('slider').press('End');
  await expect(page.locator('.reading-dot.done')).toHaveCount(1);
});

test('segments retain comfortable gesture widths independent of the surrounding word', async ({ page }) => {
  const unit = (display: string, texts: string[]) => ({ display, segments: texts.map(text => ({ unitId: `test-${text}`, text })) });
  const exercises = [{ id: 'width-fixture', displayedUnits: [unit('le', ['le']), unit('li', ['li']), unit('la', ['la']),
    unit('lila.', ['li', 'la']), unit('lila', ['lila']), unit('salami', ['sa', 'la', 'mi'])] }];
  await page.route('**/src/content/reading-preview.ts*', route => route.fulfill({ contentType: 'application/javascript',
    body: `export function readingPreviewExercises() { return ${JSON.stringify(exercises)}; }` }));
  await setup(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => document.fonts.ready);
    const widths = await page.locator('.reading-unit').evaluateAll(units => units.map(unit =>
      Array.from(unit.querySelectorAll('[role="slider"]'), slider => parseFloat(getComputedStyle(slider).width))));
    // Compare contexts, not exact pixel coordinates or font metrics.
    expect(widths[3]).toEqual([widths[1][0], widths[2][0]]);
    expect(widths[5][1]).toBe(widths[2][0]);
    expect(widths[4][0]).toBeGreaterThan(widths[1][0]);
    expect(widths[5]).toHaveLength(3);
    for (const segment of await page.locator('.reading-segment').all()) {
      await expect(segment.locator('.reading-segment-size')).toHaveAttribute('aria-hidden', 'true');
      await expect(segment.locator('.reading-segment-size')).toHaveCSS('visibility', 'hidden');
      await expect(segment).toHaveCSS('flex-grow', '0');
      expect(await segment.evaluate(node => {
        const slider = getComputedStyle(node.querySelector('[role="slider"]')!);
        const thumb = getComputedStyle(node.querySelector('.pronunciation-thumb')!);
        return parseFloat(slider.width) >= parseFloat(thumb.width) * 2;
      })).toBe(true);
    }
  }
});

async function finishAll(page: Page) {
  const count = await page.locator('.reading-dot').count();
  for (let i = 0; i < count; i++) {
    for (const slider of await page.getByRole('slider').all()) await slider.press('End');
    if (i < count - 1) await next(page);
  }
}

test('real Reading entry: independent sliders, skip/revisit, once-only ding, theme and reward', async ({ page }) => {
  await setup(page);
  const count = DEFAULT_QUESTION_COUNT + 1;
  await expect(page.locator('.reading-dot')).toHaveCount(count);
  await expect(page.getByRole('slider')).toHaveCount(1);
  await expect(page.locator('.reading-unit')).toHaveCount(1);
  await expect(page.locator('.reading-text')).toHaveText(['m']);
  await expect(page.getByRole('button', { name: 'Exercice précédent' })).toBeDisabled();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'lion');
  expect(await page.locator('.reading-dot').first().evaluate(el => getComputedStyle(el).borderTopColor)).toBe(
    await page.evaluate(() => { const node = document.createElement('span'); node.style.color = 'var(--theme-primary)'; document.body.append(node); const color = getComputedStyle(node).color; node.remove(); return color; }));
  await next(page); await next(page);
  await expect(page.getByRole('slider')).toHaveCount(2);
  await expect(page.locator('.reading-unit')).toHaveCount(2);
  await expect(page.locator('.reading-text')).toHaveText(['m', 'a']);
  await page.getByRole('slider').nth(0).press('End');
  await expect(page.getByRole('slider').nth(1)).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.reading-dot.done')).toHaveCount(0);
  await page.getByRole('slider').nth(0).press('Home');
  await page.getByRole('slider').nth(1).press('End');
  await expect(page.locator('.reading-dot.done')).toHaveCount(1);
  await expect(page.locator('.reading-dot').nth(2)).toHaveAttribute('aria-current', 'step');
  expect(await page.evaluate(() => window.readingDings)).toBe(1);
  await next(page); await previous(page);
  await expect(page.getByRole('slider').nth(0)).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('slider').nth(0).press('End');
  expect(await page.evaluate(() => window.readingDings)).toBe(1);
  for (let i = 2; i < count - 1; i++) await next(page);
  await expect(page.getByRole('button', { name: 'Exercice suivant' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' })).toHaveCount(0);
  for (let i = 0; i < count - 1; i++) await previous(page);
  await finishAll(page);
  expect(await page.evaluate(() => window.readingDings)).toBeCloseTo(count);
  expect(await page.evaluate(() => window.speechProbe.calls)).toEqual([]);
  await page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' }).click();
  await expect(page.locator('.lion-reveal-scene')).toHaveAttribute('data-stage', '1');
  expect((await stored(page)).completedSessions).toBe(1);
  await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
  await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'JE LIS', exact: true })).toBeVisible();
});

test('mouse and touch move the visible thumb both ways on a phone-sized screen', async ({ page, context }) => {
  await setup(page, 3);
  await expect(page.locator('.reading-dot')).toHaveCount(5);
  const slider = page.getByRole('slider');
  const box = (await slider.boundingBox())!;
  const thumb = (await page.locator('.pronunciation-thumb').boundingBox())!;
  const y = thumb.y + thumb.height / 2;
  const inset = await slider.evaluate(node => parseFloat(getComputedStyle(node).paddingLeft));
  const travel = box.width - thumb.width - inset * 2;
  await page.mouse.move(thumb.x + thumb.width / 2, y); await page.mouse.down();
  await page.mouse.move(thumb.x + thumb.width / 2 + travel / 2, y, { steps: 4 });
  await expect(slider).toHaveAttribute('aria-valuenow', '50');
  await page.mouse.move(thumb.x + thumb.width / 2 + travel, y, { steps: 4 }); await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
  const right = (await page.locator('.pronunciation-thumb').boundingBox())!;
  expect(right.x).toBeGreaterThan(thumb.x);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x + right.width / 2, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: thumb.x + thumb.width / 2, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.reading-dot.done')).toHaveCount(1);
  expect(await page.evaluate(() => window.readingDings)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await cdp.detach();
});

test('initial persistence failure blocks play and retry preserves the exact reward draw', async ({ page }) => {
  await setup(page, 3, undefined, true);
  await expect(page.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('slider').press('End');
  await expect(page.locator('.reading-dot.done')).toHaveCount(0);
  const attempted = await page.evaluate(() => window.readingAttempt!.eggRewards!.currentEgg);
  await page.evaluate(() => { window.readingRejectSave = false; Math.random = () => 0; });
  await page.getByRole('button', { name: 'RÉESSAYER', exact: true }).click();
  await expect(page.getByRole('slider')).toHaveAttribute('aria-disabled', 'false');
  expect((await stored(page)).eggRewards!.currentEgg).toEqual(attempted);
  expect(await page.evaluate(() => window.readingDings)).toBe(0);
});

test('completion retry, pending variant, reload and Collection reuse production persistence', async ({ page }) => {
  const progress: Progress = { completedSessions: 4, selectedCharacterId: 'tiger', eggRewards: {
    currentEgg: { progress: 4, sessionsToHatch: 5, pendingAnimalId: 'lion', pendingVariantId: 'waving' },
    completedSessionIds: ['a', 'b', 'c', 'd'], hatches: [],
  } };
  await setup(page, 3, progress);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'tiger');
  await finishAll(page);
  await page.evaluate(() => { window.readingRejectSave = true; });
  await page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' }).click();
  expect(await stored(page)).toEqual(progress);
  const failedId = await page.evaluate(() => window.readingAttempt!.eggRewards!.pendingTransition!.sessionId);
  await page.evaluate(() => { window.readingRejectSave = false; });
  await page.getByRole('button', { name: 'RÉESSAYER LA SAUVEGARDE' }).click();
  await expect(page.locator('.lion-reveal-scene')).toHaveAttribute('data-stage', '5');
  await expect(page.locator('.lion-reveal-scene svg.lion')).toHaveAttribute('data-variant', 'waving');
  const saved = await stored(page);
  expect(saved.completedSessions).toBe(5);
  expect(saved.eggRewards!.completedSessionIds).toEqual(['a', 'b', 'c', 'd', failedId]);
  expect(saved.eggRewards!.hatches).toHaveLength(1);
  await page.reload();
  await expect(page.locator('.lion-reveal-scene')).toHaveAttribute('data-stage', '5');
  expect(await stored(page)).toEqual(saved);
  await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
  await page.getByRole('button', { name: 'MA COLLECTION', exact: true }).click();
  await expect(page.locator('.collection-grid svg.lion')).toHaveAttribute('data-variant', 'waving');
});
