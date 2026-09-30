import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { chainParentData } from '../fixtures/chain-program';

for (const { id, name, shell } of [
  { id: 'unicorn', name: 'Licorne', shell: '#faf5ed' },
  { id: 'monkey', name: 'Singe', shell: '#fff4e3' },
  { id: 'tiger', name: 'Tigre', shell: '#fff5e3' },
]) test(`${id} SVG registration, mobile expressions and existing egg masks`, async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript(data => { if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)); }, chainParentData(1));
  await page.goto('/?preview=hatching');
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page.getByLabel('Animal à prévisualiser').selectOption(id);
  for (const stage of [1,2,3,4,5]) {
    await page.getByRole('button', { name: `État ${stage}`, exact: true }).click();
    await expect(page.getByTestId('hatching-animal').locator(`svg.${id}`)).toHaveCount(1);
    await expect(page.locator('.hatching-egg stop').first()).toHaveAttribute('stop-color', shell);
    await expect(page.locator('[data-reveal]')).toHaveAttribute('data-reveal', ['hidden','hidden','small','large','full'][stage-1]);
    if (stage >= 3) await page.screenshot({ path: `test-results/${id}-stage-${stage}.png`, fullPage: true });
  }
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  for (const animal of ['dinosaur','rabbit','lion','unicorn','monkey'].filter(animal => animal !== id)) {
    await page.getByLabel('Animal à prévisualiser').selectOption(animal);
    await page.screenshot({ path: `test-results/${id}-compare-${animal}.png`, fullPage: true });
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'CHOISIR MON PERSONNAGE' }).tap();
  const character = page.getByRole('button', { name, exact: true });
  await expect(character.locator(`svg.${id}`)).toBeVisible();
  await expect(character.locator('.character-emoji')).toHaveCount(0);
  await character.tap();
  await page.screenshot({ path: `test-results/${id}-selector.png`, fullPage: true });
  await page.getByRole('button', { name: 'Continuer', exact: true }).tap();
  await page.clock.install();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await expect(page.locator(`.game-companion svg.${id}`)).toBeVisible();
  await page.screenshot({ path: `test-results/${id}-game.png`, fullPage: true });
  for (const text of ['la','ma']) await page.getByRole('button', { name: `Choisir ${text}`, exact: true }).tap();
  await expect(page.locator(`.game-companion .character-happy svg.${id}`)).toBeVisible();
  await page.clock.runFor(2200);
  await page.screenshot({ path: `test-results/${id}-happy.png`, fullPage: true });
  await page.getByRole('button', { name: 'DÉCOUVRE TA SURPRISE' }).tap();
  if (id === 'monkey') {
    await expect(page.locator('.monkey-banana-scene svg.monkey')).toHaveCount(1);
    await expect(page.locator('.monkey-banana-scene')).toHaveAttribute('data-stage', '1');
  } else {
    await expect(page.locator(`.${id}-reveal-scene svg.${id}`)).toHaveCount(1);
    await expect(page.locator(`.${id}-reveal-scene`)).toHaveAttribute('data-stage', '1');
  }
});
