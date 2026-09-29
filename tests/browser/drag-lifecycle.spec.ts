import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';

async function setup(page: Page) {
  await mockSpeech(page);
  await page.addInitScript(data => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), chainParentData(1));
  await page.goto('/');
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
}
const tile = (page: Page) => page.getByRole('button', { name: 'Choisir la', exact: true });
async function begin(page: Page) {
  const source = tile(page);
  await source.evaluate(el => el.addEventListener('pointerdown', event => el.setAttribute('data-pointer', String((event as PointerEvent).pointerId)), { once: true }));
  const box = (await source.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 30, { steps: 3 });
  await expect(page.locator('.drag-ghost')).toHaveCount(1);
}
async function clean(page: Page) {
  await expect(page.locator('.drag-ghost,.dragging,.word-slot.over')).toHaveCount(0);
  await expect(tile(page)).toBeEnabled();
  expect(await tile(page).evaluate(el => getComputedStyle(el).transform)).toBe('none');
}
for (const interruption of ['outside', 'pointercancel', 'lostcapture', 'blur', 'pagehide', 'hidden', 'contextmenu', 'native-drag'] as const) {
  test(`drag cleanup: ${interruption}, immediate reuse and successful drop`, async ({ page }) => {
    await setup(page); await begin(page);
    if (interruption === 'outside') { await page.mouse.move(5, 5); await page.mouse.up(); }
    else {
      await tile(page).evaluate((el, kind) => {
        const pointerId = Number(el.getAttribute('data-pointer'));
        if (kind === 'pointercancel') window.dispatchEvent(new PointerEvent('pointercancel', { pointerId }));
        if (kind === 'lostcapture') el.releasePointerCapture(pointerId);
        if (kind === 'blur' || kind === 'pagehide') window.dispatchEvent(new Event(kind));
        if (kind === 'hidden') { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); }
        if (kind === 'contextmenu') el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
        if (kind === 'native-drag') el.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true }));
      }, interruption);
      await page.mouse.move(8, 8);
      await expect(page.locator('.drag-ghost,.dragging,.word-slot.over')).toHaveCount(0);
      await page.mouse.up();
    }
    await clean(page);
    await begin(page);
    const target = (await page.getByRole('button', { name: 'Case 1 à compléter', exact: true }).boundingBox())!;
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
    await page.mouse.up();
    await expect(page.getByRole('button', { name: 'Retirer la de la case 1', exact: true })).toBeVisible();
    await expect(page.locator('.drag-ghost,.dragging,.word-slot.over')).toHaveCount(0);
  });
}

test('rerenders preserve a live drag; exit cleans it; tap-slot/tile and keyboard remain usable', async ({ page }) => {
  await setup(page); await begin(page);
  await page.getByRole('button', { name: 'Couper le son' }).evaluate(el => (el as HTMLButtonElement).click());
  await expect(page.locator('.drag-ghost')).toHaveCount(1);
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).evaluate(el => (el as HTMLButtonElement).click());
  await page.mouse.up();
  await expect(page.locator('.drag-ghost,.dragging')).toHaveCount(0);
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await page.getByRole('button', { name: 'Case 2 à compléter', exact: true }).tap();
  await page.getByRole('button', { name: 'Choisir ma', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Retirer ma de la case 2', exact: true })).toBeVisible();
  await tile(page).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Bravo ! lama');
});

test('selection/callout protection is scoped to gameplay, without a scroll lock', async ({ page }) => {
  await setup(page);
  for (const selector of ['.game-screen', '.instruction', '.word-slot', '.listen-button', '.game-companion p', '.tap-hint']) {
    expect(await page.locator(selector).first().evaluate(el => getComputedStyle(el).userSelect)).toBe('none');
  }
  expect(await page.locator('.game-screen').evaluate(el => getComputedStyle(el).touchAction)).toBe('auto');
  expect(await page.locator('.game-screen').evaluate(el => !el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))).toBe(true);
  // Chromium drops unsupported WebKit properties; check the authored rule too.
  expect(readFileSync('src/styles.css', 'utf8')).toMatch(/\.game-screen\{[^}]*-webkit-user-select:none;user-select:none;-webkit-touch-callout:none/);
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const prompt = await page.getByTestId('gate-prompt').innerText();
  for (const [index, name] of prompt.split(' — ').entries()) await page.getByLabel(`Chiffre ${index + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  const parent = page.getByRole('navigation', { name: 'Sections parents' });
  await expect(parent).toBeVisible();
  expect(await parent.evaluate(el => getComputedStyle(el).userSelect)).not.toBe('none');
  await expect(page.locator('.game-screen')).toHaveCount(0);
});



test('locking the activity cancels another active tile before the next challenge', async ({ page }) => {
  await setup(page);
  await page.clock.install();
  const distractor = page.getByRole('button', { name: 'Choisir li', exact: true });
  const box = (await distractor.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y - 30);
  await expect(page.locator('.drag-ghost')).toHaveCount(1);
  await tile(page).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Choisir ma', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Bravo ! lama');
  await expect(page.locator('.drag-ghost,.dragging,.word-slot.over')).toHaveCount(0);
  await page.mouse.up();
  await page.clock.runFor(2200);
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
});
