import { test, expect } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { emptyParentData } from '../../src/parent/model';
import { buildSeedProgram } from '../../src/content/seed-bank';
import { mathCatalog } from '../../src/content/math-catalog';

for (const type of ['MISSING_NUMBER', 'HEAR_NUMBER'] as const) {
  for (const interaction of ['touch', 'mouse', 'keyboard', 'drag'] as const) test(`${type}: ${interaction} submits once and allows retry`, async ({ page }) => {
    await mockSpeech(page);
    // Observe validation calls, including incorrect attempts which do not lock the board.
    await page.route('**/src/game/session-progress.ts', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace(/function (incorrectAttempt|completeTarget)\(progress\) \{/g,
        'function $1(progress) { window.mathAttempts = (window.mathAttempts || 0) + 1;');
      await route.fulfill({ response, body });
    });
    const weeks = [{ number: 10, label: '10', letters: [], syllables: [], toolWords: [], words: [], sentences: [], mathematics: { numbers: [11,12,13,14,15] } }];
    const definition = type === 'HEAR_NUMBER' ? { id: 'math:tap', type, target: 13, distractors: [11,15] }
      : { id: 'math:tap', type, sequence: [11,12,13,14,15], missingIndex: 2, distractors: [11,15] };
    await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: { schemaVersion: 1, programId: 'tap', weeks, mathExercises: [definition] } }));
    const auto = mathCatalog(buildSeedProgram('tap', weeks), 10, { mode: 'all', selectedWeeks: [] });
    await page.addInitScript(parent => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(parent)),
      { ...emptyParentData(), activeWeek: 10, activityEnabled: Object.fromEntries(auto.exercises.map(item => [item.definition.id, false])) });
    await page.goto('/?activity=math'); await page.getByRole('button', { name: 'JOUER AUX NOMBRES' }).click();
    const count = () => page.evaluate(() => (window as unknown as { mathAttempts?: number }).mathAttempts ?? 0);
    expect(await count()).toBe(0);
    for (const [index, number] of [11,13].entries()) {
      const tile = page.getByRole('button', { name: `Choisir ${number}`, exact: true });
      if (interaction === 'touch') await tile.tap();
      else if (interaction === 'mouse') await tile.click();
      else if (interaction === 'keyboard') await tile.press('Enter');
      else {
        const from = (await tile.boundingBox())!; const to = (await page.locator('.math-slot').boundingBox())!;
        await page.mouse.move(from.x + 20, from.y + 20); await page.mouse.down();
        await page.mouse.move(to.x + 20, to.y + 20, { steps: 8 }); await page.mouse.up();
      }
      await expect(page.getByRole('status')).toContainText(index === 0 ? 'Essaie encore' : 'Bravo');
      expect(await count()).toBe(index + 1);
      await expect(page.locator('.math-slot button')).toHaveText(String(number));
    }
    await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!).completedSessions)).toBe(1);
  });
}
