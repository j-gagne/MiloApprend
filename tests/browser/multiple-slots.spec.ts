import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { mockSpeech } from './speech-mock';

async function startLama(page: Page) {
  await mockSpeech(page);
  await page.goto('/?debugContent=1');
  await page.evaluate(() => {
    let state = 13;
    Math.random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  });
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Réécouter lama', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Case 1 à compléter', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Case 2 à compléter', exact: true })).toBeVisible();
}

async function drag(page: Page, source: Locator, target: Locator, touch: boolean, cancel = false) {
  await source.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('Cases introuvables');
  const x1 = from.x + from.width / 2, y1 = from.y + from.height / 2;
  const x2 = to.x + to.width / 2, y2 = to.y + to.height / 2;
  const scroll = await page.evaluate(() => scrollY);
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x2, y: y2 }] });
    await expect(page.locator('.drag-ghost')).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(x1, y1); await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 8 }); await page.mouse.up();
  }
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
}

for (const touch of [true, false]) {
  test(`LAMA multi : cases indépendantes, retrait et drag ${touch ? 'tactile' : 'souris'}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: touch ? { width: 320, height: 568 } : { width: 1280, height: 900 },
      isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await startLama(page);
    const left = page.getByRole('button', { name: 'Case 1 à compléter', exact: true });
    const right = page.getByRole('button', { name: 'Case 2 à compléter', exact: true });
    const la = page.getByRole('button', { name: 'Choisir la', exact: true });
    const ma = page.getByRole('button', { name: 'Choisir ma', exact: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await drag(page, la, right, touch); // La case 2 refuse LA même si LA est une réponse autorisée.
    await expect(right).toHaveText('?');
    await expect(page.getByRole('status')).not.toContainText('Bravo');
    await drag(page, ma, left, touch);
    await expect(left).toHaveText('?');
    if (touch) { await drag(page, ma, right, true, true); await expect(right).toHaveText('?'); }
    await drag(page, ma, right, touch); // Ordre inverse : MA d'abord.
    const filled = page.getByRole('button', { name: 'Retirer ma de la case 2', exact: true });
    await expect(filled).toBeVisible();
    await page.clock.runFor(2200);
    await expect(page.getByRole('status')).not.toContainText('Bravo');
    await drag(page, filled, left, touch); // Déplacement incorrect : la réponse reste en case 2.
    await expect(filled).toBeVisible();
    await filled.click(); // Retrait puis remplacement.
    await expect(right).toHaveText('?');
    await drag(page, ma, right, touch);
    await page.screenshot({ path: `test-results/lama-partial-${touch ? 'touch' : 'mouse'}.png` });
    await drag(page, la, left, touch);
    await expect(page.getByRole('status')).toContainText('Bravo ! lama');
    expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual(['lama', 'lama', 'lama', 'lama', 'lama']);
    await page.clock.runFor(2000);
    await expect(page.getByRole('button', { name: 'Réécouter mémé' })).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('LAMA : alternative clavier, réécoute et muet respectés sans réussite partielle', async ({ page }) => {
  await startLama(page);
  await page.getByRole('button', { name: 'Case 2 à compléter', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Choisir ma', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Retirer ma de la case 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Réécouter lama' }).click();
  await page.getByRole('button', { name: 'Couper le son' }).click();
  await page.getByRole('button', { name: 'Choisir mu', exact: true }).click();
  await page.getByRole('button', { name: 'Choisir la', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Bravo ! lama');
  expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual(['lama', 'lama']);
});
