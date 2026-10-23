import { test } from 'node:test';
import assert from 'node:assert/strict';

const modules = [
  ['D&D sheet', '../scripts/velvet-item-details.mjs'],
  ['PF2e sheet', '../../pf2e-velvet-sheet/scripts/velvet-item-details.mjs'],
  ['Party HUD', '../../velvet-party-hud/scripts/velvet-item-details.mjs']
];

function setup(id) {
  globalThis.game = { system: { id }, user: { isGM: false }, i18n: { localize: key => key } };
  globalThis.CONFIG = {
    PF2E: { spellTraits: { fire: 'Fire', concentrate: 'Concentrate', manipulate: 'Manipulate' },
      rarityTraits: { uncommon: 'Uncommon' }, magicTraditions: { arcane: 'Arcane', primal: 'Primal' },
      saves: { reflex: 'Reflex' }, frequencies: { day: 'day' } },
    DND5E: { spellSchools: { evo: { label: 'Evocation' } },
      itemProperties: { vocal: { label: 'Verbal' }, somatic: { label: 'Somatic' }, concentration: { label: 'Concentration' }, ritual: { label: 'Ritual' } },
      abilities: { dex: { label: 'Dexterity' } }, abilityActivationTypes: { action: 'Action', reaction: 'Reaction' },
      distanceUnits: { ft: 'feet' }, individualTargetTypes: { creature: 'Creatures' }, areaTargetTypes: { sphere: { label: 'Sphere' } } }
  };
}

for (const [name, path] of modules) {
  const { itemCardDetails, itemDetailsHTML } = await import(path);
  test(`${name}: complete PF2e spell traits, current rank, range, area, basic save and sustained duration`, () => {
    setup('pf2e');
    const forbidden = () => assert.fail('Inspecting an item must not roll, cast, update or post');
    const item = { type: 'spell', rank: 5, traditions: new Set(['arcane', 'primal']), area: { label: '20-foot burst' },
      system: { level: { value: 3 }, traits: { value: ['fire', 'concentrate', 'manipulate'], rarity: 'uncommon' },
        time: { value: '2' }, range: { value: '500 feet' }, target: { value: 'All creatures' },
        defense: { save: { statistic: 'reflex', basic: true } }, duration: { value: '1 minute', sustained: true },
        requirements: { value: 'A free hand' }, frequency: { max: 1, per: 'day' } },
      use: forbidden, cast: forbidden, roll: forbidden, getChatData: forbidden, update: forbidden, toMessage: forbidden };
    const info = itemCardDetails(item);
    assert.deepEqual(info.traits, ['Uncommon', 'Fire', 'Concentrate', 'Manipulate']);
    const facts = Object.fromEntries(info.facts);
    assert.equal(facts.rank, '5');
    assert.equal(facts.traditions, 'Arcane · Primal');
    assert.equal(facts.time, '2 actions');
    assert.equal(facts.range, '500 feet');
    assert.equal(facts.target, 'All creatures');
    assert.equal(facts.area, '20-foot burst');
    assert.equal(facts.defense, 'Basic Reflex');
    assert.equal(facts.duration, 'Sustained · 1 minute');
    assert.equal(facts.requirements, 'A free hand');
    assert.equal(facts.frequency, '1 / day');
  });

  test(`${name}: modern D&D uses prepared labels and visible activities, including components and materials`, () => {
    setup('dnd5e');
    const item = { type: 'spell', labels: { components: { vsm: 'V, S, M', tags: ['Concentration'] }, materials: 'A pinch of ash' },
      system: { level: 3, school: 'evo', properties: new Set(['vocal', 'somatic', 'concentration']),
        activities: { contents: [
          { isHidden: true, activation: { type: 'reaction' }, labels: { range: 'WRONG' } },
          { activation: { type: 'action', value: 1, condition: 'When the gate opens' },
            labels: { activation: '1 Action', range: '150 feet', target: 'Creatures in a sphere', concentrationDuration: 'Concentration, up to 1 minute', save: 'DC 16 Dexterity' },
            target: { affects: { type: 'creature' }, template: { type: 'sphere', size: 20, units: 'ft' } },
            save: { ability: new Set(['dex']), dc: { value: 16 } } }
        ] } } };
    const info = itemCardDetails(item);
    assert.deepEqual(info.traits, ['Verbal', 'Somatic', 'Concentration']);
    const facts = Object.fromEntries(info.facts);
    assert.equal(facts.level, '3');
    assert.equal(facts.school, 'Evocation');
    assert.equal(facts.time, '1 Action');
    assert.equal(facts.range, '150 feet');
    assert.equal(facts.target, 'Creatures in a sphere');
    assert.equal(facts.area, '20 feet Sphere');
    assert.equal(facts.defense, 'DC 16 Dexterity');
    assert.equal(facts.duration, 'Concentration, up to 1 minute');
    assert.equal(facts.components, 'V, S, M');
    assert.equal(facts.materials, 'A pinch of ash');
    assert.equal(facts.trigger, 'When the gate opens');
  });

  test(`${name}: legacy D&D cantrips, reaction triggers, self range and instant duration remain visible`, () => {
    setup('dnd5e');
    const info = itemCardDetails({ type: 'spell', system: { level: 0, activation: { type: 'reaction', value: 1 },
      range: { units: 'self' }, duration: { units: 'inst' }, components: { vocal: true, somatic: true, ritual: true },
      target: { value: 1, type: 'creature' }, save: { ability: 'dex', dc: 14 } } });
    const facts = Object.fromEntries(info.facts);
    assert.equal(facts.level, '0');
    assert.equal(facts.time, '1 Reaction');
    assert.equal(facts.range, 'self');
    assert.equal(facts.duration, 'inst');
    assert.equal(facts.components, 'V, S');
    assert.equal(facts.defense, '14 · Dexterity');
    assert.deepEqual(info.traits, ['Ritual']);
  });

  test(`${name}: hidden identification properties stay hidden and custom trait text is escaped`, () => {
    setup('pf2e');
    const item = { type: 'feat', isIdentified: false, system: { level: { value: 0 },
      traits: { value: ['<img src=x onerror=evil()>', 'custom-trait'], rarity: 'uncommon' }, requirements: { value: '<secret>' } } };
    assert.deepEqual(itemCardDetails(item), { traits: [], facts: [] });
    item.isIdentified = true;
    const html = itemDetailsHTML(item);
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('&lt;secret&gt;'));
    assert.ok(html.includes('custom-trait'));
    assert.ok(!html.includes('<img'));
    assert.equal(Object.fromEntries(itemCardDetails(item).facts).level, '0');
    assert.deepEqual(itemCardDetails(null), { traits: [], facts: [] });
  });
}
