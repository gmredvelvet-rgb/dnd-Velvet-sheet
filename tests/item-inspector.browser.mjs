// Real browser interactions with the installed inspector modules and simulated system documents.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const modulesRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(modulesRoot, 'talespire-in-foundryvtt/artifacts/item-card-details-20261017');
const rows = [
  ['spell-entry', 'spell-img', 'spell-controls', 'spell-use', 'spell'],
  ['feature-entry', 'feature-img', 'feature-controls', 'item-use', 'feat'],
  ['inv-slot', 'inv-slot-img', 'inv-slot-actions', 'item-roll', 'equipment'],
  ['class-entry', 'class-img', 'class-controls', '', 'class'],
  ['exploration-entry', 'exploration-img', '', '', 'exploration'],
  ['effect-entry', 'effect-img', 'effect-controls', '', 'effect'],
  ['prep-slot', 'prep-slot-img', 'prep-slot-controls', 'spell-use', 'prepared'],
  ['strike-entry', 'strike-img', 'strike-controls', 'strike-attack', 'strike']
];

const html = (module, system) => `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="/${module}/styles/velvet-premium.css">
<style>body{margin:0;background:#09111b;color:#eee;font:14px Arial}.window-app{padding:16px}.test-row{display:flex;align-items:center;gap:16px;margin:8px;padding:10px;background:#182534}.test-row>img{width:48px;height:48px;object-fit:contain}.test-row button{margin-left:auto}.inv-slot{position:relative}.velvet-item-inspector footer{gap:8px}</style>
<section id="sheet" class="window-app ${system === 'pf2e' ? 'velvet-sheet' : 'aaa-sheet'}">
${rows.map(([row, icon, controls, action, type], index) => `<div class="test-row ${row}" data-item-id="${type}" data-spell-id="${type}" data-strike-idx="0">
  <img class="${icon}" src="/icon.svg" title="Original ${type}"><span>${type}</span><div class="${controls}">${action ? `<button type="button" class="${action}">Native action</button>` : ''}</div></div>`).join('')}
</section><script type="module">
import { bindItemInspector } from '/${module}/scripts/velvet-item-inspector.mjs';
const system=${JSON.stringify(system)};
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const locale={Details:'View information',Close:'Close',Info:'Info',Sheet:'Open full sheet',Loading:'Loading description…',Empty:'No description',Error:'The description could not be loaded.'};
globalThis.game={system:{id:system},user:{isGM:false},i18n:{localize:key=>locale[key.split('.').at(-1)]??key}};
globalThis.CONFIG={Item:{typeLabels:{}},PF2E:{spellTraits:{fire:'Fire',concentrate:'Concentrate',manipulate:'Manipulate'},rarityTraits:{uncommon:'Uncommon'},magicTraditions:{arcane:'Arcane'},saves:{reflex:'Reflex'}},DND5E:{spellSchools:{evo:{label:'Evocation'}},itemProperties:{vocal:{label:'Verbal'},somatic:{label:'Somatic'},concentration:{label:'Concentration'}}}};
globalThis.foundry={utils:{escapeHTML},applications:{ux:{TextEditor:{implementation:{enrichHTML:async value=>{
 if(globalThis.defer)await new Promise(resolve=>globalThis.finish=resolve);return value;
}}}}}};
globalThis.calls=[];globalThis.rowClicks=[];globalThis.links=0;globalThis.allow=true;
const desc='<p><strong>Complete spell effect</strong></p><p><a href="#rules" data-rule>Read the rules</a></p>'+('<p>Effect and heightened details remain readable.</p>'.repeat(8));
const items=new Map(${JSON.stringify(rows.map(r => r[4]))}.map(id=>[id,{id,name:id==='spell'||id==='prepared'?'Fireball':id,type:id==='prepared'?'spell':id,img:'/icon.svg',isOwner:true,
 rank:5,traditions:new Set(['arcane']),area:{label:'20-foot burst'},testUserPermission:()=>allow,getRollData:()=>({level:5}),
 labels:system==='dnd5e'?{activation:'1 Action',range:'150 feet',target:'Creatures in a 20-foot sphere',concentrationDuration:'Concentration, up to 1 minute',components:{vsm:'V, S, M'},materials:'A pinch of ash'}:{},
 system:system==='pf2e'?{level:{value:3},traits:{value:['fire','concentrate','manipulate'],rarity:'uncommon'},time:{value:'2'},range:{value:'500 feet'},target:{value:'All creatures'},duration:{value:'1 minute',sustained:true},defense:{save:{statistic:'reflex',basic:true}},description:{value:desc}}
 :{level:3,school:'evo',properties:new Set(['vocal','somatic','concentration']),description:{value:desc}},
 sheet:{render:()=>calls.push({kind:'full-sheet',id})}}]));
if(system==='pf2e')for(const item of items.values())item.getDescription=async()=>{if(globalThis.defer)await new Promise(resolve=>globalThis.finish=resolve);return {value:desc,gm:'SECRET GM NOTES'}};
globalThis.sheet={isEditable:true,actor:{isOwner:true,items,system:{actions:[{item:items.get('strike')}]}}};
const root=document.querySelector('#sheet');
for(const row of root.querySelectorAll('.test-row')){
 row.addEventListener('click',event=>{if(event.target.closest('button'))return;rowClicks.push(row.dataset.itemId)});
 for(const control of row.querySelectorAll('button'))control.addEventListener('click',event=>calls.push({kind:'native',id:row.dataset.itemId,shift:event.shiftKey}));
}
document.addEventListener('click',event=>{if(event.target.closest('[data-rule]')){event.preventDefault();links++}});
globalThis.binding=bindItemInspector(sheet,root,'test.inspector');
globalThis.loaded=true;
</script>`;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(html(url.searchParams.get('module'), url.searchParams.get('system')));
    }
    if (url.pathname === '/icon.svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" rx="8" fill="#997543"/><path d="M30 7L13 42h34z" fill="#e7d3a9"/></svg>');
    }
    const file = resolve(modulesRoot, '.' + url.pathname);
    if (!file.startsWith(modulesRoot + (process.platform === 'win32' ? '\\' : '/'))) throw Error('Bad path');
    res.setHeader('Content-Type', { '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { chromium } = await import(pathToFileURL(join(process.env.PLAYWRIGHT_PATH, 'index.mjs')).href);
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(10000);
await mkdir(output, { recursive: true });
try {
  for (const [module, system] of [['pf2e-velvet-sheet', 'pf2e'], ['dnd-velvet-sheets', 'dnd5e']]) {
    await page.goto(`http://127.0.0.1:${server.address().port}/?module=${module}&system=${system}`);
    await page.waitForFunction(() => globalThis.loaded);
    const card = page.locator('dialog.velvet-item-inspector');
    const close = async () => { await page.locator('[data-inspector-close]').click(); await card.waitFor({ state: 'detached' }); };
    for (const [, icon] of rows) {
      await page.locator('#sheet > .test-row .' + icon).click();
      await page.locator('.velvet-inspector-body strong').waitFor();
      assert.equal(await card.count(), 1);
      assert.ok(!(await card.textContent()).includes('SECRET GM NOTES'));
      await close();
    }
    assert.deepEqual(await page.evaluate(() => calls), [], 'opening any icon cannot cast, edit, consume or post');
    assert.deepEqual(await page.evaluate(() => rowClicks), [], 'icon inspection cannot toggle exploration/inventory');
    const icon = page.locator('#sheet > .spell-entry .spell-img');
    await icon.focus(); await page.keyboard.press('Enter');
    await page.locator('.velvet-inspector-body strong').waitFor();
    const facts = await page.locator('.velvet-inspector-facts').textContent();
    assert.ok(facts.includes(system === 'pf2e' ? 'Rank5' : 'SchoolEvocation'));
    assert.ok(facts.includes(system === 'pf2e' ? '500 feet' : '150 feet'));
    assert.ok((await page.locator('.velvet-inspector-traits').textContent()).includes(system === 'pf2e' ? 'Fire' : 'Concentration'));
    await page.locator('[data-rule]').click();
    assert.equal(await page.evaluate(() => links), 1, 'enriched rule links reach system listeners');
    await page.locator('[data-inspector-use]').click({ modifiers: ['Shift'] });
    assert.deepEqual(await page.evaluate(() => calls), [{ kind: 'native', id: 'spell', shift: true }]);
    await card.waitFor({ state: 'detached' });
    await page.evaluate(() => { calls.length=0; });
    await icon.focus(); await page.keyboard.press('Space'); await card.waitFor();
    await page.keyboard.press('Escape'); await card.waitFor({ state: 'detached' });
    assert.equal(await icon.evaluate(el => document.activeElement === el), true, 'Escape restores icon focus');
    await page.evaluate(() => { sheet.actor.isOwner=false; sheet.isEditable=false; });
    await icon.click(); await card.waitFor();
    assert.equal(await page.locator('[data-inspector-use]').count(), 0, 'observers can read without a use control');
    await page.locator('[data-inspector-sheet]').click(); await card.waitFor({ state: 'detached' });
    assert.deepEqual(await page.evaluate(() => calls), [{ kind: 'full-sheet', id: 'spell' }]);
    await page.evaluate(() => { calls.length=0;sheet.actor.isOwner=true;sheet.isEditable=true; });
    await icon.click(); await card.waitFor();
    await page.evaluate(() => { sheet.actor.isOwner=false; });
    await page.locator('[data-inspector-use]').click();
    assert.deepEqual(await page.evaluate(() => calls), [], 'permission loss prevents use');
    await close();
    await page.evaluate(() => { sheet.actor.isOwner=true;defer=true; });
    await icon.click(); await card.waitFor(); await close();
    await page.evaluate(() => { defer=false;finish(); });
    assert.equal(await card.count(), 0, 'late descriptions cannot reopen a dismissed card');
    await page.setViewportSize({ width: 320, height: 600 });
    await icon.click(); await page.locator('.velvet-inspector-body strong').waitFor();
    const box = await card.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 320 && box.y + box.height <= 600, 'card fits small viewport');
    assert.equal(await page.locator('[data-inspector-use]').isVisible(), true);
    await page.screenshot({ path: join(output, `${system}-sheet-card.png`) });
    await close();
    await page.evaluate(() => { binding.destroy(); });
    assert.equal(await icon.getAttribute('role'), null, 'cleanup restores original icon semantics');
    assert.equal(await icon.getAttribute('title'), 'Original spell');
    assert.equal(await page.locator('.velvet-item-info').count(), 0);
    await icon.click();
    assert.equal(await card.count(), 0, 'cleanup removes icon handlers');
    await page.setViewportSize({ width: 1000, height: 800 });
    console.log(`PASS ${module}: all icons, full metadata, native action, keyboard, observer, async dismissal, links, cleanup and 320px layout`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
