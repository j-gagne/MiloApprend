import { test, expect, type Page, type Locator } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';

async function setup(page: Page, syllable = false) {
  await mockSpeech(page);
  await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), chainParentData(3, syllable));
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
}

async function place(page: Page, source: Locator, target: Locator, input: 'mouse' | 'touch' | 'keyboard') {
  if (input === 'keyboard') {
    await target.focus(); await page.keyboard.press('Enter');
    await source.focus(); await page.keyboard.press('Space');
    return;
  }
  await source.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
  const x = from.x + from.width / 2, y = from.y + from.height / 2;
  const tx = to.x + to.width / 2, ty = to.y + to.height / 2;
  if (input === 'mouse') {
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 8 }); await page.mouse.up();
  } else {
    const scroll = await page.evaluate(() => scrollY);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx, y: ty }] });
    await expect(page.locator('.drag-ghost')).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  }
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
}

for (const input of ['mouse', 'touch', 'keyboard'] as const) {
  test(`chain: persistent bank, one visible target, current audio and ${input}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    const bank = page.getByLabel('Morceaux disponibles');
    const choose = (text: string) => bank.getByRole('button', { name: `Choisir ${text}`, exact: true }).first();
    const slot = (number: number) => page.getByRole('button', { name: `Case ${number} à compléter`, exact: true });
    await expect(bank.getByRole('button')).toHaveCount(6);
    await expect(page.locator('.challenge-card')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Réécouter lavage', exact: true })).toHaveCount(0);
    await expect(page.getByText('Il a volé le nid.', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('0 œuf éclos sur 3')).toBeVisible();
    await expect(page.locator('.journey-egg')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await place(page, choose('va'), slot(1), input); // Wrong answer remains available.
    await expect(bank.getByRole('button')).toHaveCount(6);
    await place(page, choose('la'), slot(1), input);
    await expect(bank.getByRole('button', { name: 'Choisir la', exact: true })).toHaveCount(1);
    const filled = page.getByRole('button', { name: 'Retirer la de la case 1', exact: true });
    if (input === 'keyboard') { await filled.focus(); await page.keyboard.press('Enter'); }
    else await filled.click();
    await expect(bank.getByRole('button', { name: 'Choisir la', exact: true })).toHaveCount(2);
    await place(page, choose('la'), slot(1), input);
    // Replace by the other LA occurrence; inventory count must not change.
    await place(page, choose('la'), page.getByRole('button', { name: 'Retirer la de la case 1', exact: true }), input === 'keyboard' ? 'mouse' : input);
    await expect(bank.getByRole('button')).toHaveCount(5);
    await place(page, choose('ma'), slot(2), input);
    await expect(page.getByRole('status')).toContainText('Bravo ! lama');
    await expect(page.getByLabel('1 œuf éclos sur 3')).toBeVisible();
    await expect(page.locator('.journey-egg.hatched')).toHaveCount(1);
    await expect(bank.getByRole('button')).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Réécouter lavage', exact: true })).toHaveCount(0);
    await page.clock.runFor(2100);
    await expect(page.getByRole('button', { name: 'Réécouter lavage', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Réécouter lama', exact: true })).toHaveCount(0);
    await expect(bank.getByRole('button')).toHaveCount(4);
    await expect(choose('ma')).toHaveCount(0);
    await expect(page.locator('.challenge-card')).toHaveCount(1);
    await expect(page.getByLabel('1 œuf éclos sur 3')).toBeVisible();
    await page.getByRole('button', { name: 'Réécouter lavage', exact: true }).click();
    await place(page, choose('la'), slot(1), input);
    await place(page, choose('va'), slot(2), input);
    await expect(page.getByLabel('2 œufs éclos sur 3')).toBeVisible();
    await page.clock.runFor(2100);
    await expect(page.getByRole('button', { name: 'Réécouter Il a volé le nid.', exact: true })).toBeVisible();
    await expect(page.getByLabel('2 œufs éclos sur 3')).toBeVisible();
    await expect(bank.getByRole('button')).toHaveCount(2);
    expect(await bank.getByRole('button').allTextContents()).toEqual(['vo', 'ni']);
    await place(page, choose('vo'), slot(2), input);
    await place(page, choose('ni'), slot(4), input);
    await expect(bank.getByRole('button')).toHaveCount(0);
    await expect(page.getByLabel('3 œufs éclos sur 3')).toBeVisible();
    await expect(page.locator('.journey-egg.hatched')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual([
      'lama', 'lama', 'lama', 'lavage', 'lavage', 'lavage', 'Il a volé le nid.', 'Il a volé le nid.',
    ]);
    await page.clock.runFor(2100);
    await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
    await expect(page.getByLabel('3 œufs éclos sur 3')).toBeVisible();
    await page.getByRole('button', { name: 'REJOUER', exact: true }).click();
    await expect(bank.getByRole('button')).toHaveCount(6);
  });
}

for (const mode of ['chain-2', 'chain-fallback', 'individual'] as const) {
  test(`progress per actual target: ${mode}`, async ({ page }) => {
    await mockSpeech(page);
    const data = { ...chainParentData(2), gameMode: mode === 'individual' ? 'individual' as const : 'chain' as const,
      chainLength: mode === 'chain-2' ? 2 as const : 3 as const };
    await page.addInitScript((data) => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), data);
    await page.goto('/'); await page.clock.install();
    await page.getByRole('button', { name: 'JOUER', exact: true }).click();
    await expect(page.getByLabel('0 œuf éclos sur 2')).toBeVisible();
    await expect(page.locator('.journey-egg')).toHaveCount(2);
    for (const [index, answers] of [['la', 'ma'], ['la', 'va']].entries()) {
      for (const text of answers) await page.getByLabel('Morceaux disponibles').getByRole('button', { name: `Choisir ${text}`, exact: true }).first().click();
      await expect(page.locator('.journey-egg.hatched')).toHaveCount(index + 1);
      await page.clock.runFor(2100);
      await expect(page.locator('.journey-egg')).toHaveCount(2);
      await expect(page.locator('.journey-egg.hatched')).toHaveCount(index + 1);
    }
    await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
    await expect(page.getByLabel('2 œufs éclos sur 2')).toBeVisible();
  });
}

test('chain supports explicitly enabled syllable targets without abc or media', async ({ page }) => {
  await setup(page, true);
  for (const answers of [['la', 'ma'], ['la', 'va']]) {
    for (const text of answers) await page.getByLabel('Morceaux disponibles').getByRole('button', { name: `Choisir ${text}`, exact: true }).first().click();
    await page.clock.runFor(2100);
  }
  await expect(page.getByRole('heading', { name: 'Retrouve la syllabe' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réécouter mé', exact: true })).toBeVisible();
  await expect(page.locator('.challenge-card [role="img"], .challenge-card img')).toHaveCount(0);
  await expect(page.getByText('abc', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choisir mé', exact: true }).click();
  await page.clock.runFor(2100);
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
});

test('Parent mode/length persist and older defaults remain individual', async ({ page }) => {
  await mockSpeech(page); await page.goto('/');
  async function settings() {
    await page.getByRole('button', { name: 'Parents', exact: true }).click();
    const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const prompt = await page.getByTestId('gate-prompt').innerText();
    for (const [i, name] of prompt.split(' — ').entries()) await page.getByLabel(`Chiffre ${i + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  }
  await settings();
  await expect(page.getByLabel('Cibles individuelles', { exact: true })).toBeChecked();
  await expect(page.getByRole('group', { name: 'Nombre de cibles par chaîne' })).toHaveCount(0);
  await page.getByLabel('Chaîne de cibles', { exact: true }).check();
  const length = page.getByRole('group', { name: 'Nombre de cibles par chaîne' });
  await expect(length.getByLabel('3', { exact: true })).toBeChecked();
  await length.getByLabel('2', { exact: true }).check();
  await page.reload(); await settings();
  await expect(page.getByLabel('Chaîne de cibles', { exact: true })).toBeChecked();
  await expect(length.getByLabel('2', { exact: true })).toBeChecked();
  await page.getByLabel('Cibles individuelles', { exact: true }).check();
  await page.reload(); await settings();
  await expect(page.getByLabel('Cibles individuelles', { exact: true })).toBeChecked();
});
