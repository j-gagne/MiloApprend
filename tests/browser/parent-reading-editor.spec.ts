import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';

async function parents(page: Page) {
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const prompt = await page.getByTestId('gate-prompt').innerText();
  for (const [i, name] of prompt.split(' — ').entries()) await page.getByLabel(`Chiffre ${i + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
}
async function week(page: Page, number: number) {
  await page.getByRole('navigation').getByRole('button', { name: 'Programme', exact: true }).click();
  const back = page.getByRole('button', { name: 'Toutes les semaines', exact: true });
  if (await back.isVisible()) await back.click();
  await page.getByRole('button', { name: `Ouvrir la semaine ${number}`, exact: true }).click();
}
const save = (page: Page) => page.getByRole('button', { name: 'Enregistrer le contenu', exact: true });
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.parent.v1')!));

test('seed pronunciations, all word modes, ordered sequence, preview and Test audio survive reload', async ({ page }) => {
  await mockSpeech(page); await page.goto('/'); await parents(page); await week(page, 5);
  await page.getByRole('article', { name: 'Contenu ne', exact: true }).getByRole('button', { name: 'Modifier la prononciation' }).click();
  await expect(page.getByLabel('Syllabe', { exact: true })).toBeDisabled();
  await page.getByLabel('Prononciation audio').fill('né'); await save(page).click();
  await week(page, 5);
  await page.getByRole('article', { name: 'Contenu âne', exact: true }).getByRole('button', { name: 'Modifier la prononciation' }).click();
  await expect(page.getByLabel('Lecture du mot')).toHaveValue('custom');
  await expect(page.getByTestId('reading-editor-preview')).toHaveText('â → né → âne');
  await page.getByLabel('Lecture du mot').selectOption('whole'); await save(page).click();
  await week(page, 5);
  await page.getByRole('article', { name: 'Contenu âne', exact: true }).getByRole('button', { name: 'Modifier la prononciation' }).click();
  await expect(page.getByLabel('Lecture du mot')).toHaveValue('whole');
  await page.getByLabel('Lecture du mot').selectOption('auto'); await save(page).click();
  await week(page, 5);
  await page.getByRole('article', { name: 'Contenu âne', exact: true }).getByRole('button', { name: 'Modifier la prononciation' }).click();
  await expect(page.getByLabel('Lecture du mot')).toHaveValue('auto');
  await expect(page.getByTestId('reading-editor-preview')).toHaveText('Découpe non disponible');
  await page.getByLabel('Lecture du mot').selectOption('custom'); await expect(save(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Ajouter un morceau audio' }).click();
  await page.getByLabel('Texte du morceau 1').fill('  â  ');
  await page.getByRole('button', { name: 'Ajouter un morceau audio' }).click();
  await page.getByLabel('Type du morceau 2').selectOption('unit');
  await page.getByLabel('Contenu du morceau 2').selectOption('syllable-ne');
  await page.getByRole('button', { name: 'Monter le morceau 2' }).click();
  await page.getByRole('button', { name: 'Descendre le morceau 1' }).click();
  await page.getByRole('button', { name: 'Ajouter un morceau audio' }).click();
  await expect(save(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Supprimer le morceau 3' }).click();
  await save(page).click();
  const data = await stored(page);
  expect(data.customUnits).toHaveLength(0);
  expect(data.audioOverrides['word-âne'].readingSequence).toEqual([{ text: 'â' }, { unitId: 'syllable-ne' }]);
  expect(data.constructions['word-âne'][0].segments[0].literal).toBe('â');
  expect(data.constructions['word-âne'][0].segments[1]).toEqual({ unitId: 'syllable-ne' });
  await page.reload(); await parents(page); await week(page, 5);
  await page.getByRole('article', { name: 'Contenu âne', exact: true }).getByRole('button', { name: 'Modifier la prononciation' }).click();
  await expect(page.getByTestId('reading-editor-preview')).toHaveText('â → né → âne');
  await page.clock.install();
  await page.getByRole('button', { name: '🐢 Découpe', exact: true }).tap(); await page.clock.runFor(1600);
  expect(await page.evaluate(() => window.speechProbe.calls.map((c) => c.text))).toEqual(['â', 'né', 'âne']);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.getByRole('button', { name: 'Test audio', exact: true }).click();
  await page.getByLabel('Mot du programme').selectOption('word-âne');
  await page.getByRole('button', { name: '🐢 Découpe', exact: true }).tap(); await page.clock.runFor(1600);
  expect(await page.evaluate(() => window.speechProbe.calls.slice(-3).map((c) => c.text))).toEqual(['â', 'né', 'âne']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('new custom syllable and word audio settings persist, with display fallback', async ({ page }) => {
  await mockSpeech(page); await page.goto('/'); await parents(page); await week(page, 5);
  await page.getByRole('button', { name: '+ Ajouter une syllabe', exact: true }).click();
  await page.getByLabel('Syllabe', { exact: true }).fill('ze');
  await expect(page.getByLabel('Prononciation audio')).toHaveValue('');
  await save(page).click();
  expect((await stored(page)).customUnits.find((u: { display: string }) => u.display === 'ze').audioText).toBe('ze');
  await week(page, 5);
  await page.getByRole('button', { name: 'Modifier ze', exact: true }).click();
  await page.getByLabel('Prononciation audio').fill('zé'); await save(page).click();
  await week(page, 5);
  await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click();
  await page.getByLabel('Mot', { exact: true }).fill('zèbre');
  await page.getByLabel('Lecture du mot').selectOption('custom');
  await page.getByRole('button', { name: 'Ajouter un morceau audio' }).click();
  await page.getByLabel('Texte du morceau 1').fill('  zè  ');
  await save(page).click(); await page.reload(); await parents(page); await week(page, 5);
  await page.getByRole('button', { name: 'Modifier zèbre', exact: true }).click();
  await expect(page.getByLabel('Texte du morceau 1')).toHaveValue('zè');
  const data = await stored(page);
  expect(data.customUnits.find((u: { display: string }) => u.display === 'ze').audioText).toBe('zé');
  expect(data.customUnits.find((u: { display: string }) => u.display === 'zèbre').segmentations).toEqual([]);
});
