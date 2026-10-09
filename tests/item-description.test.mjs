import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { itemDescription } from '../scripts/velvet-item-inspector.mjs';

test('5e enriches the complete description with item context and hides observer secrets', async () => {
  let received;
  globalThis.game = { system: { id: 'dnd5e' }, user: { isGM: false } };
  globalThis.foundry = { applications: { ux: { TextEditor: { implementation: {
    enrichHTML: async (value, options) => { received = { value, options }; return '<p>Rendered</p>'; }
  } } } } };
  const item = { isOwner: false, system: { description: { value: 'Full @UUID[Item.example] description' } }, getRollData: () => ({ level: 7 }) };
  assert.equal(await itemDescription(item), '<p>Rendered</p>');
  assert.equal(received.value, item.system.description.value);
  assert.equal(received.options.secrets, false);
  assert.equal(received.options.relativeTo, item);
  assert.deepEqual(received.options.rollData, { level: 7 });
});

test('PF2e uses native rendering without exposing separate GM notes', async () => {
  let options;
  globalThis.game = { system: { id: 'pf2e' }, user: { isGM: false } };
  const item = { getDescription: async value => { options = value; return { value: '<p>Player description</p>', gm: 'Private notes' }; } };
  assert.equal(await itemDescription(item), '<p>Player description</p>');
  assert.equal(options.secrets, false);
});

test('renderer failure reaches the error handler instead of falling back to raw private HTML', async () => {
  globalThis.game = { system: { id: 'pf2e' }, user: { isGM: false } };
  await assert.rejects(itemDescription({ getDescription: async () => { throw new Error('unavailable'); } }), /unavailable/);
});

test('unidentified 5e items expose only their unidentified description to players', async () => {
  globalThis.game = { system: { id: 'dnd5e' }, user: { isGM: false } };
  globalThis.foundry = { applications: { ux: { TextEditor: { implementation: { enrichHTML: async value => value } } } } };
  const item = { system: { identified: false, description: { value: 'Secret power' }, unidentified: { description: 'Unknown blade' } } };
  assert.equal(await itemDescription(item), 'Unknown blade');
});

test('5e also enriches string descriptions through the legacy TextEditor fallback', async () => {
  globalThis.game = { system: { id: 'dnd5e' }, user: { isGM: true } };
  globalThis.foundry = { applications: {} };
  globalThis.TextEditor = { enrichHTML: async value => `<p>${value}</p>` };
  assert.equal(await itemDescription({ system: { description: 'Ancient power' } }), '<p>Ancient power</p>');
});

test('the two sheets use the same description viewer', async () => {
  const source = await readFile(new URL('../scripts/velvet-item-inspector.mjs', import.meta.url), 'utf8');
  const pf2e = await readFile(new URL('../../pf2e-velvet-sheet/scripts/velvet-item-inspector.mjs', import.meta.url), 'utf8');
  assert.equal(source, pf2e);
});
