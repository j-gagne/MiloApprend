import { test, expect } from '@playwright/test';
import { silentWeek } from '../fixtures/silent-program';
import { emptyParentData } from '../../src/parent/model';
import { mockSpeech } from './speech-mock';

test('Reading preserves complete words, omits silent sliders and completes audible pieces only', async ({ page }) => {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: { schemaVersion: 1, programId: 'silent', weeks: [silentWeek] } }));
  await page.addInitScript(data => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), { ...emptyParentData(), activeWeek: 1, questionCount: 6 });
  await page.goto('/MiloApprend/');
  await page.getByRole('button', { name: 'JE LIS', exact: true }).click();
  const expected: Record<string, string[]> = { rue: ['ru'], fée: ['fé'], fumée: ['fu', 'mé'], chat: ['cha'], nid: ['nid'], lit: ['lit'] };
  const seen: string[] = [];
  for (let i = 0; i < 6; i++) {
    const text = await page.locator('.reading-text').innerText();
    seen.push(text);
    const sliders = page.getByRole('slider');
    await expect(sliders).toHaveCount(expected[text].length);
    if (['rue', 'fée', 'fumée', 'chat'].includes(text)) {
      const silent = page.locator('.reading-text .silent-segment');
      await expect(silent).toHaveText(text.at(-1)!);
      await expect(silent).toHaveCSS('color', 'rgb(196, 75, 69)');
      expect(await silent.evaluate(node => {
        const actual = getComputedStyle(node), parent = getComputedStyle(node.parentElement!);
        return actual.fontFamily === parent.fontFamily && actual.fontSize === parent.fontSize
          && actual.fontWeight === parent.fontWeight && actual.textDecorationLine === 'none';
      })).toBe(true);
      const thumb = (await sliders.first().locator('.pronunciation-thumb').boundingBox())!;
      await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
      await page.mouse.down();
      await page.mouse.move(thumb.x + thumb.width, thumb.y + thumb.height / 2, { steps: 3 });
      await expect(silent).toHaveCSS('color', 'rgb(196, 75, 69)');
      await page.mouse.up();
    }
    for (const [index, piece] of expected[text].entries()) {
      await expect(sliders.nth(index)).toHaveAttribute('aria-label', new RegExp(`^Prononcer ${piece},`));
      await sliders.nth(index).press('End');
    }
    await expect(page.locator('.reading-dot.done')).toHaveCount(i + 1);
    if (i < 5) await page.getByRole('button', { name: 'Exercice suivant' }).click();
  }
  expect(seen.sort()).toEqual(Object.keys(expected).sort());
  expect(await page.evaluate(() => window.speechProbe.calls)).toEqual([]);
  await expect(page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' })).toBeVisible();
});

test('Complete speaks ru then rue, never the silent e, and only asks for ru', async ({ page }) => {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: {
    schemaVersion: 1, programId: 'silent-audio', weeks: [{ ...silentWeek,
      words: silentWeek.words.slice(0, 1), syllables: ['ru', 'ré'], readingExercises: [],
    }],
  } }));
  await page.addInitScript(data => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), { ...emptyParentData(), activeWeek: 1, questionCount: 3 });
  await page.goto('/MiloApprend/');
  await page.getByRole('button', { name: 'COMPLÈTE', exact: true }).click();
  await expect(page.locator('.word-slot')).toHaveCount(1);
  await expect(page.locator('.word-segment')).toHaveText('e');
  await expect(page.locator('.word-segment.silent-segment')).toHaveCSS('color', 'rgb(196, 75, 69)');
  await expect(page.locator('.word-segment.silent-segment')).toHaveCSS('text-decoration-line', 'none');
  await expect(page.locator('.answer-tile').filter({ hasText: /^e$/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.speechProbe.calls.map(call => call.text))).toEqual(['ru', 'comme dans', 'rue']);
  await page.evaluate(() => { window.speechProbe.calls = []; });
  await page.getByRole('button', { name: 'Découper rue', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.speechProbe.calls.map(call => call.text))).toEqual(['ru', 'rue']);
  await expect(page.locator('.word-segment.silent-segment')).toHaveCSS('color', 'rgb(196, 75, 69)');
});

test('sentence silent spans stay red through line highlighting and resize; unsegmented phrases infer nothing', async ({ page }) => {
  await mockSpeech(page);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: {
    schemaVersion: 1, programId: 'silent-colors', weeks: [{ number: 1, label: '1', letters: ['a', 'e'],
      syllables: ['vu', 'la', 'ru'], toolWords: ['Il'], words: [],
      sentences: [{ id: 'sentence-rue', display: 'Il a vu la rue.' }],
      readingExercises: [
        { id: 'reading:annotated', displayedUnits: [{ unitId: 'sentence-rue', segmentUnitIds: ['tool-word-Il', 'letter-a', 'syllable-vu', 'syllable-la', 'syllable-ru', { unitId: 'letter-e', silent: true }] }] },
        { id: 'reading:whole', targetId: 'sentence-rue' },
      ],
    }],
  } }));
  await page.addInitScript(data => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), { ...emptyParentData(), activeWeek: 1 });
  await page.goto('/MiloApprend/');
  await page.getByRole('button', { name: 'JE LIS', exact: true }).click();
  for (const width of [375, 390, 768]) {
    await page.setViewportSize({ width, height: 1024 });
    const silent = page.locator('.reading-line .silent-segment');
    await expect(silent).toHaveText('e');
    for (const slider of await page.getByRole('slider').all()) await slider.press('End');
    await expect(page.locator('.reading-line-word.is-read .silent-segment')).toHaveCSS('color', 'rgb(196, 75, 69)');
    expect(await silent.evaluate(node => {
      const style = getComputedStyle(node), word = getComputedStyle(node.parentElement!);
      return style.fontFamily === word.fontFamily && style.fontSize === word.fontSize
        && style.fontWeight === word.fontWeight && style.textDecorationLine === 'none';
    })).toBe(true);
  }
  await expect(page.locator('.reading-dot.done')).toHaveCount(1);
  await page.getByRole('button', { name: 'Exercice suivant' }).click();
  await expect(page.locator('.reading-line .silent-segment')).toHaveCount(0);
});
