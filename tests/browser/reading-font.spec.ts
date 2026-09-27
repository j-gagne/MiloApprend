import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';

test('Andika locale : contenu, lettres distinctes, accents et réponse déplacée', async ({ page, context }) => {
  await mockSpeech(page);
  const fontUrls: string[] = [];
  page.on('request', (request) => { if (request.resourceType() === 'font') fontUrls.push(request.url()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await page.evaluate(async () => {
    await document.fonts.load('400 36px Andika');
    await document.fonts.load('700 36px Andika');
    await document.fonts.ready;
  });
  for (const selector of ['.word-segment', '.word-slot', '.answer-tile']) {
    await expect(page.locator(selector).first()).toHaveCSS('font-family', /Andika/);
  }
  const response = page.locator('.answer-tile').first();
  const rect = (await response.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2, rect.y - 20, { steps: 4 });
  await expect(page.locator('.drag-ghost')).toHaveCSS('font-family', /Andika/);
  await page.mouse.up();

  // Planche de contrôle injectée uniquement dans le navigateur de test.
  await page.evaluate(() => {
    const specimen = document.createElement('section');
    specimen.id = 'reading-font-specimen';
    specimen.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px;max-width:620px;margin:auto;background:#fffef7';
    for (const text of ['a', 'âne', 'ami', 'Il', 'il', 'LILA', 'LAVAGE', 'Il a lu.', 'I l i', 'à â æ ç é è ê ë î ï ô œ ù û ü ÿ Œ É']) {
      const cell = document.createElement('div');
      cell.className = 'word-segment'; cell.textContent = text;
      cell.style.cssText = 'font-size:36px;min-width:0;height:auto;min-height:72px';
      if (text.length > 6) cell.style.gridColumn = '1 / -1';
      if (text.length > 12) { cell.style.fontSize = '24px'; cell.style.fontWeight = '400'; }
      specimen.append(cell);
    }
    document.body.prepend(specimen);
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#reading-font-specimen').screenshot({ path: `test-results/reading-font-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '#reading-font-specimen > div' });
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((font) => font.isCustomFont && font.familyName === 'Andika')).toBe(true);
  }
  await cdp.detach();
  expect(fontUrls).toHaveLength(2);
  expect(fontUrls.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
});
