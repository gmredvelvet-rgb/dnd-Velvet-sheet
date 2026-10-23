/* Description viewer adapted from Velvet's TaleSpire sheet. */
import { itemDetailsHTML } from './velvet-item-details.mjs';
const rowSelector = '.feature-entry[data-item-id], .spell-entry[data-item-id], .inv-slot[data-item-id], .class-entry[data-item-id], .exploration-entry[data-item-id], .effect-entry[data-item-id], .prep-slot[data-spell-id]:not(.empty), .strike-entry[data-strike-idx]';
const iconSelector = '.feature-img, .spell-img, .inv-slot-img, .class-img, .exploration-img, .effect-img, .prep-slot-img, .strike-img';

/** Let the installed system enrich links, rolls, and player-visible descriptions. */
export async function itemDescription(item) {
  if (game.system.id === 'pf2e' && typeof item.getDescription === 'function') {
    const description = await item.getDescription({ secrets: Boolean(game.user.isGM) });
    return description?.value ?? '';
  }
  const description = item.system?.description;
  const value = !game.user.isGM && item.system?.identified === false
    ? item.system.unidentified?.description
    : typeof description === 'string' ? description : description?.value;
  const editor = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
  return editor.enrichHTML(value ?? '', {
    async: true, secrets: Boolean(item.isOwner), relativeTo: item,
    rollData: item.getRollData?.() ?? {}
  });
}

/** Bind view-only controls before the sheet's ownership gate. Destroy on render/close. */
export function bindItemInspector(sheet, root, prefix) {
  const doc = root.ownerDocument;
  const abort = new AbortController();
  const buttons = [];
  const icons = [];
  const localize = key => game.i18n.localize(`${prefix}.${key}`);
  let active = null;
  let destroyed = false;
  const resolve = row => row.matches('.strike-entry')
    ? sheet.actor.system.actions?.[Number(row.dataset.strikeIdx)]?.item
    : sheet.actor.items.get(row.dataset.spellId ?? row.dataset.itemId);
  const permitted = item => Boolean(item?.testUserPermission(game.user, 'OBSERVER'));

  const open = async (item, trigger) => {
    if (destroyed || !permitted(item)) return;
    active?.close();
    const dialog = doc.createElement('dialog');
    let restoreFocus = true;
    active = dialog;
    dialog.className = 'velvet-item-inspector';
    dialog.setAttribute('aria-label', item.name);
    const esc = foundry.utils.escapeHTML;
    dialog.innerHTML = `<header class="velvet-inspector-header">
      <img alt="" width="56" height="56">
      <div><small>${esc(game.i18n.localize(CONFIG.Item?.typeLabels?.[item.type] ?? item.type))}</small><h2>${esc(item.name)}</h2></div>
      <button type="button" data-inspector-close autofocus aria-label="${esc(localize('Close'))}" title="${esc(localize('Close'))}"><i class="fas fa-xmark" aria-hidden="true"></i></button>
      </header><div class="velvet-inspector-body" aria-live="polite" aria-busy="true">${itemDetailsHTML(item)}<div data-inspector-description>${esc(localize('Loading'))}</div></div>
      <footer><button type="button" data-inspector-sheet><i class="fas fa-up-right-from-square" aria-hidden="true"></i> ${esc(localize('Sheet'))}</button></footer>`;
    const img = dialog.querySelector('img');
    img.src = item.img || 'icons/svg/item-bag.svg';
    img.addEventListener('error', () => { img.src = 'icons/svg/item-bag.svg'; }, { once: true });
    const close = () => dialog.close();
    dialog.querySelector('[data-inspector-close]').addEventListener('click', close);
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (active === dialog) active = null;
      if (restoreFocus && !destroyed && !active && trigger.isConnected) trigger.focus();
    }, { once: true });
    dialog.addEventListener('keydown', event => event.stopPropagation());
    dialog.addEventListener('click', event => {
      // Enriched links/rolls must reach the system's document-level listeners.
      if (event.target.closest('.velvet-inspector-body')) return;
      event.stopPropagation();
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    dialog.querySelector('[data-inspector-sheet]').addEventListener('click', () => {
      restoreFocus = false;
      close();
      if (permitted(item)) item.sheet?.render(true);
    });
    // Reuse the row's native action, including its spell slot and rank context.
    const row = trigger.closest(rowSelector);
    const use = row?.querySelector('.spell-use, .item-use, .item-roll, .strike-attack');
    if (use && sheet.isEditable && sheet.actor.isOwner && !row.classList.contains('expended')) {
      const action = doc.createElement('button');
      action.type = 'button';
      action.dataset.inspectorUse = '';
      action.textContent = item.type === 'spell' ? 'Cast' : use.matches('.strike-attack') ? 'Attack' : 'Use';
      action.addEventListener('click', event => {
        if (!dialog.open || !permitted(item) || !sheet.isEditable || !sheet.actor.isOwner || !use.isConnected || use.disabled) return;
        restoreFocus = false;
        close();
        use.dispatchEvent(new doc.defaultView.MouseEvent('click', {
          bubbles: true, cancelable: true, shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey
        }));
      });
      dialog.querySelector('footer').prepend(action);
    }
    root.append(dialog);
    dialog.showModal();
    const body = dialog.querySelector('.velvet-inspector-body');
    const content = body.querySelector('[data-inspector-description]');
    body.dataset.itemId = item.id;
    try {
      const description = await itemDescription(item);
      if (destroyed || active !== dialog || !dialog.open || !dialog.isConnected) return;
      if (!permitted(item)) return close();
      content.innerHTML = description || `<p>${esc(localize('Empty'))}</p>`;
    } catch (error) {
      console.error('Velvet sheets | item description', error);
      if (!destroyed && active === dialog && dialog.open) content.textContent = localize('Error');
    } finally {
      body.setAttribute('aria-busy', 'false');
    }
  };

  for (const row of root.querySelectorAll(rowSelector)) {
    const item = resolve(row);
    if (!permitted(item)) continue;
    const icon = row.querySelector(iconSelector);
    if (icon) {
      const attrs = ['tabindex', 'role', 'aria-label', 'title'];
      icons.push([icon, Object.fromEntries(attrs.map(key => [key, icon.getAttribute(key)]))]);
      icon.setAttribute('tabindex', '0');
      icon.setAttribute('role', 'button');
      icon.setAttribute('aria-label', `${localize('Details')}: ${item.name}`);
      icon.title = `${localize('Details')}: ${item.name}`;
    }
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'velvet-item-info';
    button.title = `${localize('Details')}: ${item.name}`;
    button.setAttribute('aria-label', button.title);
    button.innerHTML = `<i class="fas fa-circle-info" aria-hidden="true"></i><span>${foundry.utils.escapeHTML(localize('Info'))}</span>`;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      void open(resolve(row), button);
    }, { signal: abort.signal });
    button.addEventListener('dblclick', event => event.stopPropagation(), { signal: abort.signal });
    // A persistent corner button on tiles; inline in action groups elsewhere.
    const controls = row.querySelector('.feature-controls, .spell-controls, .prep-slot-controls, .strike-controls, .class-controls, .effect-controls');
    if (controls) controls.prepend(button);
    else row.append(button);
    buttons.push(button);
  }

  const inspectIcon = event => {
    if (!event.target.matches(iconSelector)) return;
    const row = event.target.closest(rowSelector);
    if (!row || !permitted(resolve(row))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(resolve(row), event.target);
  };
  // Capture prevents inventory popups and exploration toggles when inspecting an icon.
  root.addEventListener('click', inspectIcon, { capture: true, signal: abort.signal });
  root.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') inspectIcon(event);
  }, { capture: true, signal: abort.signal });

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      abort.abort();
      active?.close();
      active?.remove();
      active = null;
      buttons.forEach(button => button.remove());
      icons.forEach(([icon, attrs]) => {
        for (const [key, value] of Object.entries(attrs)) {
          if (value === null) icon.removeAttribute(key);
          else icon.setAttribute(key, value);
        }
      });
    }
  };
}
