import { test, expect } from '@playwright/test';

test('Parent configures weekly numbers, restores drafts, rejects duplicates and persists empty overrides', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/program.json', route => route.fulfill({ json: {
    schemaVersion: 1, programId: 'math-browser',
    defaults: { activeWeek: 10, exerciseScope: { mode: 'selected-weeks', selectedWeeks: [10] } },
    weeks: [9, 10].map(number => ({ number, label: `Semaine ${number}`, letters: [], syllables: [],
      toolWords: [], words: [], sentences: [], mathematics: { numbers: number === 9 ? [8] : [11, 13] } })),
  } }));
  async function open(initial = false) {
    if (initial) {
    await page.getByRole('button', { name: 'Parents', exact: true }).click();
    const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const prompt = await page.getByTestId('gate-prompt').innerText();
    for (const [i, name] of prompt.split(' — ').entries()) await page.getByLabel(`Chiffre ${i + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    }
    await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name: 'Programme', exact: true }).click();
    await page.getByRole('button', { name: 'Ouvrir la semaine 10', exact: true }).click();
  }
  await page.goto('/'); await open(true);
  const input = page.getByLabel('Nombres introduits');
  const save = page.getByRole('button', { name: 'Enregistrer les nombres' });
  await expect(input).toHaveValue('11, 13');
  await input.fill('12, 14');
  await page.reload(); await open();
  await expect(input).toHaveValue('12, 14');
  await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'Nombres enregistrés.' })).toBeVisible();
  await page.reload(); await open();
  await expect(input).toHaveValue('12, 14');
  await input.fill('8'); await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'déjà introduit en semaine 9' })).toBeVisible();
  await input.fill('12, 12'); await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'sans doublons' })).toBeVisible();
  await input.fill('');
  await save.click();
  await page.reload(); await open();
  await expect(input).toHaveValue('');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.parent.v1')!).mathematicsOverrides)).toEqual({ 10: { numbers: [] } });
});
