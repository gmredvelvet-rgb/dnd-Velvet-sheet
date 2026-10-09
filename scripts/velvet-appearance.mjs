/** Personal sheet presentation. Stored on the current User, never on the Actor. */
export const DEFAULT_APPEARANCE = Object.freeze({ background: '#172536', accent: '#d0b27b', titleFont: 'cinzel', bodyFont: 'signika', ornament: 'astral', emblem: 'auto', backdrop: 'auto' });
export const FONTS = Object.freeze({
  cinzel: { label: 'Cinzel', family: "'Cinzel', Georgia, serif" },
  crimson: { label: 'Crimson Text', family: "'Crimson Text', Georgia, serif" },
  modesto: { label: 'Modesto Condensed', family: "'Modesto Condensed', Georgia, serif" },
  signika: { label: 'Signika', family: "'Signika', system-ui, sans-serif" },
  georgia: { label: 'Georgia', family: 'Georgia, serif' },
  palatino: { label: 'Palatino', family: "'Palatino Linotype', Palatino, serif" },
  modern: { label: 'Modern', family: 'system-ui, sans-serif' },
  mono: { label: 'Monospace', family: "'Cascadia Code', Consolas, monospace" }
});
export const EMBLEMS = Object.freeze(['alchemist', 'animist', 'artificer', 'barbarian', 'bard', 'champion', 'cleric', 'commander', 'druid', 'exemplar', 'fighter', 'guardian', 'gunslinger', 'investigator', 'kineticist', 'magus', 'monk', 'necromancer', 'oracle', 'psychic', 'ranger', 'rogue', 'runesmith', 'sorcerer', 'summoner', 'swashbuckler', 'thaumaturge', 'warlock', 'witch', 'wizard', 'blood-hunter']);
const ORNAMENTS = ['astral', 'royal', 'runic', 'minimal'];
const ALIASES = {
  paladin: 'champion', paladinchampion: 'champion', inventor: 'artificer',
  artificiero: 'artificer', artifice: 'artificer', alquimista: 'alchemist', animista: 'animist', barbaro: 'barbarian', bardo: 'bard',
  campeon: 'champion', clerigo: 'cleric', comandante: 'commander', druida: 'druid', ejemplar: 'exemplar',
  guerrero: 'fighter', guardian: 'guardian', pistolero: 'gunslinger', investigador: 'investigator',
  cineticista: 'kineticist', kineticista: 'kineticist', mago: 'wizard', monje: 'monk', nigromante: 'necromancer', oraculo: 'oracle',
  psiquico: 'psychic', explorador: 'ranger', picaro: 'rogue', forjador: 'runesmith', forjadorderunas: 'runesmith', hechicero: 'sorcerer',
  invocador: 'summoner', espadachin: 'swashbuckler', taumaturgo: 'thaumaturge', brujo: 'warlock', bruja: 'witch',
  bloodhunter: 'blood-hunter', cazadordesangre: 'blood-hunter'
};
const canonical = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
function classKey(value) {
  const key = canonical(value);
  return (Object.hasOwn(ALIASES, key) ? ALIASES[key] : null) ?? EMBLEMS.find(id => canonical(id) === key) ?? null;
}
export function classEmblem(actor, systemId) {
  const classes = systemId === 'dnd5e'
    ? Object.values(actor.classes ?? {}).sort((a, b) => (b.system?.levels ?? 0) - (a.system?.levels ?? 0))
    : [actor.class].filter(Boolean);
  if (!classes.length) classes.push(...Array.from(actor.items ?? []).filter(item => item.type === 'class').sort((a, b) => (b.system?.levels ?? 0) - (a.system?.levels ?? 0)));
  const primary = classes[0];
  if (!primary) return 'default';
  return classKey(primary.system?.identifier) ?? classKey(primary.system?.slug) ?? classKey(primary.name) ?? 'default';
}
const hexColor = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : null;
export function normalizeAppearance(value = {}) {
  return {
    background: hexColor(value?.background) ?? DEFAULT_APPEARANCE.background,
    accent: hexColor(value?.accent) ?? DEFAULT_APPEARANCE.accent,
    titleFont: Object.hasOwn(FONTS, value?.titleFont) ? value.titleFont : DEFAULT_APPEARANCE.titleFont,
    bodyFont: Object.hasOwn(FONTS, value?.bodyFont) ? value.bodyFont : DEFAULT_APPEARANCE.bodyFont,
    ornament: ORNAMENTS.includes(value?.ornament) ? value.ornament : DEFAULT_APPEARANCE.ornament,
    emblem: ['auto', 'default', ...EMBLEMS].includes(value?.emblem) ? value.emblem : 'auto',
    backdrop: ['auto', 'default', 'none', ...EMBLEMS].includes(value?.backdrop) ? value.backdrop : 'auto'
  };
}
export function hexToRgb(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
export function rgbToHex(rgb) { return '#' + rgb.map(n => Math.max(0, Math.min(255, Math.round(Number(n) || 0))).toString(16).padStart(2, '0')).join(''); }
export function rgbToHsv(rgb) {
  const [r, g, b] = rgb.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = !delta ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: max ? delta / max * 100 : 0, v: max * 100 };
}
export function hsvToRgb({ h, s, v }) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; v = Math.max(0, Math.min(100, v)) / 100;
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  const sector = Math.floor(h / 60);
  return [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][sector].map(n => Math.round((n + m) * 255));
}
const mix = (hex, target, amount) => rgbToHex(hexToRgb(hex).map((n, i) => n * (1 - amount) + hexToRgb(target)[i] * amount));
export function appearanceVariables(value) {
  const p = normalizeAppearance(value);
  // Preserve the selected hue while bounding luminance on readable dark surfaces.
  const surfaceRgb = hexToRgb(p.background), max = Math.max(...surfaceRgb);
  const surface = rgbToHex(surfaceRgb.map(channel => max > 88 ? channel * 88 / max : channel));
  return {
    '--ui-base': p.background, '--ui-accent': p.accent,
    '--ui-ink': mix(surface, '#050609', .8), '--ui-panel': mix(surface, '#090b10', .45),
    '--ui-card': mix(surface, '#13161b', .25), '--ui-raised': mix(surface, '#22252a', .15),
    '--ui-light': mix(surface, '#c0cbd1', .3), '--ui-accent-light': mix(p.accent, '#fff1d8', .55),
    '--ui-title-font': FONTS[p.titleFont].family, '--ui-body-font': FONTS[p.bodyFont].family,
    '--ui-emblem-hue': `${rgbToHsv(hexToRgb(p.accent)).h - 39}deg`
  };
}

export function mountSheetAppearance(sheet, element, moduleId) {
  const root = element.matches?.('.dnd-sheet') ? element : element.querySelector('.dnd-sheet');
  const app = root?.closest('.window-app');
  if (!app) return { destroy() {} };
  const doc = root.ownerDocument, view = doc.defaultView;
  const abort = new view.AbortController();
  const user = game.user, flagKey = `appearance.${sheet.actor.id}`;
  const t = key => game.i18n.localize(`VelvetAppearance.${key}`);
  let dialog, draft, picker, target = 'background', saving = false, destroyed = false;
  const saved = () => normalizeAppearance(user.getFlag(moduleId, flagKey));
  const emblemPath = id => `modules/${moduleId}/styles/emblems/${id}.svg`;
  function apply(value) {
    const p = normalizeAppearance(value);
    app.dataset.personalTheme = 'true'; app.dataset.ornament = p.ornament;
    for (const [key, val] of Object.entries(appearanceVariables(p))) app.style.setProperty(key, val);
    const id = p.emblem === 'auto' ? classEmblem(sheet.actor, game.system.id) : p.emblem;
    for (const img of root.querySelectorAll('.identity-crest, .sheet-emblem')) {
      img.src = emblemPath(id); img.dataset.emblem = id;
    }
    // The illustration follows the class independently of a manually chosen badge.
    const backdrop = p.backdrop === 'auto' ? classEmblem(sheet.actor, game.system.id) : p.backdrop;
    app.dataset.backdrop = backdrop;
    const artPath = backdrop === 'default' ? `modules/${moduleId}/styles/velvet-astral.svg` : `modules/${moduleId}/styles/class-backdrops/${backdrop}.svg`;
    app.style.setProperty('--ui-class-art', backdrop === 'none' ? 'none' : `url("${new URL(artPath, doc.baseURI).href}")`);
    if (dialog) {
      dialog.querySelector('[data-emblem-preview]').src = emblemPath(id);
      dialog.querySelector('[data-emblem-caption]').textContent = t(`Emblems.${id}`);
    }
  }
  function option(value, label) { const node = doc.createElement('option'); node.value = value; node.textContent = label; return node; }
  function renderPicker() {
    const color = draft[target], rgb = hexToRgb(color);
    const pad = dialog.querySelector('[data-color-pad]');
    pad.style.setProperty('--picker-hue', rgbToHex(hsvToRgb({ h: picker.h, s: 100, v: 100 })));
    pad.style.setProperty('--picker-x', `${picker.s}%`); pad.style.setProperty('--picker-y', `${100 - picker.v}%`);
    pad.setAttribute('aria-valuenow', String(Math.round(picker.s))); pad.setAttribute('aria-valuetext', `${color}; ${t('Saturation')} ${Math.round(picker.s)}%; ${t('Brightness')} ${Math.round(picker.v)}%`);
    dialog.querySelector('[data-hue]').value = String(picker.h);
    dialog.querySelector('[data-hex]').value = color.toUpperCase();
    dialog.querySelector('[data-hex]').setCustomValidity('');
    dialog.querySelector('[data-hue-value]').textContent = `${Math.round(picker.h)}°`;
    dialog.querySelector('[data-swatch]').style.background = color;
    dialog.querySelectorAll('[data-rgb]').forEach((input, i) => { input.value = String(rgb[i]); });
    dialog.querySelectorAll('[data-color-target]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.colorTarget === target));
      button.style.setProperty('--target-color', draft[button.dataset.colorTarget]);
    });
  }
  function setColor(color, keepHue = false) {
    draft[target] = color;
    if (!keepHue) { const next = rgbToHsv(hexToRgb(color)); if (next.s) picker.h = next.h; picker.s = next.s; picker.v = next.v; }
    renderPicker(); apply(draft);
  }
  function close() { if (saving) return; dialog?.close(); }
  function open() {
    if (dialog) { dialog.focus(); return; }
    draft = saved(); target = 'background'; picker = rgbToHsv(hexToRgb(draft[target]));
    dialog = doc.createElement('dialog'); dialog.className = 'velvet-appearance';
    // All text is filled with textContent below; no actor names or user input are interpolated as HTML.
    dialog.innerHTML = `<header class="appearance-header"><div><span data-label="Kicker"></span><h2 data-label="Title"></h2></div><button type="button" data-close aria-label=""><i class="fas fa-times" aria-hidden="true"></i></button></header>
      <form class="appearance-form"><p class="appearance-note" data-label="Personal"></p>
      <div class="appearance-layout"><section class="appearance-colors"><h3 data-label="Colors"></h3><div class="color-targets"><button type="button" data-color-target="background" data-label="Background"></button><button type="button" data-color-target="accent" data-label="Accent"></button></div>
      <div data-color-pad class="color-pad" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100"><span class="color-cursor"></span></div>
      <label class="hue-label"><span data-label="Hue"></span><output data-hue-value></output><input type="range" data-hue min="0" max="360" step="1"></label>
      <div class="rgb-fields"><label>R<input type="number" data-rgb="0" min="0" max="255" step="1" required></label><label>G<input type="number" data-rgb="1" min="0" max="255" step="1" required></label><label>B<input type="number" data-rgb="2" min="0" max="255" step="1" required></label></div>
      <div class="hex-field"><span data-swatch></span><label>HEX<input type="text" data-hex maxlength="7" pattern="#[0-9A-Fa-f]{6}" required spellcheck="false"></label></div>
      <p class="color-hint" data-label="ColorHint"></p><div class="appearance-presets"></div></section>
      <section class="appearance-details"><h3 data-label="Style"></h3><label><span data-label="TitleFont"></span><select name="titleFont"></select></label><label><span data-label="BodyFont"></span><select name="bodyFont"></select></label><label><span data-label="Ornament"></span><select name="ornament"></select></label><label><span data-label="Emblem"></span><select name="emblem"></select></label><label><span data-label="Backdrop"></span><select name="backdrop"></select></label>
      <div class="emblem-preview"><img data-emblem-preview alt=""><strong data-emblem-caption></strong><span data-label="AutomaticHint"></span></div><div class="font-sample"><strong data-label="SampleTitle"></strong><span data-label="SampleBody"></span></div></section></div>
      <footer><button type="button" data-reset data-label="Reset"></button><span data-save-status role="status"></span><button type="button" data-cancel data-label="Cancel"></button><button type="submit" class="appearance-save" data-label="Save"></button></footer></form>`;
    dialog.querySelectorAll('[data-label]').forEach(node => { node.textContent = t(node.dataset.label); });
    dialog.querySelector('[data-close]').ariaLabel = t('Cancel');
    dialog.querySelector('[data-color-pad]').ariaLabel = t('ColorPad');
    dialog.querySelector('[data-hue]').ariaLabel = t('Hue');
    dialog.querySelectorAll('[data-rgb]').forEach((input, i) => { input.ariaLabel = `${t('Channel')} ${['R','G','B'][i]}`; });
    dialog.querySelector('[data-hex]').ariaLabel = t('Hex');
    const title = dialog.querySelector('h2'); title.id = `velvet-appearance-title-${moduleId}-${sheet.appId}`; dialog.setAttribute('aria-labelledby', title.id);
    for (const field of ['titleFont', 'bodyFont']) {
      const select = dialog.querySelector(`[name="${field}"]`);
      for (const [key, font] of Object.entries(FONTS)) {
        const item = option(key, ['modern','mono'].includes(key) ? t(`Fonts.${key}`) : font.label); item.style.fontFamily = font.family; select.append(item);
      }
    }
    for (const key of ORNAMENTS) dialog.querySelector('[name="ornament"]').append(option(key, t(`Ornaments.${key}`)));
    const emblems = dialog.querySelector('[name="emblem"]');
    for (const id of ['auto', 'default', ...EMBLEMS]) emblems.append(option(id, t(`Emblems.${id}`)));
    for (const id of ['auto', 'default', 'none', ...EMBLEMS]) dialog.querySelector('[name="backdrop"]').append(option(id, t(id === 'none' ? 'NoBackdrop' : id === 'default' ? 'ClassicBackdrop' : `Emblems.${id}`)));
    const presets = [ ['Obsidian','#172536','#d0b27b'], ['Crimson','#3c1625','#e4b07a'], ['Emerald','#123e31','#b8d6b0'], ['Amethyst','#322042','#d2a9ed'], ['Ember','#432918','#efc075'], ['Ice','#173c48','#a8e1eb'] ];
    for (const [name, background, accent] of presets) {
      const button = doc.createElement('button'); button.type = 'button'; button.textContent = t(`Presets.${name}`); button.style.setProperty('--preset', background); button.style.setProperty('--preset-accent', accent);
      button.addEventListener('click', () => { draft.background = background; draft.accent = accent; picker = rgbToHsv(hexToRgb(draft[target])); renderPicker(); apply(draft); }); dialog.querySelector('.appearance-presets').append(button);
    }
    for (const key of ['titleFont','bodyFont','ornament','emblem','backdrop']) {
      const select = dialog.querySelector(`[name="${key}"]`); select.value = draft[key];
      select.addEventListener('change', () => { draft[key] = select.value; apply(draft); });
    }
    dialog.querySelectorAll('[data-color-target]').forEach(button => button.addEventListener('click', () => { target = button.dataset.colorTarget; picker = rgbToHsv(hexToRgb(draft[target])); renderPicker(); }));
    const pad = dialog.querySelector('[data-color-pad]');
    function move(event) {
      const rect = pad.getBoundingClientRect(); picker.s = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)); picker.v = Math.max(0, Math.min(100, 100 - (event.clientY - rect.top) / rect.height * 100));
      setColor(rgbToHex(hsvToRgb(picker)), true);
    }
    pad.addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); pad.focus(); pad.setPointerCapture(event.pointerId); move(event); });
    pad.addEventListener('pointermove', event => { if (pad.hasPointerCapture(event.pointerId)) move(event); });
    pad.addEventListener('pointerup', event => { if (pad.hasPointerCapture(event.pointerId)) pad.releasePointerCapture(event.pointerId); });
    pad.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
      event.preventDefault(); const step = event.shiftKey ? 10 : 1;
      picker.s = Math.max(0, Math.min(100, picker.s + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)));
      picker.v = Math.max(0, Math.min(100, picker.v + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0)));
      setColor(rgbToHex(hsvToRgb(picker)), true);
    });
    dialog.querySelector('[data-hue]').addEventListener('input', event => { picker.h = Number(event.target.value); setColor(rgbToHex(hsvToRgb(picker)), true); });
    dialog.querySelectorAll('[data-rgb]').forEach(input => input.addEventListener('input', () => {
      const fields = [...dialog.querySelectorAll('[data-rgb]')];
      if (fields.some(field => field.value === '' || !field.checkValidity())) return;
      setColor(rgbToHex(fields.map(field => Number(field.value))));
    }));
    dialog.querySelector('[data-hex]').addEventListener('input', event => {
      const color = hexColor(event.target.value); event.target.setCustomValidity(color ? '' : t('InvalidHex'));
      if (color) setColor(color);
    });
    dialog.querySelector('[data-reset]').addEventListener('click', () => {
      draft = { ...DEFAULT_APPEARANCE }; picker = rgbToHsv(hexToRgb(draft[target]));
      for (const key of ['titleFont','bodyFont','ornament','emblem','backdrop']) dialog.querySelector(`[name="${key}"]`).value = draft[key];
      renderPicker(); apply(draft);
    });
    dialog.querySelector('[data-close]').addEventListener('click', close); dialog.querySelector('[data-cancel]').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    dialog.addEventListener('close', () => { dialog?.remove(); dialog = null; if (!destroyed) { apply(saved()); root.querySelector('[data-appearance-open]')?.focus(); } }, { once: true });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } event.stopPropagation(); });
    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); event.stopPropagation(); if (saving || destroyed) return;
      saving = true; const current = dialog;
      current.querySelector('.appearance-layout').inert = true;
      current.querySelectorAll('button,input,select').forEach(node => { node.disabled = true; });
      try { await user.setFlag(moduleId, flagKey, normalizeAppearance(draft)); saving = false; if (!destroyed && dialog === current) close(); }
      catch (error) {
        saving = false; if (destroyed || dialog !== current) return;
        current.querySelector('.appearance-layout').inert = false;
        current.querySelectorAll('button,input,select').forEach(node => { node.disabled = false; });
        current.querySelector('[data-save-status]').textContent = t('SaveError'); console.error('Velvet appearance:', error);
      }
    });
    app.append(dialog); renderPicker(); apply(draft); dialog.showModal();
  }
  root.querySelector('[data-appearance-open]')?.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); open(); }, { signal: abort.signal });
  const hook = Hooks.on('updateUser', updated => { if (updated.id === user.id && !dialog && !destroyed) apply(saved()); });
  apply(saved());
  return { open, destroy() { destroyed = true; abort.abort(); Hooks.off('updateUser', hook); if (dialog) { dialog.remove(); dialog = null; } } };
}
