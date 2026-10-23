/** Preparation follows the installed system schema; legacy worlds remain supported. */
export function spellPreparation(item) {
  const s = item.system ?? {};
  const modern = typeof s.prepared === 'number';
  const mode = modern ? s.method : s.preparation?.mode;
  const always = modern ? s.prepared >= 2 : mode === 'always';
  const canPrepare = Number(s.level) > 0 && (modern ? Boolean(s.canPrepare ?? (mode === 'spell')) : mode === 'prepared');
  const prepared = modern ? s.prepared > 0 : Boolean(s.preparation?.prepared);
  return { prepared: prepared || always, alwaysPrepared: always, canPrepare,
    available: Number(s.level) === 0 || always || prepared || !canPrepare };
}

export function preparationUpdate(item) {
  const state = spellPreparation(item);
  if (!state.canPrepare || state.alwaysPrepared) return null;
  return typeof item.system.prepared === 'number'
    ? { 'system.prepared': state.prepared ? 0 : 1 }
    : { 'system.preparation.prepared': !state.prepared };
}

/** Level, preparation and text filters compose instead of overwriting each other. */
export function bindSpellFilters(sheet, root) {
  const tab = root.querySelector('.tab[data-tab="spells"]');
  if (!tab) return { apply() {}, destroy() {} };
  const abort = new AbortController();
  const state = sheet._spellFilterState ??= { level: 'all', prepared: false, query: '' };
  const apply = query => {
    if (query !== undefined) state.query = query.trim().toLowerCase();
    for (const row of tab.querySelectorAll('.spell-entry')) {
      const item = sheet.actor.items.get(row.dataset.itemId);
      const name = (item?.name ?? row.textContent).toLowerCase();
      row.hidden = Boolean(state.query && !name.includes(state.query))
        || Boolean(state.prepared && (!item || !spellPreparation(item).available));
      row.style.display = row.hidden ? 'none' : '';
    }
    for (const group of tab.querySelectorAll('.spell-level-group')) {
      const rows = [...group.querySelectorAll('.spell-entry')];
      const visible = (state.level === 'all' || group.dataset.level === state.level)
        && (!rows.length || rows.some(row => !row.hidden));
      group.hidden = !visible;
      group.style.display = visible ? '' : 'none';
    }
    for (const button of tab.querySelectorAll('.spell-filter')) {
      const active = button.dataset.filter === state.level;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    const toggle = tab.querySelector('[data-prepared-filter]');
    toggle?.classList.toggle('active', state.prepared);
    toggle?.setAttribute('aria-pressed', String(state.prepared));
  };
  tab.addEventListener('click', event => {
    const button = event.target.closest('.spell-filter, [data-prepared-filter]');
    if (!button) return;
    event.preventDefault();
    if (button.hasAttribute('data-prepared-filter')) state.prepared = !state.prepared;
    else state.level = button.dataset.filter;
    apply();
  }, { signal: abort.signal });
  apply();
  return { apply, destroy: () => abort.abort() };
}
