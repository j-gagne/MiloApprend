import { test, expect } from '@playwright/test';
import { emptyParentData } from '../../src/parent/model';
import { mockSpeech } from './speech-mock';

test('375px: production sentences stay compact, contained and touch-readable', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await mockSpeech(page);
  // Browser-only content fixture: no changes to the shared program.
  const sentences = ['Il a lu.', 'La fée a un bijou.', 'Il a un bonbon sur la table.', 'Le petit chat se promène dans le jardin avec Milo.'];
  const ids = sentences.map((_, i) => `sentence-mobile-${i}`);
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: {
    schemaVersion: 1, programId: 'mobile-sentences', weeks: [{ number: 1, label: '1',
      letters: ['a'], syllables: ['ma'], toolWords: [], words: [{ id: 'word-mobile', display: 'ami' }],
      sentences: sentences.map((display, i) => ({ id: ids[i], display })),
      readingExercises: [...ids, 'letter-a', 'syllable-ma'].map((targetId, i) => ({ id: `reading:mobile-${i}`, targetId })),
    }],
  } }));
  await page.addInitScript(parent => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(parent)),
    { ...emptyParentData(), activeWeek: 1, questionCount: 9 });
  await page.goto('/MiloApprend/');
  await page.getByRole('button', { name: 'JE LIS', exact: true }).click();
  await expect(page.locator('.reading-dot')).toHaveCount(7);
  await page.evaluate(() => document.fonts.ready);
  const seen: string[] = [];
  const cdp = await context.newCDPSession(page);
  for (let i = 0; i < 7; i++) {
    const unit = page.locator('.reading-unit');
    const display = (await unit.getAttribute('aria-label'))!;
    seen.push(display);
    const isSentence = sentences.includes(display);
    const geometry = await unit.evaluate(node => {
      const text = node.querySelector('.reading-line .reading-text') ?? node.querySelector('.reading-text')!;
      const slider = node.querySelector('[role="slider"]')!;
      const textBox = text.getBoundingClientRect();
      const sliderBox = slider.getBoundingClientRect();
      const box = (node.querySelector('.reading-line') ?? node).getBoundingClientRect();
      return { fontSize: parseFloat(getComputedStyle(text).fontSize), gap: sliderBox.top - textBox.bottom,
        height: box.height, sliderHeight: sliderBox.height,
        contained: [text, slider].every(element => {
          const rect = element.getBoundingClientRect();
          return rect.left >= 20 && rect.right <= innerWidth - 20 && element.scrollWidth <= element.clientWidth + 1;
        }),
        wordsIntact: [...text.querySelectorAll('.reading-line-word')].every(word => {
          const range = document.createRange();
          range.selectNodeContents(word);
          return range.getClientRects().length === 1;
        }),
      };
    });
    expect(geometry.contained).toBe(true);
    expect(geometry.wordsIntact).toBe(true);
    if (isSentence) {
      expect(geometry.fontSize).toBeGreaterThanOrEqual(30);
      expect(geometry.fontSize).toBeLessThanOrEqual(38);
      expect(geometry.gap).toBeGreaterThanOrEqual(4);
      expect(geometry.gap).toBeLessThanOrEqual(12);
      expect(geometry.height).toBeLessThan(240);
      expect(geometry.sliderHeight).toBeLessThanOrEqual(56);
    } else {
      expect(geometry.fontSize).toBe(48);
      expect(geometry.sliderHeight).toBe(68);
    }
    await expect(page.getByRole('navigation', { name: 'Exercices de lecture' })).toBeInViewport();
    for (const slider of await page.getByRole('slider').all()) {
    const thumb = (await slider.locator('.pronunciation-thumb').boundingBox())!;
    const rail = (await slider.boundingBox())!;
    expect(thumb.width).toBeGreaterThanOrEqual(44);
    const point = { x: thumb.x + thumb.width / 2, y: thumb.y + thumb.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: rail.x + rail.width - thumb.width / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
    }
    await expect(page.locator('.reading-dot.done')).toHaveCount(i + 1);
    if (i < 6) await page.getByRole('button', { name: 'Exercice suivant' }).click();
  }
  expect(seen.sort()).toEqual([...sentences, 'a', 'ma', 'ami'].sort());
  await expect(page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' })).toBeInViewport();
  await cdp.detach();
});
