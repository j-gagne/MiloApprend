import { test, expect } from '@playwright/test';
import { emptyParentData } from '../../src/parent/model';
import { activityCatalog } from '../../src/content/activity-catalog';
import { initialProgram, seedBank } from '../../src/content/program';
import { REMOTE_PROGRAM_URL } from '../../src/content/remote-program';
import { dinosaurTheme } from '../../src/game/themes';

test('native speech drives the actual LAMA missing-MA border through rendered frames', async ({ page }) => {
  await page.route(REMOTE_PROGRAM_URL, route => route.fulfill({ json: { schemaVersion: 1, programId: 'native-reading-test', weeks: seedBank } }));
  const data = { ...emptyParentData(), activeWeek: 5,
    activityEnabled: Object.fromEntries(activityCatalog(initialProgram, 5).map(a => [a.id, false])),
    activities: [{ id: 'parent-native-lama', type: 'complete-segments', targetId: 'word-lama', segmentationId: 'initial', missingSegmentIndexes: [1], distractorUnitIds: ['syllable-li'] }],
  };
  await page.addInitScript(data => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)), data);
  await page.goto(process.env.READING_APP_URL ?? '/?debugAudio=1');
  await page.evaluate(() => {
    const trace: { text: string; event: string; time: number; border?: string; active?: boolean; presentBorder?: string; presentActive?: boolean }[] = [];
    Object.assign(window, { nativeReadingTrace: trace });
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = utterance => {
      const record = (event: string) => {
        const slot = document.querySelector('.word-slot');
        const present = document.querySelector('.word-segment');
        trace.push({ text: utterance.text, event, time: performance.now(),
          border: slot ? getComputedStyle(slot).border : undefined, active: slot?.classList.contains('active-reading-segment'),
          presentBorder: present ? getComputedStyle(present).border : undefined, presentActive: present?.classList.contains('active-reading-segment') });
      };
      let speaking = false;
      utterance.addEventListener('start', () => {
        record('start'); speaking = true;
        const frame = () => { if (speaking) { record('frame'); requestAnimationFrame(frame); } };
        requestAnimationFrame(frame);
      });
      utterance.addEventListener('end', () => { speaking = false; record('end'); });
      utterance.addEventListener('error', event => { speaking = false; record(`error:${event.error}`); });
      record('request');
      speak(utterance); // Real browser synthesis and native events, no replacement utterance or clock.
    };
  });
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  try {
    await expect.poll(() => page.evaluate(() => (window as unknown as { nativeReadingTrace: { text: string; event: string }[] }).nativeReadingTrace.some(e => e.text === 'lama' && e.event === 'end')), { timeout: 15000 }).toBe(true);
    const trace = await page.evaluate(() => (window as unknown as { nativeReadingTrace: { text: string; event: string; active?: boolean; border?: string }[] }).nativeReadingTrace);
    expect(trace.filter(e => e.event === 'request').map(e => e.text)).toEqual(['ma', 'comme dans', 'lama']);
    const color = `rgb(${dinosaurTheme.primary.slice(1).match(/../g)!.map(hex => parseInt(hex, 16)).join(', ')})`;
    expect(trace.some(e => e.text === 'ma' && e.event === 'frame' && e.active && e.border === `5px solid ${color}`)).toBe(true);
    expect(trace.filter(e => e.text !== 'ma' && e.event === 'frame').every(e => !e.active && e.border?.startsWith('3px dashed'))).toBe(true);
    await expect(page.locator('.word-slot')).toHaveCSS('border-style', 'dashed');
    await page.evaluate(() => { (window as unknown as { nativeReadingTrace: unknown[] }).nativeReadingTrace.length = 0; });
    await page.getByRole('button', { name: 'Découper lama', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { nativeReadingTrace: { text: string; event: string }[] }).nativeReadingTrace.some(e => e.text === 'lama' && e.event === 'end')), { timeout: 15000 }).toBe(true);
    const segmented = await page.evaluate(() => (window as unknown as { nativeReadingTrace: { text: string; event: string; active?: boolean; border?: string; presentActive?: boolean; presentBorder?: string }[] }).nativeReadingTrace);
    expect(segmented.filter(e => e.event === 'request').map(e => e.text)).toEqual(['la', 'ma', 'lama']);
    expect(segmented.some(e => e.text === 'la' && e.event === 'frame' && e.presentActive && !e.active && e.presentBorder === `5px solid ${color}`)).toBe(true);
    expect(segmented.some(e => e.text === 'ma' && e.event === 'frame' && e.active && !e.presentActive && e.border === `5px solid ${color}`)).toBe(true);
    expect(segmented.filter(e => e.text === 'lama' && e.event === 'frame').every(e => !e.active && !e.presentActive)).toBe(true);
    await expect(page.locator('.active-reading-segment')).toHaveCount(0);
    await expect(page.locator('.word-segment')).toHaveCSS('border-style', 'none');
    await expect(page.locator('.word-slot')).toHaveCSS('border-style', 'dashed');
  } finally {
    const trace = await page.evaluate(() => (window as unknown as { nativeReadingTrace: { text: string; event: string; active?: boolean }[] }).nativeReadingTrace);
    await test.info().attach('native-reading-trace', { body: JSON.stringify(trace, null, 2), contentType: 'application/json' });
    console.log(JSON.stringify({ events: trace.filter(e => e.event !== 'frame'),
      activeFrames: trace.filter(e => e.event === 'frame' && e.active).length }));
  }
});
