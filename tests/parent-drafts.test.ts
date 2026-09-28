import assert from 'node:assert/strict';
import test from 'node:test';
import { createParentDraftStore, draftIdentity, PARENT_DRAFT_PREFIX, PARENT_NAV_KEY } from '../src/services/parent-drafts.ts';
function setup() {
  const data = new Map<string,string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key,value); }, removeItem: (key: string) => { data.delete(key); } };
  return { data, storage, store: createParentDraftStore(() => storage) };
}
test('draft identities separate types, creation, editing and target IDs', () => {
  assert.equal(new Set([draftIdentity('word','lama',true),draftIdentity('word','ane',true),draftIdentity('word','lama',false),draftIdentity('exercise','lama',true)]).size,4);
});
test('partial nested forms survive a new store; update, discard and navigation are separate from saved data', () => {
  const {data,storage,store}=setup();
  data.set('milo-apprend.parent.v1','original');
  const key=draftIdentity('word','lama',true);
  const fields={text:'lama ',audio:'la ma',construction:{segments:[{unitId:'syllable-la'}]},reading:{readingMode:'segmented',readingSequence:[{text:'la'},{text:''}]}};
  assert.equal(store.save(key,fields),true);
  const reloaded=createParentDraftStore(()=>storage);
  assert.deepEqual(reloaded.load(key),fields);
  assert.equal(reloaded.load(draftIdentity('word','ane',true)),undefined);
  store.save(key,{...fields,audio:'lama'});
  assert.equal(reloaded.load(key)?.audio,'lama');
  store.navigate({active:true,tab:'Programme',editorKey:key});
  assert.deepEqual(reloaded.navigation(),{active:true,tab:'Programme',editorKey:key});
  store.remove(key);
  assert.equal(reloaded.load(key),undefined);
  assert.equal(data.get('milo-apprend.parent.v1'),'original');
});
test('absent, malformed and unavailable draft storage do not prevent existing application use',()=>{
  const {data,store}=setup();
  assert.deepEqual(store.navigation(),{active:false,tab:'Aperçu'});
  data.set(PARENT_NAV_KEY,'bad'); data.set(PARENT_DRAFT_PREFIX+'x','null');
  assert.equal(store.load('x'),undefined);
  assert.deepEqual(store.navigation(),{active:false,tab:'Aperçu'});
  const denied=createParentDraftStore(()=>{throw new Error('denied');});
  assert.equal(denied.save('x',{}),false); assert.equal(denied.load('x'),undefined);
  assert.doesNotThrow(()=>denied.remove('x'));
});
