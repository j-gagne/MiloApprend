import { test, expect, type Page } from '@playwright/test';
import { advanceEgg, acknowledgeEgg, emptyEggRewards } from '../../src/game/egg-rewards';
import { seedBank } from '../../src/content/program';
import { REMOTE_PROGRAM_URL } from '../../src/content/remote-program';
import { emptyParentData } from '../../src/parent/model';
import { chainParentData } from '../fixtures/chain-program';

const progressKey = 'milo-apprend.progress.v1';
const parentKey = 'milo-apprend.parent.v1';
const parent = { ...chainParentData(), readingSpeed: 'slow', questionCount: 6,
  unitEnabled: { 'word-lama': false }, audioOverrides: { 'syllable-la': { audioText: 'lah' } },
  constructions: { 'parent-word-chain-lavage': [{ id: 'main', segments: [
    { unitId: 'syllable-la' }, { unitId: 'syllable-va' }, { literal: 'ge', note: 'visible' },
  ] }] },
};
let eggRewards = emptyEggRewards('rabbit');
for (let n = 1; n <= 8; n++) {
  eggRewards = acknowledgeEgg(advanceEgg(eggRewards, `session-${n}`, '2026-09-30T12:00:00Z'), `session-${n}`, 'rabbit');
}
const progress = { completedSessions: 8, selectedCharacterId: 'rabbit', playerName: 'Zoé', eggRewards };
const stored = (page: Page, key: string) => page.evaluate(key => localStorage.getItem(key), key);
async function settings(page: Page) {
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  for (const [i, name] of (await page.getByTestId('gate-prompt').innerText()).split(' — ').entries()) {
    await page.getByLabel(`Chiffre ${i + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  }
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await page.route(REMOTE_PROGRAM_URL, route => route.fulfill({ json: { schemaVersion: 1, programId: 'reset-test', weeks: seedBank } }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeVisible();
  await page.evaluate(({ parentKey, progressKey, parent, progress }) => {
    localStorage.setItem(parentKey, JSON.stringify(parent));
    localStorage.setItem(progressKey, JSON.stringify(progress));
  }, { parentKey, progressKey, parent, progress });
  await page.reload();
  await settings(page);
});

test('confirmed progress reset clears rewards immediately and preserves all Parent data and available content', async ({ page }) => {
  await page.getByRole('button', { name: 'Aperçu', exact: true }).click();
  const availableContent = await page.locator('.parent-stats').innerText();
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  const beforeParent = await stored(page, parentKey);
  const beforeProgress = await stored(page, progressKey);
  const reset = page.getByRole('button', { name: 'Réinitialiser la progression', exact: true });
  page.once('dialog', dialog => dialog.dismiss());
  await reset.click();
  expect(await stored(page, progressKey)).toBe(beforeProgress);
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('l’œuf et les récompenses en cours');
    expect(dialog.message()).toContain('tous les animaux de la Collection seront effacés');
    expect(dialog.message()).toContain('personnalisations et réglages Parent seront conservés');
    await dialog.accept();
  });
  await reset.click();
  await expect(page.getByRole('status')).toContainText('Progression enfant réinitialisée');
  expect(JSON.parse((await stored(page, progressKey))!)).toEqual({ completedSessions: 0, selectedCharacterId: 'dinosaur' });
  expect(await stored(page, parentKey)).toBe(beforeParent);
  await page.getByRole('button', { name: 'Aperçu', exact: true }).click();
  expect(await page.locator('.parent-stats').innerText()).toBe(availableContent);
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await expect(page.locator('.progress-pill')).toHaveText('● Ta première aventure t’attend !');
  await expect(page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE', exact: true })).toBeVisible();
  await expect(page.getByText('Salut Milo !', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'MA COLLECTION', exact: true }).click();
  await expect(page.locator('.collection-count')).toHaveText('0 animaux collectionnés');
  await expect(page.locator('.collection-grid li')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.progress-pill')).toContainText('Ta première aventure t’attend !');
  expect(await stored(page, parentKey)).toBe(beforeParent);
});

test('existing customization reset still requires confirmation and preserves all child progress', async ({ page }) => {
  const beforeProgress = await stored(page, progressKey);
  const beforeParent = await stored(page, parentKey);
  const reset = page.getByRole('button', { name: 'Réinitialiser les personnalisations', exact: true });
  page.once('dialog', dialog => dialog.dismiss());
  await reset.click();
  expect(await stored(page, parentKey)).toBe(beforeParent);
  page.once('dialog', dialog => dialog.accept());
  await reset.click();
  expect(JSON.parse((await stored(page, parentKey))!)).toEqual(emptyParentData());
  expect(await stored(page, progressKey)).toBe(beforeProgress);
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await expect(page.locator('.progress-pill')).toContainText('8 aventures terminées');
  await expect(page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'MA COLLECTION', exact: true }).click();
  await expect(page.locator('.collection-count')).toHaveText('1 animal collectionné');
});

test('failed reset reports failure and retains child progress in the UI and storage', async ({ page }) => {
  const beforeProgress = await stored(page, progressKey);
  await page.evaluate(progressKey => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === progressKey) throw new Error('Storage blocked');
      setItem.call(this, key, value);
    };
  }, progressKey);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Réinitialiser la progression', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Réinitialisation impossible');
  expect(await stored(page, progressKey)).toBe(beforeProgress);
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await expect(page.locator('.progress-pill')).toContainText('8 aventures terminées');
  await expect(page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE', exact: true })).toHaveCount(0);
});
