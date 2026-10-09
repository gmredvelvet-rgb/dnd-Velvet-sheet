/** Progression uses the system manager and Plutonium's public importer API. */
const localize = key => game.i18n.localize(`AAA.Progression.${key}`);

export function progressionAccess(actor, editable) {
  const module = game.modules.get("plutonium");
  const api = module?.active ? module.api : null;
  const minimumRole = api?.config?.getValue?.("import", "minimumRole") ?? 0;
  const maxLevel = CONFIG.DND5E.maxLevel ?? 20;
  return {
    canAdvance: Boolean(editable && actor.isOwner && (actor.system.details.level ?? 0) < maxLevel),
    canUsePlutonium: Boolean(editable && actor.isOwner && api?.importer?.pOpen && game.user.role >= minimumRole),
    maxLevel
  };
}

export function renderAdvancement(manager) {
  const ApplicationV2 = foundry.applications?.api?.ApplicationV2;
  return manager.render(ApplicationV2 && manager instanceof ApplicationV2 ? { force: true } : true);
}

export async function advanceClass(actor, classId, editable) {
  if (!progressionAccess(actor, editable).canAdvance) return false;
  const item = actor.items.get(classId);
  if (!item || item.type !== "class") return false;
  const Manager = game.dnd5e?.applications?.advancement?.AdvancementManager;
  if (!game.settings.get("dnd5e", "disableAdvancements")) {
    if (!Manager?.forLevelChange) throw new Error(localize("Unavailable"));
    // The system expects a DELTA, not the resulting class level.
    const manager = Manager.forLevelChange(actor, item.id, 1);
    if (manager.steps.length) return renderAdvancement(manager);
  }
  // Match the official sheet when there are no advancement steps, or the GM disabled them.
  return item.update({ "system.levels": item.system.levels + 1 });
}

export async function openPlutoniumProgression(actor, editable) {
  if (!progressionAccess(actor, editable).canUsePlutonium) return false;
  // Includes sources, class/subclass selection, target levels, HP, spells and proficiency choices.
  // Plutonium does not export its sheet Level Up manager; never access its private bundle classes.
  return game.modules.get("plutonium").api.importer.pOpen({ actor, modeId: "classes-subclasses" });
}
