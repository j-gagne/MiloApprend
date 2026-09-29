import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBaseProgram, REMOTE_PROGRAM_URL } from '../src/content/remote-program.ts';
import { initialProgram, seedBank } from '../src/content/program.ts';
import { buildSeedProgram } from '../src/content/seed-bank.ts';
import { effectiveProgram, emptyParentData } from '../src/parent/model.ts';

const payload = { schemaVersion: 1, programId: 'remote-school', weeks: seedBank };
const respond = (value: unknown): typeof fetch => async () => new Response(JSON.stringify(value));

test('remote base uses existing builder, no-store fetch and Parent overrides', async () => {
  const program = await loadBaseProgram(async (url, options) => {
    assert.equal(url, REMOTE_PROGRAM_URL);
    assert.equal(options?.cache, 'no-store');
    assert.ok(options?.signal);
    return new Response(JSON.stringify(payload));
  });
  assert.deepEqual(program, buildSeedProgram(payload.programId, seedBank));
  const data = emptyParentData();
  data.customUnits = [{ id: 'parent-test', type: 'syllable', display: 'test', enabled: true, introducedInWeek: 2 }];
  assert.ok(effectiveProgram(program, data).units.some(unit => unit.id === 'parent-test'));
  assert.equal(effectiveProgram(program, data).id, 'remote-school');
});

test('network, HTTP and JSON failures fall back to the bundled instance', async () => {
  for (const fetcher of [
    async () => { throw new Error('offline'); },
    async () => new Response('', { status: 503 }),
    async () => new Response('{broken'),
  ]) assert.equal(await loadBaseProgram(fetcher), initialProgram);
});

test('invalid payloads and unsupported versions fall back', async () => {
  for (const value of [null, [], {}, { ...payload, schemaVersion: 2 }, { ...payload, programId: ' ' },
    { ...payload, weeks: null }, { ...payload, weeks: [] }, { ...payload, weeks: [null] },
    { ...payload, weeks: [{ number: '2', label: 'Week' }] },
    { ...payload, weeks: [{ number: 2, label: 42 }] },
    { ...payload, weeks: [{ ...seedBank[0], letters: [null] }] },
  ]) assert.equal(await loadBaseProgram(respond(value)), initialProgram);
});

test('builder exceptions and hanging requests safely fall back', async () => {
  assert.equal(await loadBaseProgram(respond(payload), 5000, () => { throw new Error('build'); }), initialProgram);
  let signal: AbortSignal | null | undefined;
  assert.equal(await loadBaseProgram(async (_url, options) => {
    signal = options?.signal;
    return new Promise<Response>(() => {});
  }, 5), initialProgram);
  assert.equal(signal?.aborted, true);
});
