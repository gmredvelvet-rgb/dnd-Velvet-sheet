import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spellPreparation, preparationUpdate } from '../scripts/velvet-spell-filters.mjs';

test('D&D 6 preparation states preserve always-prepared spells and numeric updates', () => {
  const spell = { system: { level: 3, method: 'spell', prepared: 0, canPrepare: true } };
  assert.equal(spellPreparation(spell).available, false);
  assert.deepEqual(preparationUpdate(spell), { 'system.prepared': 1 });
  spell.system.prepared = 1;
  assert.equal(spellPreparation(spell).available, true);
  assert.deepEqual(preparationUpdate(spell), { 'system.prepared': 0 });
  spell.system.prepared = 2;
  assert.equal(spellPreparation(spell).alwaysPrepared, true);
  assert.equal(preparationUpdate(spell), null);
});
test('legacy preparation still writes the legacy field', () => {
  const spell = { system: { level: 2, preparation: { mode: 'prepared', prepared: false } } };
  assert.equal(spellPreparation(spell).available, false);
  assert.deepEqual(preparationUpdate(spell), { 'system.preparation.prepared': true });
  spell.system.preparation.mode = 'always';
  assert.equal(spellPreparation(spell).available, true);
  assert.equal(preparationUpdate(spell), null);
});
test('cantrips and innate magic remain available without counting as prepared slots', () => {
  for (const system of [
    { level: 0, prepared: 0, method: 'spell' },
    { level: 2, prepared: 0, method: 'innate', canPrepare: false },
    { level: 1, preparation: { mode: 'atwill', prepared: false } }
  ]) assert.equal(spellPreparation({ system }).available, true);
});
