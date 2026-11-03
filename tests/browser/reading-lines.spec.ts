import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';

const long = 'Le petit chat se promène dans le jardin avec Milo.';
async function setup(page: Page, fallback = false) {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.abort());
  const exercises = ['Il a lu.', long, 'La fée a un bijou.'].map((display, i) => ({
    id: `lines-${i}`, displayedUnits: [{ display, isSentence: true, segments: [{ unitId: `sentence-${i}`, text: display }] }],
  }));
  await page.route('**/src/content/reading-preview.ts*', route => route.fulfill({ contentType: 'application/javascript',
    body: `export function readingPreviewExercises() { return ${JSON.stringify(exercises)}; }` }));
  if (fallback) await page.addInitScript(() => {
    Range.prototype.getBoundingClientRect = () => { throw new Error('No text measurement'); };
  });
  await page.goto('/MiloApprend/?preview=reading');
  await expect(page.locator('.reading-unit-sentence')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const width of [375, 390, 768]) {
  test(`${width}px: lines preserve words, independent progress and sentence navigation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    await setup(page);
    await expect(page.locator('.reading-line')).toHaveCount(1);
    await expect(page.getByRole('slider')).toHaveCount(1);
    await page.getByRole('button', { name: 'Exercice suivant' }).click();
    const lines = page.locator('.reading-line');
    await expect.poll(() => lines.count()).toBeGreaterThan(1);
    const count = await lines.count();
    await expect(page.getByRole('slider')).toHaveCount(count);
    await expect(page.getByRole('navigation', { name: 'Exercices de lecture' })).toHaveCount(1);
    expect((await lines.locator('.reading-text').allTextContents()).join(' ')).toBe(long);
    expect(await lines.evaluateAll(nodes => nodes.every(node => {
      const text = node.querySelector('.reading-text')!;
      const slider = node.querySelector('[role="slider"]')!;
      const bounds = text.getBoundingClientRect();
      return bounds.left >= 20 && bounds.right <= innerWidth - 20
        && text.scrollWidth <= text.clientWidth + 1
        && slider.getBoundingClientRect().top >= bounds.bottom
        && [...text.children].every(word => {
          const range = document.createRange(); range.selectNodeContents(word);
          return range.getClientRects().length === 1;
        });
    }))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await lines.first().getByRole('slider').press('ArrowRight');
    await expect(lines.first().locator('.is-read')).toHaveCount(1);
    await expect(lines.nth(1).locator('.is-read')).toHaveCount(0);
    await expect(lines.nth(1).getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    await lines.first().getByRole('slider').press('End');
    await expect(page.locator('.reading-dot.done')).toHaveCount(0);
    await page.getByRole('button', { name: 'Exercice suivant' }).click();
    for (const slider of await page.getByRole('slider').all()) await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await page.getByRole('button', { name: 'Exercice précédent' }).click();
    await expect(lines.first().getByRole('slider')).toHaveAttribute('aria-valuenow', '100');
    for (const slider of await page.getByRole('slider').all()) await slider.press('End');
    await expect(page.locator('.reading-dot.done')).toHaveCount(1);
  });
}

test('width changes regroup words without granting completion or mixing exercises', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await setup(page);
  await page.getByRole('button', { name: 'Exercice suivant' }).click();
  const initialCount = await page.locator('.reading-line').count();
  await page.getByRole('slider').first().press('End');
  // Stay within the mobile typography breakpoint so a wider container fits more words.
  await page.setViewportSize({ width: 568, height: 375 });
  await expect.poll(() => page.locator('.reading-line').count()).toBeLessThan(initialCount);
  await expect(page.locator('.reading-dot.done')).toHaveCount(0);
  expect((await page.locator('.reading-line .reading-text').allTextContents()).join(' ')).toBe(long);
  await page.setViewportSize({ width: 375, height: 844 });
  await expect(page.locator('.reading-line')).toHaveCount(initialCount);
  await expect(page.getByRole('slider').first()).toHaveAttribute('aria-valuenow', '100');
  for (const slider of await page.getByRole('slider').all()) await slider.press('End');
  await expect(page.locator('.reading-dot.done')).toHaveCount(1);
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const slider of await page.getByRole('slider').all()) await expect(slider).toHaveAttribute('aria-valuenow', '100');
});

test('unavailable text measurement falls back to independently readable words', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await setup(page, true);
  await expect(page.locator('.reading-line')).toHaveCount(3);
  for (const slider of await page.getByRole('slider').all()) await slider.press('End');
  await expect(page.locator('.reading-dot.done')).toHaveCount(1);
});
