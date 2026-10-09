import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_APPEARANCE, EMBLEMS, normalizeAppearance, classEmblem, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb, appearanceVariables } from '../scripts/velvet-appearance.mjs';

test('canonical class identifiers override translated or renamed class names', () => {
  assert.equal(classEmblem({ classes: { p: { name: 'My oath', system: { identifier: 'paladin', levels: 4 } } } }, 'dnd5e'), 'champion');
  assert.equal(classEmblem({ class: { name: 'My hero', system: { slug: 'champion' } } }, 'pf2e'), 'champion');
  assert.equal(classEmblem({ class: { name: 'Inventor', system: { slug: 'inventor' } } }, 'pf2e'), 'artificer');
  assert.equal(classEmblem({ class: { name: 'Bruja' } }, 'pf2e'), 'witch');
  assert.equal(classEmblem({ classes: { p: { name: 'Pícaro', system: { levels: 1 } } } }, 'dnd5e'), 'rogue');
});
test('multiclass emblem follows the highest-level class without changing class order', () => {
  const actor = { classes: { wizard: { name: 'Wizard', system: { levels: 1 } }, fighter: { name: 'Fighter', system: { levels: 7 } } } };
  const before = JSON.stringify(actor);
  assert.equal(classEmblem(actor, 'dnd5e'), 'fighter');
  assert.equal(JSON.stringify(actor), before);
  assert.equal(classEmblem({ items: [{ type: 'class', name: 'Bard' }] }, 'dnd5e'), 'bard');
  assert.equal(classEmblem({ class: { name: 'Custom class', system: { slug: 'unknown' } } }, 'pf2e'), 'default');
  assert.equal(classEmblem({}, 'dnd5e'), 'default');
});
test('untrusted preferences are restricted to real fonts, enums and six-digit RGB colors', () => {
  assert.deepEqual(normalizeAppearance(null), DEFAULT_APPEARANCE);
  assert.deepEqual(normalizeAppearance({ background: 'url(evil)', accent: '#fff', titleFont: '__proto__', bodyFont: 'Arial; color:red', ornament: 'evil', emblem: '../evil' }), DEFAULT_APPEARANCE);
  assert.equal(normalizeAppearance({ background: '#ABCDEF' }).background, '#abcdef');
  assert.equal(normalizeAppearance({ emblem: 'necromancer' }).emblem, 'necromancer');
  assert.equal(normalizeAppearance({ backdrop: 'wizard' }).backdrop, 'wizard');
  assert.equal(normalizeAppearance({ backdrop: 'none' }).backdrop, 'none');
  assert.equal(normalizeAppearance({ backdrop: '../evil' }).backdrop, 'auto');
  assert.equal(normalizeAppearance({ emblem: 'witch', background: '#122334' }).backdrop, 'auto', 'old preferences gain automatic class art without losing other selections');
});
test('Photoshop-style HSV conversion preserves RGB values across the color cube', () => {
  for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
    const rgb = [r,g,b];
    assert.deepEqual(hsvToRgb(rgbToHsv(rgb)), rgb);
    assert.deepEqual(hexToRgb(rgbToHex(rgb)), rgb);
  }
  assert.deepEqual(hsvToRgb({ h: 360, s: 100, v: 100 }), [255,0,0]);
  assert.equal(rgbToHex([-3, 300, 128.6]), '#00ff81');
});
test('bright or black choices produce readable dark material backgrounds', () => {
  const white = appearanceVariables({ background: '#ffffff', accent: '#000000' });
  assert.equal(white['--ui-base'], '#ffffff');
  assert.ok(hexToRgb(white['--ui-ink']).every(channel => channel < 65));
  assert.ok(hexToRgb(white['--ui-panel']).every(channel => channel < 150));
  assert.ok(hexToRgb(white['--ui-accent-light']).every(channel => channel > 100));
});
test('both modules ship identical presentation and a distinct original asset for each class', () => {
  for (const path of ['scripts/velvet-appearance.mjs', 'styles/velvet-appearance.css']) {
    assert.equal(fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), fs.readFileSync(new URL(`../../pf2e-velvet-sheet/${path}`, import.meta.url), 'utf8'));
  }
  const sources = [];
  for (const id of ['default', ...EMBLEMS]) {
    const path = `styles/emblems/${id}.svg`;
    const source = fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.match(source, /<svg/); assert.doesNotMatch(source, /<script|onload=|href=["']https?:/);
    assert.equal(source, fs.readFileSync(new URL(`../../pf2e-velvet-sheet/${path}`, import.meta.url), 'utf8'));
    sources.push(source);
  }
  assert.equal(new Set(sources).size, sources.length);
});

test('each class has an original mirrored portrait illustration, independent of the badge', () => {
  const art = [];
  for (const id of EMBLEMS) {
    const path = `styles/class-backdrops/${id}.svg`;
    const source = fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.match(source, /viewBox="0 0 360 760"/);
    assert.doesNotMatch(source, /<script|onload=|href=["']https?:/);
    assert.equal(source, fs.readFileSync(new URL(`../../pf2e-velvet-sheet/${path}`, import.meta.url), 'utf8'));
    assert.notEqual(source, fs.readFileSync(new URL(`../styles/emblems/${id}.svg`, import.meta.url), 'utf8'));
    art.push(source);
  }
  assert.equal(new Set(art).size, EMBLEMS.length);
});
