import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../src/services/audio.ts';
function fixture() {
  const calls: SpeechSynthesisUtterance[] = [];
  let cancels = 0;
  const synthesis = Object.assign(new EventTarget(), { getVoices: () => [], speak: (u: SpeechSynthesisUtterance) => calls.push(u), cancel: () => { cancels++; } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { speechSynthesis: synthesis, setTimeout, clearTimeout } });
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: class { text: string; constructor(text: string) { this.text = text; } } });
  return { audio: new GameAudio(), calls, synthesis, cancels: () => cancels };
}
test('owned automatic requests: exact text, deduplication, stale cleanup, manual replay and error recovery', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { audio, calls, cancels } = fixture();
  audio.stopActivity('A');
  void audio.playAutomatic('A', 'â exactement');
  void audio.playAutomatic('A', 'not spoken');
  assert.equal(calls.length, 1); assert.equal(cancels(), 0);
  void audio.playAutomatic('B', 'olive');
  assert.equal(cancels(), 1);
  audio.stopActivity('A'); assert.equal(cancels(), 1);
  void audio.playTarget('olive');
  void audio.playAutomatic('B', 'not spoken');
  calls.at(-1)!.onerror?.({ error: 'not-allowed' } as SpeechSynthesisErrorEvent);
  void audio.playAutomatic('C', 'vélo');
  assert.deepEqual(calls.map(c => c.text), ['â exactement','olive','olive','vélo']);
  assert.ok(calls.every(c => c.lang === 'fr-CA' && !c.voice));
  audio.stopActivity('C');
});
test('replacement cancels old sequence steps; late voices and visibility never replay; a new session can replay', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { audio, calls, synthesis } = fixture();
  const old = audio.playAutomatic('session1:A', 'lama', undefined, 'la');
  void audio.playAutomatic('session1:B', 'lune');
  audio.stopActivity('session1:A');
  calls[0].onend?.({} as SpeechSynthesisEvent); await old;
  synthesis.dispatchEvent(new Event('voiceschanged'));
  assert.deepEqual(calls.map(c => c.text), ['la','lune']);
  void audio.playAutomatic('session2:B', 'lune');
  assert.deepEqual(calls.map(c => c.text), ['la','lune','lune']);
  audio.stop();
});
