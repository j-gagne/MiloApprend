import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { initialProgram } from '../../src/content/program';
import { emptyParentData } from '../../src/parent/model';
import { REMOTE_PROGRAM_URL } from '../../src/content/remote-program';

test('Parent-created word: editor save and reload expose Découpe with ordered audio and active segments', async ({ page }) => {
  await mockSpeech(page, ['fr-CA'], false, true);
  await page.route(REMOTE_PROGRAM_URL, route => route.abort());
  await page.addInitScript(data => {
    if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data));
  }, { ...emptyParentData(), activeWeek: 5, gameMode: 'individual', questionCount: 1,
    unitEnabled: Object.fromEntries(initialProgram.units.filter(u => u.type === 'word' || u.type === 'sentence').map(u => [u.id, false])),
    audioOverrides: { 'syllable-la': { audioText: 'lah' } },
  });
  await page.goto('/'); await parents(page); await week(page, 5);
  await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click();
  await page.getByLabel('Mot', { exact: true }).fill('mala');
  for (const unitId of ['syllable-ma', 'syllable-la']) {
    await page.getByRole('button', { name: '+ Ajouter un bloc', exact: true }).click();
    await page.getByLabel('Contenu appris', { exact: true }).selectOption(unitId);
    await page.getByRole('button', { name: 'Ajouter ce bloc', exact: true }).click();
  }
  await page.getByLabel('Lecture du mot').selectOption('custom');
  for (const [index, unitId] of ['syllable-ma', 'syllable-la'].entries()) {
    await page.getByRole('button', { name: 'Ajouter un morceau audio', exact: true }).click();
    await page.getByLabel(`Type du morceau ${index + 1}`).selectOption('unit');
    await page.getByLabel(`Contenu du morceau ${index + 1}`).selectOption(unitId);
  }
  await save(page).click();
  const before = await stored(page);
  expect(before.customUnits[0].readingMode).toBe('segmented');
  expect(before.customUnits[0].readingSequence).toEqual([{ unitId: 'syllable-ma' }, { unitId: 'syllable-la' }]);
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.reload();
  expect(await stored(page)).toEqual(before);
  await page.clock.install();
  await page.evaluate(() => {
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    Object.assign(window, { parentReadingUtterance: undefined });
    speechSynthesis.speak = utterance => {
      Object.assign(window, { parentReadingUtterance: utterance });
      speak(utterance);
    };
  });
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  const button = page.getByRole('button', { name: 'Découper mala', exact: true });
  await expect(button).toBeVisible();
  await button.click();
  for (const [index, audio] of ['ma', 'lah'].entries()) {
    expect(await page.evaluate(() => window.speechProbe.calls.at(-1)!.text)).toBe(audio);
    const block = page.locator('.word-segments > *').nth(index);
    await expect(page.locator('.active-reading-segment')).toHaveCount(1);
    await expect.poll(() => block.evaluate(el => el.matches('.active-reading-segment') || !!el.querySelector('.active-reading-segment'))).toBe(true);
    await expect(block).not.toContainText('lah');
    await page.evaluate(() => (window as unknown as { parentReadingUtterance: SpeechSynthesisUtterance }).parentReadingUtterance.dispatchEvent(new Event('end')));
    await expect(page.locator('.active-reading-segment')).toHaveCount(0);
    await page.clock.runFor(index === 0 ? 400 : 600);
  }
  expect(await page.evaluate(() => window.speechProbe.calls.slice(-3).map(c => c.text))).toEqual(['ma', 'lah', 'mala']);
  await expect(page.locator('.active-reading-segment')).toHaveCount(0);
  await button.click();
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)!.text)).toBe('ma');
});

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
