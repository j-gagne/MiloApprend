import { test, expect } from '@playwright/test';

for (const width of [390, 820]) test(`isolated lion bush preview: five stages at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('milo-apprend.progress.v1', JSON.stringify({ completedSessions: 8, selectedCharacterId: 'lion',
      eggRewards: { currentEgg: { progress: 3, sessionsToHatch: 5, pendingAnimalId: 'lion' }, completedSessionIds: ['old-session'],
        hatches: [{ id: 'old-hatch', animalId: 'lion', hatchedAt: '2026-09-30' }] } }));
    localStorage.setItem('milo-apprend.parent.v1', 'parent-sentinel');
    sessionStorage.setItem('preview-sentinel', 'unchanged');
  });
  const contentRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('program.json')) contentRequests.push(request.url()); });
  await page.goto('/?preview=lion-reveal');
  const before = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const scene = page.getByRole('img', { name: /Lion dans la jungle/ });
  let artwork = '';
  for (const stage of [1, 2, 3, 4, 5]) {
    await page.getByRole('button', { name: `Étape ${stage}`, exact: true }).click();
    await expect(scene).toHaveAttribute('data-stage', String(stage));
    await expect(page.getByLabel(`Révélation : ${stage} sur 5`)).toBeVisible();
    await expect(scene.locator('svg.lion')).toHaveCount(1);
    const current = await scene.locator('svg.lion').innerHTML();
    if (stage === 1) artwork = current;
    expect(current).toBe(artwork);
    await expect(scene.locator('[data-layer="lion"]')).toHaveAttribute('data-reveal', stage === 1 ? 'hidden' : stage === 5 ? 'full' : 'partial');
    expect(await scene.locator(':scope > g[data-layer]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-layer')))).toEqual(['background', 'lion', 'foreground']);
    if (stage === 1) await expect(scene.locator('clipPath rect')).toHaveAttribute('width', '0');
    if (stage === 5) await expect(scene.locator('clipPath rect')).toHaveAttribute('width', '400');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/lion-reveal-${width}-${stage}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Étape 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(scene).toHaveAttribute('data-stage', '1');
  expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(before);
  expect(contentRequests).toEqual([]);
});

test('stage 1 reacts in three independent leaves, stays hidden and respects reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?preview=lion-reveal');
  const scene = page.locator('.lion-reveal-scene');
  const leaves = scene.locator('.lion-leaf-reaction');
  await expect(leaves).toHaveCount(3);
  expect(await leaves.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).animationDuration))).toEqual(['9s', '13s', '11s']);
  await scene.evaluate(el => el.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 0; }));
  const still = await scene.screenshot();
  await scene.evaluate(el => el.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 360; }));
  await expect(scene.locator('.lion-leaf-upper')).not.toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(scene.locator('.lion-leaf-lower')).toHaveCSS('transform', 'none');
  const moved = await scene.screenshot({ path: 'test-results/lion-reveal-390-leaf-movement.png' });
  expect(moved).not.toEqual(still);
  await scene.locator('[data-layer="lion"]').evaluate(el => el.setAttribute('visibility', 'hidden'));
  expect(await scene.screenshot()).toEqual(moved); // No lion pixels were visible before hiding its layer.
  await scene.locator('[data-layer="lion"]').evaluate(el => el.removeAttribute('visibility'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await scene.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  for (const leaf of await leaves.all()) await expect(leaf).toHaveCSS('transform', 'none');
  await page.getByRole('button', { name: 'Étape 2', exact: true }).click();
  await expect(scene.locator('clipPath path')).toHaveCount(2);
  const includes = (x: number, y: number) => scene.locator('clipPath path').evaluateAll((paths, point) =>
    paths.some(path => (path as SVGGeometryElement).isPointInFill(new DOMPoint(point.x, point.y))), { x, y });
  expect(await includes(177, 124)).toBe(true); // Existing lion's left ear, in scene coordinates.
  expect(await includes(306, 180)).toBe(true); // Separate mane patch.
  expect(await includes(209, 152)).toBe(false);
  expect(await includes(261, 148)).toBe(false); // Neither eye is exposed.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await scene.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.getByRole('button', { name: 'Étape 3', exact: true }).click();
  expect(await includes(209, 152)).toBe(true);
  expect(await includes(261, 148)).toBe(false);
  expect(await includes(232, 180)).toBe(false); // The complete face remains hidden.
});
