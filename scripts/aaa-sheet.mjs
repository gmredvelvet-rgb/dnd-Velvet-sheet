/**
 * AAA D&D Character Sheet — Foundry VTT Module
 * Custom RPG-style ActorSheet for D&D 5e characters
 */

import VA from "./aaa-animations.mjs";

const MODULE_ID = "dnd-sheet-aaa";

/* ============================================== */
/*  Sound System — Helpers                        */
/* ============================================== */

function _aaaIsFirstGM() {
  const firstGm = game.users
    .filter(u => u.isGM && u.active)
    .sort((a, b) => a.id.localeCompare(b.id))
    .shift();
  return game.userId === firstGm?.id;
}

function _aaaResolveActor(speaker) {
  if (!speaker) return null;
  if (speaker.scene && speaker.token) {
    try {
      const scene = game.scenes.get(speaker.scene);
      const token = scene?.tokens?.get(speaker.token);
      if (token?.actor) return token.actor;
    } catch (e) { /* ignore */ }
  }
  if (speaker.actor) return game.actors.get(speaker.actor);
  return null;
}

/**
 * Deep-search an object for any string value containing "Item."
 * Returns the first UUID-like string found.
 */
function _aaaFindItemUuid(obj, depth = 0) {
  if (depth > 5 || !obj) return null;
  if (typeof obj === "string" && obj.includes("Item.")) return obj;
  if (typeof obj === "object") {
    for (const val of Object.values(obj)) {
      const found = _aaaFindItemUuid(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function _aaaPlayItemSound(playlistId, trackId, volume = 0.8) {
  const playlist = game.playlists.get(playlistId);
  if (!playlist) return;

  if (trackId === "random-track") {
    const ids = playlist.sounds.map(s => s.id);
    if (!ids.length) return;
    trackId = ids[Math.floor(Math.random() * ids.length)];
  }

  if (trackId === "play-all") {
    return await playlist.playAll();
  }

  const sound = playlist.sounds.get(trackId);
  if (!sound) return;
  await playlist.playSound(sound);
}

async function _aaaProcessChatSound(message) {
  if (!_aaaIsFirstGM()) return;
  if (message.getFlag(MODULE_ID, "soundPlayed")) return;

  let item = null;
  const dnd5eFlags = message.flags?.dnd5e;

  // Method 1: dnd5e 5.x — flags.dnd5e.item.uuid / flags.dnd5e.item.id
  if (!item && dnd5eFlags?.item) {
    const uuid = dnd5eFlags.item.uuid;
    const id = dnd5eFlags.item.id;
    if (uuid) {
      try { item = await fromUuid(uuid); } catch (e) { /* ignore */ }
    }
    if (!item && id) {
      const actor = _aaaResolveActor(message.speaker);
      if (actor) item = actor.items.get(id);
    }
  }

  // Method 2: dnd5e legacy paths (older versions)
  if (!item && dnd5eFlags) {
    const uuid = dnd5eFlags?.use?.itemUuid
      ?? dnd5eFlags?.roll?.itemUuid
      ?? dnd5eFlags?.itemUuid;
    if (uuid) {
      try { item = await fromUuid(uuid); } catch (e) { /* ignore */ }
    }
  }

  // Method 3: dnd5e message helper (if available)
  if (!item && typeof message.getAssociatedItem === "function") {
    try { item = await message.getAssociatedItem(); } catch (e) { /* ignore */ }
  }

  if (!item) return;

  const playlistId = item.getFlag(MODULE_ID, "soundPlaylist");
  const trackId = item.getFlag(MODULE_ID, "soundTrack");
  if (!playlistId || !trackId) return;

  const volume = item.getFlag(MODULE_ID, "soundVolume") ?? 0.8;
  await _aaaPlayItemSound(playlistId, trackId, volume);
  await message.setFlag(MODULE_ID, "soundPlayed", true);
}

async function _aaaProcessChatImage(message) {
  // No GM guard — every client fires this so all players see the action image.
  let item = null;
  const dnd5eFlags = message.flags?.dnd5e;

  if (dnd5eFlags?.item) {
    const uuid = dnd5eFlags.item.uuid;
    const id = dnd5eFlags.item.id;
    if (uuid) {
      try { item = await fromUuid(uuid); } catch (e) { /* ignore */ }
    }
    if (!item && id) {
      const actor = _aaaResolveActor(message.speaker);
      if (actor) item = actor.items.get(id);
    }
  }

  if (!item && dnd5eFlags) {
    const uuid = dnd5eFlags?.use?.itemUuid
      ?? dnd5eFlags?.roll?.itemUuid
      ?? dnd5eFlags?.itemUuid;
    if (uuid) {
      try { item = await fromUuid(uuid); } catch (e) { /* ignore */ }
    }
  }

  if (!item && typeof message.getAssociatedItem === "function") {
    try { item = await message.getAssociatedItem(); } catch (e) { /* ignore */ }
  }

  if (!item) return;

  const imagePath = item.getFlag(MODULE_ID, "actionImage");
  if (!imagePath) return;

  const actor = _aaaResolveActor(message.speaker);
  const rollType = _aaaDetectRollType(message);

  Hooks.callAll("vnd-enhanced.actionImage", {
    imagePath,
    actorName: actor?.name ?? message.speaker?.alias ?? "",
    actorImg: actor?.img ?? "",
    actionName: item.name ?? "",
    rollType
  });
}

function _aaaDetectRollType(message) {
  const flags = message.flags?.dnd5e;
  if (!flags) return "attack";
  const msgType = message.flags?.dnd5e?.activity?.type
    ?? message.flags?.dnd5e?.roll?.type
    ?? "";
  if (msgType === "damage" || flags.roll?.type === "damage") return "damage";
  if (msgType === "healing") return "heal";
  if (msgType === "save" || msgType === "ability-save") return "save";
  if (msgType === "spell" || flags.item?.type === "spell") return "spell";
  const rolls = message.rolls ?? [];
  for (const roll of rolls) {
    const formula = roll.formula ?? "";
    if (/d(6|8|10|12)/.test(formula) && !formula.includes("+")) return "damage";
  }
  return "attack";
}

/* ============================================== */
/*  Sound System — Sound Config FormApplication   */
/* ============================================== */

class AAASoundConfig extends FormApplication {
  constructor(item, options = {}) {
    super(item, options);
    this.item = item;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "aaa-sound-config",
      title: "Item Sound Configuration",
      template: `modules/${MODULE_ID}/templates/aaa-sound-config.hbs`,
      classes: ["aaa-sound-config"],
      width: 400,
      height: "auto"
    });
  }

  async getData() {
    const flags = this.item.flags[MODULE_ID] ?? {};
    const currentPlaylist = flags.soundPlaylist ?? "";
    const volume = flags.soundVolume ?? 0.8;
    return {
      playlists: game.playlists.contents,
      currentPlaylist,
      currentTrack: flags.soundTrack ?? "",
      tracks: currentPlaylist
        ? game.playlists.get(currentPlaylist)?.sounds?.contents ?? []
        : [],
      volume,
      volumePct: Math.round(volume * 100),
      actionImage: flags.actionImage ?? ""
    };
  }

  async _updateObject(event, formData) {
    await this.item.update({
      [`flags.${MODULE_ID}.soundPlaylist`]: formData.playlist,
      [`flags.${MODULE_ID}.soundTrack`]: formData.track,
      [`flags.${MODULE_ID}.soundVolume`]: Number.parseFloat(formData.volume),
      [`flags.${MODULE_ID}.actionImage`]: formData.actionImage ?? ""
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("select[name='playlist']").on("change", ev => {
      const playlistId = ev.target.value;
      this.item.flags[MODULE_ID] = this.item.flags[MODULE_ID] ?? {};
      this.item.flags[MODULE_ID].soundPlaylist = playlistId;
      this.render();
    });

    html.find(".aaa-sound-preview").on("click", () => {
      const playlistId = html.find("[name='playlist']").val();
      const trackId = html.find("[name='track']").val();
      const volume = Number.parseFloat(html.find("[name='volume']").val()) || 0.8;
      if (playlistId && trackId) _aaaPlayItemSound(playlistId, trackId, volume);
    });

    html.find(".aaa-sound-clear").on("click", async () => {
      await this.item.update({
        [`flags.${MODULE_ID}.soundPlaylist`]: "",
        [`flags.${MODULE_ID}.soundTrack`]: "",
        [`flags.${MODULE_ID}.soundVolume`]: 0.8
      });
      this.render();
    });

    html.find("[name='volume']").on("input", ev => {
      html.find(".aaa-vol-val").text(Math.round(ev.target.value * 100) + "%");
    });

    html.find(".aaa-action-img-pick").on("click", () => {
      const fp = new FilePicker({
        type: "image",
        current: html.find("[name='actionImage']").val() || "",
        callback: path => {
          html.find("[name='actionImage']").val(path);
          const preview = html.find(".aaa-action-img-preview")[0];
          preview.src = path;
          preview.style.display = "";
        }
      });
      fp.browse();
    });

    html.find(".aaa-action-img-clear").on("click", () => {
      html.find("[name='actionImage']").val("");
      const preview = html.find(".aaa-action-img-preview")[0];
      preview.src = "";
      preview.style.display = "none";
    });
  }
}

/* ============================================== */
/*  Character Sheet                               */
/* ============================================== */

class AAACharacterSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "aaa-sheet"],
      template: "modules/dnd-sheet-aaa/templates/aaa-character-sheet.hbs",
      width: 900,
      height: 720,
      resizable: true,
      tabs: [],
      dragDrop: [{ dragSelector: "[data-item-id]", dropSelector: null }],
      scrollY: [".aaa-panel .tab"]
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    const actor = this.actor;
    const systemData = actor.system;

    // Base data
    context.system = systemData;
    context.flags = actor.flags;
    context.rollData = actor.getRollData();
    context.isEditable = this.isEditable;
    context.isOwner = actor.isOwner;

    // Abilities with modifiers
    const prof = systemData.attributes.prof ?? 0;
    context.abilities = {};
    for (const [key, ability] of Object.entries(systemData.abilities)) {
      const saveMod = ability.mod + (ability.saveProf?.flat ?? (ability.proficient ? prof : 0));
      context.abilities[key] = {
        key,
        label: CONFIG.DND5E.abilities[key]?.abbreviation ?? key.toUpperCase(),
        fullLabel: CONFIG.DND5E.abilities[key]?.label ?? key,
        value: ability.value,
        mod: ability.mod,
        modStr: (ability.mod >= 0 ? "+" : "") + ability.mod,
        save: saveMod,
        saveStr: (saveMod >= 0 ? "+" : "") + saveMod,
        proficient: ability.proficient
      };
    }

    // HP data
    const hp = systemData.attributes.hp;
    context.hp = {
      value: hp.value,
      max: hp.max,
      temp: hp.temp || 0,
      tempmax: hp.tempmax || 0,
      pct: Math.clamp(Math.round((hp.value / hp.max) * 100), 0, 100)
    };

    // AC
    context.ac = systemData.attributes?.ac?.value ?? systemData.attributes?.ac ?? "—";

    // Speed
    context.speed = {};
    const movement = systemData.attributes.movement;
    if (movement) {
      context.speed.walk = movement.walk;
      context.speed.fly = movement.fly;
      context.speed.swim = movement.swim;
      context.speed.climb = movement.climb;
      context.speed.burrow = movement.burrow;
      context.speed.hover = movement.hover;
      context.speed.units = movement.units || "ft";
    }

    // Initiative
    context.initiative = systemData.attributes.init?.total ?? 0;
    context.initiativeStr = (context.initiative >= 0 ? "+" : "") + context.initiative;

    // Proficiency Bonus
    context.profBonus = systemData.attributes.prof ?? 0;
    context.profBonusStr = "+" + context.profBonus;

    // Level / Class
    context.level = systemData.details?.level ?? 0;
    context.classLabels = Object.values(actor.classes ?? {})
      .sort((a, b) => b.system.levels - a.system.levels)
      .map(c => `${c.name} ${c.system.levels}`)
      .join(" / ") || "—";

    // Race / Species
    const race = systemData.details?.race;
    context.race = (race instanceof Item) ? race.name : (race ?? "—");

    // Alignment
    context.alignment = systemData.details?.alignment ?? "—";

    // Experience
    context.xp = systemData.details?.xp ?? { value: 0, max: 0 };
    context.xpPct = context.xp.max > 0 ? Math.round((context.xp.value / context.xp.max) * 100) : 0;

    // Hit Dice
    context.hitDice = this._prepareHitDice(actor);

    // Death Saves (pre-computed pips)
    const ds = systemData.attributes.death ?? { success: 0, failure: 0 };
    context.deathSaves = {
      success: ds.success,
      failure: ds.failure,
      successPips: [1, 2, 3].map(n => ({ filled: n <= ds.success })),
      failurePips: [1, 2, 3].map(n => ({ filled: n <= ds.failure }))
    };

    // Inspiration
    context.inspiration = systemData.attributes.inspiration;

    // Skills
    context.skills = this._prepareSkills(systemData);

    // Saving Throws
    context.savingThrows = this._prepareSavingThrows(systemData);

    // Items categorized
    context.inventory = this._prepareInventory(actor);
    context.spellbook = this._prepareSpellbook(actor);
    context.features = this._prepareFeatures(actor);

    // Currency
    const currency = systemData.currency ?? {};
    context.currency = {
      pp: currency.pp ?? 0,
      gp: currency.gp ?? 0,
      ep: currency.ep ?? 0,
      sp: currency.sp ?? 0,
      cp: currency.cp ?? 0
    };

    // Custom background image flag
    context.bgImage = actor.getFlag("dnd-sheet-aaa", "bgImage") ?? "";
    context.bgOpacity = actor.getFlag("dnd-sheet-aaa", "bgOpacity") ?? 80;

    // Spell slots
    context.spellSlots = this._prepareSpellSlots(systemData);

    // Spellcasting ability
    context.spellcastingAbility = systemData.attributes?.spellcasting || "—";
    const scAbility = systemData.abilities?.[systemData.attributes?.spellcasting];
    context.spellDC = systemData.attributes?.spelldc ?? (scAbility ? 8 + context.profBonus + scAbility.mod : "—");
    context.spellAttack = scAbility ? context.profBonus + scAbility.mod : "—";
    context.spellAttackStr = typeof context.spellAttack === "number"
      ? ((context.spellAttack >= 0 ? "+" : "") + context.spellAttack)
      : "—";

    // Biography
    context.biography = await TextEditor.enrichHTML(systemData.details?.biography?.value ?? "", {
      secrets: actor.isOwner,
      rollData: context.rollData,
      async: true,
      relativeTo: actor
    });

    // Senses
    context.senses = systemData.attributes?.senses ?? {};

    // Resistances, Immunities, Vulnerabilities
    context.traits = this._prepareTraits(systemData);

    // Conditions / Effects
    context.effects = this._prepareEffects(actor);

    // Class items for display/editing
    context.classItems = [];
    for (const cls of Object.values(actor.classes ?? {})) {
      const sub = cls.subclass;
      context.classItems.push({
        id: cls.id,
        name: cls.name,
        img: cls.img,
        levels: cls.system.levels,
        subclass: sub ? { id: sub.id, name: sub.name } : null
      });
    }

    // Background & Race items
    context.raceItem = null;
    context.backgroundItem = null;
    for (const item of actor.items) {
      if (item.type === "race") context.raceItem = { id: item.id, name: item.name, img: item.img };
      if (item.type === "background") context.backgroundItem = { id: item.id, name: item.name, img: item.img };
    }

    // Resources
    context.resources = [];
    for (const key of ["primary", "secondary", "tertiary"]) {
      const res = systemData.resources?.[key];
      if (res && (res.max > 0 || res.label)) {
        context.resources.push({
          key,
          label: res.label || key.charAt(0).toUpperCase() + key.slice(1),
          value: res.value ?? 0,
          max: res.max ?? 0,
          sr: res.sr ?? false,
          lr: res.lr ?? false
        });
      }
    }

    // Encumbrance
    const enc = systemData.attributes?.encumbrance;
    context.encumbrance = {
      value: Math.round((enc?.value ?? 0) * 10) / 10,
      max: enc?.max ?? 0,
      pct: enc?.max > 0 ? Math.clamp(Math.round(((enc?.value ?? 0) / enc.max) * 100), 0, 100) : 0,
      encumbered: enc?.encumbered ?? false
    };

    // Proficiencies
    context.proficiencies = this._prepareProficiencies(systemData);

    // Paper Doll equipment slots
    context.paperDoll = this._preparePaperDoll(actor);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare hit dice data for display.
   */
  _prepareHitDice(actor) {
    const hitDice = [];
    for (const cls of Object.values(actor.classes ?? {})) {
      const hd = cls.system.hd;
      const denom = hd?.denomination ?? cls.system.hitDice ?? "d?";
      hitDice.push({
        name: cls.name,
        die: String(denom).startsWith("d") ? denom : `d${denom}`,
        value: hd?.value ?? (cls.system.levels - (cls.system.hitDiceUsed ?? 0)),
        max: hd?.max ?? cls.system.levels
      });
    }
    return hitDice;
  }

  /* -------------------------------------------- */

  /**
   * Prepare skills for display, sorted alphabetically.
   */
  _prepareSkills(systemData) {
    const skills = [];
    for (const [key, skill] of Object.entries(systemData.skills)) {
      const config = CONFIG.DND5E.skills[key];
      if (!config) continue;
      skills.push({
        key,
        label: config.label ?? key,
        ability: config.ability ?? skill.ability,
        abilityAbbr: CONFIG.DND5E.abilities[skill.ability]?.abbreviation ?? skill.ability,
        total: skill.total ?? 0,
        totalStr: (skill.total >= 0 ? "+" : "") + (skill.total ?? 0),
        passive: skill.passive ?? 10,
        proficient: skill.proficient ?? 0,
        profClass: this._proficiencyClass(skill.proficient ?? 0)
      });
    }
    return skills.sort((a, b) => a.label.localeCompare(b.label));
  }

  /* -------------------------------------------- */

  /**
   * Prepare saving throws for display.
   */
  _prepareSavingThrows(systemData) {
    const prof = systemData.attributes.prof ?? 0;
    const saves = [];
    for (const [key, ability] of Object.entries(systemData.abilities)) {
      const saveMod = ability.mod + (ability.saveProf?.flat ?? (ability.proficient ? prof : 0));
      saves.push({
        key,
        label: CONFIG.DND5E.abilities[key]?.abbreviation ?? key.toUpperCase(),
        fullLabel: CONFIG.DND5E.abilities[key]?.label ?? key,
        save: saveMod,
        saveStr: (saveMod >= 0 ? "+" : "") + saveMod,
        proficient: ability.proficient
      });
    }
    return saves;
  }

  /* -------------------------------------------- */

  /**
   * Prepare inventory items grouped by type.
   */
  _prepareInventory(actor) {
    const inventory = {
      weapons: { label: "Weapons", type: "weapon", items: [] },
      equipment: { label: "Equipment", type: "equipment", items: [] },
      consumables: { label: "Consumables", type: "consumable", items: [] },
      tools: { label: "Tools", type: "tool", items: [] },
      containers: { label: "Containers", type: "container", items: [] },
      loot: { label: "Loot", type: "loot", items: [] }
    };

    for (const item of actor.items) {
      const ctx = {
        id: item.id,
        name: item.name,
        img: item.img,
        type: item.type,
        quantity: item.system.quantity ?? 1,
        weight: item.system.weight?.value ?? item.system.weight ?? 0,
        equipped: item.system.equipped,
        identified: item.system.identified !== false,
        attunement: item.system.attunement,
        attuned: item.system.attuned,
        rarity: item.system.rarity,
        uses: item.system.uses ?? null,
        price: item.system.price?.value ?? 0,
        hasSound: !!item.getFlag(MODULE_ID, "soundTrack")
      };

      switch (item.type) {
        case "weapon": inventory.weapons.items.push(ctx); break;
        case "equipment": inventory.equipment.items.push(ctx); break;
        case "consumable": inventory.consumables.items.push(ctx); break;
        case "tool": inventory.tools.items.push(ctx); break;
        case "container":
        case "backpack": inventory.containers.items.push(ctx); break;
        case "loot": inventory.loot.items.push(ctx); break;
      }
    }
    return inventory;
  }

  /* -------------------------------------------- */

  /**
   * Prepare spells grouped by level.
   */
  _prepareSpellbook(actor) {
    const spellbook = {};
    for (const item of actor.items) {
      if (item.type !== "spell") continue;
      const level = item.system.level ?? 0;
      if (!spellbook[level]) {
        spellbook[level] = {
          level,
          label: level === 0 ? "Cantrips" : `Level ${level}`,
          spells: []
        };
      }
      const prepMode = item.system.preparation?.mode ?? "";
      spellbook[level].spells.push({
        id: item.id,
        name: item.name,
        img: item.img,
        level: item.system.level,
        school: CONFIG.DND5E.spellSchools?.[item.system.school]?.label ?? item.system.school ?? "",
        components: item.system.properties ?? new Set(),
        preparation: item.system.preparation ?? {},
        prepared: item.system.preparation?.prepared ?? false,
        alwaysPrepared: ["always", "innate", "atwill", "pact"].includes(prepMode),
        canPrepare: prepMode === "prepared" && item.system.level > 0,
        uses: item.system.uses ?? null,
        hasAction: item.system.activities?.size > 0,
        hasSound: !!item.getFlag(MODULE_ID, "soundTrack")
      });
    }
    // Sort by level and return as array
    return Object.values(spellbook).sort((a, b) => a.level - b.level);
  }

  /* -------------------------------------------- */

  /**
   * Prepare spell slots for display.
   */
  _prepareSpellSlots(systemData) {
    const slots = [];
    for (let i = 1; i <= 9; i++) {
      const key = `spell${i}`;
      const slot = systemData.spells?.[key];
      if (slot && slot.max > 0) {
        const pips = [];
        for (let p = 0; p < slot.max; p++) {
          pips.push({ filled: p < slot.value, index: p });
        }
        slots.push({
          level: i,
          key,
          value: slot.value,
          max: slot.max,
          pct: Math.round((slot.value / slot.max) * 100),
          label: `Level ${i}`,
          pips
        });
      }
    }
    // Pact slots
    const pact = systemData.spells?.pact;
    if (pact && pact.max > 0) {
      const pips = [];
      for (let p = 0; p < pact.max; p++) {
        pips.push({ filled: p < pact.value, index: p });
      }
      slots.push({
        level: "pact",
        key: "pact",
        value: pact.value,
        max: pact.max,
        pct: Math.round((pact.value / pact.max) * 100),
        label: `Pact (Lvl ${pact.level})`,
        pips
      });
    }
    return slots;
  }

  /* -------------------------------------------- */

  /**
   * Prepare features (class features, racial, feats, etc.)
   */
  _prepareFeatures(actor) {
    const features = {
      active: { label: "Active", items: [] },
      passive: { label: "Passive", items: [] },
      classes: { label: "Class Features", items: [] },
      feats: { label: "Feats", items: [] }
    };

    for (const item of actor.items) {
      if (!["feat", "class", "subclass", "background", "race"].includes(item.type)) continue;
      const ctx = {
        id: item.id,
        name: item.name,
        img: item.img,
        type: item.type,
        description: item.system.description?.value ?? "",
        uses: item.system.uses ?? null,
        hasAction: item.system.activities?.size > 0,
        hasSound: !!item.getFlag(MODULE_ID, "soundTrack")
      };

      switch (item.type) {
        case "class":
        case "subclass":
          features.classes.items.push(ctx);
          break;
        case "feat":
          if (item.system.activities?.size > 0) {
            features.active.items.push(ctx);
          } else {
            features.passive.items.push(ctx);
          }
          break;
        default:
          features.feats.items.push(ctx);
      }
    }
    return features;
  }

  /* -------------------------------------------- */

  /**
   * Prepare traits (resistances, immunities, etc.)
   */
  _prepareTraits(systemData) {
    const traits = [];
    const traitTypes = ["dr", "di", "dv", "ci"];
    const traitLabels = {
      dr: "Resistances",
      di: "Immunities",
      dv: "Vulnerabilities",
      ci: "Condition Immunities"
    };
    for (const key of traitTypes) {
      const trait = systemData.traits?.[key];
      if (!trait) continue;
      const values = [];
      if (trait.value instanceof Set) {
        for (const v of trait.value) {
          const label = CONFIG.DND5E.damageTypes?.[v]?.label
            ?? CONFIG.DND5E.conditionTypes?.[v]?.label
            ?? v;
          values.push(label);
        }
      }
      if (trait.custom) values.push(trait.custom);
      if (values.length > 0) {
        traits.push({ key, label: traitLabels[key], values: values.join(", ") });
      }
    }
    return traits;
  }

  /* -------------------------------------------- */

  /**
   * Prepare active effects.
   */
  _prepareEffects(actor) {
    const effects = [];
    for (const effect of actor.effects) {
      effects.push({
        id: effect.id,
        name: effect.name,
        img: effect.img,
        disabled: effect.disabled,
        duration: effect.duration,
        source: effect.origin
      });
    }
    return effects;
  }

  /* -------------------------------------------- */

  /**
   * Prepare proficiencies (languages, weapons, armor, tools).
   */
  _prepareProficiencies(systemData) {
    const profs = { languages: [], weapons: [], armor: [], tools: [] };
    const traitMap = {
      languages: { trait: "languages", config: "languages" },
      weapons: { trait: "weaponProf", config: "weaponProficiencies" },
      armor: { trait: "armorProf", config: "armorProficiencies" },
      tools: { trait: "toolProf", config: "toolProficiencies" }
    };
    for (const [key, { trait, config }] of Object.entries(traitMap)) {
      const t = systemData.traits?.[trait];
      if (!t) continue;
      if (t.value instanceof Set) {
        for (const v of t.value) {
          const cfg = CONFIG.DND5E[config]?.[v];
          profs[key].push(typeof cfg === "object" ? (cfg.label ?? v) : (cfg ?? v));
        }
      }
      if (t.custom) {
        for (const c of t.custom.split(";")) {
          const trimmed = c.trim();
          if (trimmed) profs[key].push(trimmed);
        }
      }
    }
    return profs;
  }

  /* -------------------------------------------- */

  /**
   * Prepare paper doll equipment slots.
   */
  _preparePaperDoll(actor) {
    const SLOT_DEFS = {
      head:       { label: "Head",       img: "icons/equipment/head/helm-barbute-engraved-steel.webp",    filter: ["equipment"] },
      cape:       { label: "Cape",       img: "icons/equipment/back/cape-layered-red.webp",              filter: ["equipment"] },
      body:       { label: "Body",       img: "icons/equipment/chest/breastplate-layered-steel.webp",    filter: ["equipment"] },
      gloves:     { label: "Gloves",     img: "icons/equipment/hand/glove-frayed-cloth-grey.webp",       filter: ["equipment"] },
      belt:       { label: "Belt",       img: "icons/equipment/waist/belt-buckle-leather.webp",          filter: ["equipment"] },
      boots:      { label: "Boots",      img: "icons/equipment/feet/boots-armored-layered-steel.webp",   filter: ["equipment"] },
      trinket1:   { label: "Trinket",    img: "icons/tools/laboratory/alembic-glass-ball-blue.webp",     filter: ["equipment", "loot"] },
      trinket2:   { label: "Trinket",    img: "icons/tools/laboratory/alembic-glass-ball-blue.webp",     filter: ["equipment", "loot"] },
      pendant:    { label: "Pendant",    img: "icons/equipment/neck/pendant-rough-red.webp",             filter: ["equipment"] },
      ring1:      { label: "Ring",       img: "icons/equipment/finger/ring-band-gold.webp",              filter: ["equipment"] },
      ring2:      { label: "Ring",       img: "icons/equipment/finger/ring-band-gold.webp",              filter: ["equipment"] },
      backpack:   { label: "Backpack",   img: "icons/containers/bags/pack-leather-tan.webp",             filter: ["container", "backpack", "equipment"] },
      mainHand:   { label: "Main Hand",  img: "icons/weapons/swords/shortsword-winged.webp",             filter: ["weapon"] },
      offHand:    { label: "Off Hand",   img: "icons/weapons/shields/buckler-wooden-boss-steel.webp",    filter: ["weapon", "equipment"] },
      ranged:     { label: "Ranged",     img: "icons/weapons/bows/shortbow-recurve-bone.webp",           filter: ["weapon"] },
      ammo:       { label: "Ammo",       img: "icons/weapons/ammunition/arrow-broadhead-pointed-orange.webp", filter: ["consumable", "loot"] },
    };
    const equipped = actor.getFlag("dnd-sheet-aaa", "paperDollSlots") ?? {};
    const slots = {};
    for (const [key, def] of Object.entries(SLOT_DEFS)) {
      const itemId = equipped[key];
      const item = itemId ? actor.items.get(itemId) : null;
      slots[key] = {
        key,
        label: def.label,
        defaultImg: def.img,
        img: item ? item.img : def.img,
        itemId: item ? item.id : null,
        itemName: item ? item.name : def.label,
        empty: !item,
        filter: def.filter
      };
    }
    return {
      slots,
      left: ["head", "cape", "body", "gloves", "belt", "boots"],
      right: ["trinket1", "trinket2", "pendant", "ring1", "ring2", "backpack"],
      bottom: ["mainHand", "offHand", "ranged", "ammo"]
    };
  }

  /* -------------------------------------------- */

  /**
   * Get proficiency CSS class.
   */
  _proficiencyClass(level) {
    switch (level) {
      case 0: return "prof-none";
      case 0.5: return "prof-half";
      case 1: return "prof-full";
      case 2: return "prof-double";
      default: return "prof-none";
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners                             */
  /* -------------------------------------------- */

  /** @override */
  async close(options) {
    VA.stopAmbientParticles();
    this._aaaEntered = false;
    return super.close(options);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Manual tab navigation
    html.find(".nav-item").click(ev => {
      const tab = ev.currentTarget.dataset.tab;
      if (!tab) return;
      const tabOrder = ["attributes","skills","inventory","spells","features","biography","effects"];
      const dir = tabOrder.indexOf(tab) > tabOrder.indexOf(this._activeTab ?? "") ? 1 : -1;
      // Update nav
      html.find(".nav-item").removeClass("active");
      $(ev.currentTarget).addClass("active");
      // Update content
      html.find(".aaa-panel > .tab").removeClass("active");
      const newPanel = html.find(`.aaa-panel > .tab[data-tab="${tab}"]`).addClass("active")[0];
      // Remember active tab
      this._activeTab = tab;
      VA.navItemClick(ev.currentTarget);
      VA.tabSwitch(newPanel, dir);
      VA.staggerReveal($(newPanel), ".inv-entry, .feat-entry, .spell-entry, .effect-entry, .action-entry, .feature-entry");
    });

    // Restore last active tab
    if (this._activeTab) {
      html.find(".nav-item").removeClass("active");
      html.find(`.nav-item[data-tab="${this._activeTab}"]`).addClass("active");
      html.find(".aaa-panel > .tab").removeClass("active");
      html.find(`.aaa-panel > .tab[data-tab="${this._activeTab}"]`).addClass("active");
    }

    // Inventory category filter
    html.find(".inv-filter").click(ev => {
      const filter = ev.currentTarget.dataset.filter;
      html.find(".inv-filter").removeClass("active");
      $(ev.currentTarget).addClass("active");
      if (filter === "all") {
        html.find(".inventory-category").show();
      } else {
        html.find(".inventory-category").hide();
        html.find(`.inventory-category[data-category="${filter}"]`).show();
      }
      this._activeInvFilter = filter;
    });

    // Restore inventory filter
    if (this._activeInvFilter && this._activeInvFilter !== "all") {
      html.find(".inv-filter").removeClass("active");
      html.find(`.inv-filter[data-filter="${this._activeInvFilter}"]`).addClass("active");
      html.find(".inventory-category").hide();
      html.find(`.inventory-category[data-category="${this._activeInvFilter}"]`).show();
    }

    // HP low-health pulse animation
    const hp = this.actor.system.attributes.hp;
    if (hp && hp.max > 0 && (hp.value / hp.max) <= 0.25) {
      html.find(".hp-fill").addClass("hp-low");
    }

    // Parallax effect
    html.find(".dnd-sheet")[0]?.addEventListener("mousemove", ev => {
      const rect = ev.currentTarget.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((ev.clientY - rect.top) / rect.height - 0.5) * 10;
      const bg = ev.currentTarget.querySelector(".bg");
      if (bg) bg.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
    });

    // Background media — render image or video based on file extension
    const bgDiv = html.find(".bg")[0];
    if (bgDiv) {
      const bgSrc = bgDiv.dataset.bg;
      if (bgSrc) {
        const ext = bgSrc.split(".").pop().toLowerCase();
        if (["webm", "mp4"].includes(ext)) {
          const video = document.createElement("video");
          video.className = "bg-media";
          video.src = bgSrc;
          video.autoplay = true;
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          bgDiv.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.className = "bg-media";
          img.src = bgSrc;
          bgDiv.appendChild(img);
        }
      }
    }

    // Apply panel opacity from flag
    const panelOpacity = (this.actor.getFlag("dnd-sheet-aaa", "bgOpacity") ?? 80) / 100;
    const sheet = html.find(".dnd-sheet")[0];
    if (sheet) {
      sheet.style.setProperty("--aaa-panel-opacity", panelOpacity);
    }

    // Everything below here only for owners
    if (!this.isEditable) return;

    // Background settings dialog
    html.find(".bg-picker").click(ev => {
      const currentBg = this.actor.getFlag("dnd-sheet-aaa", "bgImage") ?? "";
      const currentOp = this.actor.getFlag("dnd-sheet-aaa", "bgOpacity") ?? 80;
      const dlgContent = `
        <form class="aaa-bg-settings">
          <div style="margin-bottom:10px;">
            <label style="display:block;margin-bottom:4px;font-weight:600;color:#c8a84e;">Background Image / Video</label>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="text" name="bgPath" value="${currentBg}" style="flex:1;background:#1a1a1a;border:1px solid #444;color:#ccc;padding:4px 6px;" placeholder="Path to image or video...">
              <button type="button" class="aaa-bg-browse" style="padding:4px 10px;cursor:pointer;"><i class="fas fa-folder-open"></i></button>
            </div>
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;color:#c8a84e;">Panel Darkness: <span class="aaa-op-val">${currentOp}%</span></label>
            <input type="range" name="bgOpacity" min="10" max="100" step="5" value="${currentOp}" style="width:100%;">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#888;"><span>Transparent</span><span>Opaque</span></div>
          </div>
        </form>
      `;
      const dlg = new Dialog({
        title: "Background Settings",
        content: dlgContent,
        buttons: {
          save: {
            icon: '<i class="fas fa-check"></i>',
            label: "Save",
            callback: html => {
              const form = html.find("form")[0];
              const path = form.bgPath.value.trim();
              const opacity = parseInt(form.bgOpacity.value);
              this.actor.setFlag("dnd-sheet-aaa", "bgImage", path);
              this.actor.setFlag("dnd-sheet-aaa", "bgOpacity", opacity);
            }
          },
          clear: {
            icon: '<i class="fas fa-trash"></i>',
            label: "Clear BG",
            callback: () => {
              this.actor.setFlag("dnd-sheet-aaa", "bgImage", "");
            }
          }
        },
        default: "save",
        render: dlgHtml => {
          // Browse button opens FilePicker
          dlgHtml.find(".aaa-bg-browse").click(() => {
            const fp = new FilePicker({
              type: "imagevideo",
              current: dlgHtml.find("[name=bgPath]").val(),
              callback: path => dlgHtml.find("[name=bgPath]").val(path)
            });
            fp.browse();
          });
          // Live preview opacity
          dlgHtml.find("[name=bgOpacity]").on("input", e => {
            const val = e.target.value;
            dlgHtml.find(".aaa-op-val").text(val + "%");
            const s = this.element.find(".dnd-sheet")[0];
            if (s) s.style.setProperty("--aaa-panel-opacity", val / 100);
          });
        }
      });
      dlg.render(true);
    });

    // Ability checks — click to roll
    html.find(".stat").click(ev => {
      VA.rollButtonClick(ev.currentTarget);
      const ability = ev.currentTarget.dataset.ability;
      if (ability) this.actor.rollAbilityCheck({ ability, event: ev });
    });

    // Ability saves — right-click
    html.find(".stat").contextmenu(ev => {
      const ability = ev.currentTarget.dataset.ability;
      if (ability) this.actor.rollSavingThrow({ ability, event: ev });
    });

    // Saving throw roll — click on save row
    html.find(".save-row").click(ev => {
      VA.rollButtonClick(ev.currentTarget);
      const ability = ev.currentTarget.dataset.ability;
      if (ability) this.actor.rollSavingThrow({ ability, event: ev });
    });

    // Skill roll
    html.find(".skill-row").click(ev => {
      VA.rollButtonClick(ev.currentTarget);
      const skill = ev.currentTarget.dataset.skill;
      if (skill) this.actor.rollSkill({ skill, event: ev });
    });

    // Item roll / use
    html.find(".item-roll").click(ev => {
      VA.rollButtonClick(ev.currentTarget);
      const itemId = ev.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.use();
    });

    // Item edit
    html.find(".item-edit").click(ev => {
      const itemId = ev.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // Item delete
    html.find(".item-delete").click(ev => {
      const itemId = ev.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) {
        Dialog.confirm({
          title: `Delete ${item.name}?`,
          content: `<p>Are you sure you want to delete <strong>${item.name}</strong>?</p>`,
          yes: () => item.delete()
        });
      }
    });

    // Item sound config
    html.find(".item-sound-config").click(ev => {
      ev.stopPropagation();
      const itemId = ev.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) new AAASoundConfig(item).render(true);
    });

    // Spell use
    html.find(".spell-use").click(ev => {
      const itemId = ev.currentTarget.closest(".spell-entry")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.use();
    });

    // Toggle equipped
    html.find(".item-equip").click(ev => {
      const itemId = ev.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.update({ "system.equipped": !item.system.equipped });
    });

    // Toggle inspiration
    html.find(".inspiration-toggle").click(ev => {
      this.actor.update({ "system.attributes.inspiration": !this.actor.system.attributes.inspiration });
    });

    // Death save rolls
    html.find(".death-save-roll").click(ev => {
      this.actor.rollDeathSave();
    });

    // Hit dice roll
    html.find(".hit-die-roll").click(async ev => {
      await this.actor.rollHitDie({});
    });

    // Short rest
    html.find(".rest-short").click(ev => {
      this.actor.shortRest();
    });

    // Long rest
    html.find(".rest-long").click(ev => {
      this.actor.longRest();
    });

    // Initiative roll
    html.find(".initiative-roll").click(ev => {
      this.actor.rollInitiativeDialog({ event: ev });
    });

    // Inline editing of HP
    html.find(".hp-input").change(ev => {
      const value = parseInt(ev.target.value);
      if (!isNaN(value)) {
        const hp = this.actor.system.attributes.hp;
        const delta = value - (hp.value ?? 0);
        const newPct = hp.max > 0 ? (value / hp.max) * 100 : 0;
        VA.hpChange(html, newPct, delta);
        this.actor.update({ "system.attributes.hp.value": value });
      }
    });

    // Inline editing of HP temp
    html.find(".hp-temp-input").change(ev => {
      const value = parseInt(ev.target.value) || 0;
      this.actor.update({ "system.attributes.hp.temp": value });
    });

    // Ability score editing
    html.find(".ability-input").change(ev => {
      const ability = ev.currentTarget.dataset.ability;
      const value = parseInt(ev.target.value);
      if (!isNaN(value) && ability) {
        this.actor.update({ [`system.abilities.${ability}.value`]: value });
      }
    });

    // Spell slot management
    html.find(".slot-pip").click(ev => {
      const level = ev.currentTarget.dataset.level;
      const key = level === "pact" ? "pact" : `spell${level}`;
      const current = this.actor.system.spells[key]?.value ?? 0;
      if (current > 0) {
        this.actor.update({ [`system.spells.${key}.value`]: current - 1 });
      }
    });

    html.find(".slot-pip").contextmenu(ev => {
      ev.preventDefault();
      const level = ev.currentTarget.dataset.level;
      const key = level === "pact" ? "pact" : `spell${level}`;
      const current = this.actor.system.spells[key]?.value ?? 0;
      const max = this.actor.system.spells[key]?.max ?? 0;
      if (current < max) {
        this.actor.update({ [`system.spells.${key}.value`]: current + 1 });
      }
    });

    // Toggle proficiency on skills
    html.find(".skill-prof").click(ev => {
      if (!this.isEditable) return;
      const skill = ev.currentTarget.closest(".skill-row")?.dataset.skill;
      if (!skill) return;
      const current = this.actor.system.skills[skill]?.proficient ?? 0;
      const next = current >= 2 ? 0 : current + 1;
      this.actor.update({ [`system.skills.${skill}.value`]: next });
    });

    // Effect toggle
    html.find(".effect-toggle").click(ev => {
      const effectId = ev.currentTarget.closest(".effect-entry")?.dataset.effectId;
      const effect = this.actor.effects.get(effectId);
      if (effect) effect.update({ disabled: !effect.disabled });
    });

    // Effect create
    html.find(".effect-create").click(ev => {
      ActiveEffect.create({ name: "New Effect", img: "icons/svg/aura.svg" }, { parent: this.actor });
    });

    // Effect delete
    html.find(".effect-delete").click(ev => {
      const effectId = ev.currentTarget.closest(".effect-entry")?.dataset.effectId;
      const effect = this.actor.effects.get(effectId);
      if (effect) {
        Dialog.confirm({
          title: `Delete ${effect.name}?`,
          content: `<p>Delete <strong>${effect.name}</strong>?</p>`,
          yes: () => effect.delete()
        });
      }
    });

    // Effect edit
    html.find(".effect-edit").click(ev => {
      const effectId = ev.currentTarget.closest(".effect-entry")?.dataset.effectId;
      const effect = this.actor.effects.get(effectId);
      if (effect) effect.sheet.render(true);
    });

    // Class item edit
    html.find(".class-edit").click(ev => {
      const itemId = ev.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // Class level up
    html.find(".class-level-up").click(ev => {
      const itemId = ev.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item && item.type === "class") {
        VA.levelUpBurst(html);
        item.update({ "system.levels": item.system.levels + 1 });
      }
    });

    // Create new item
    html.find(".item-create").click(ev => {
      const type = ev.currentTarget.dataset.type;
      if (!type) return;
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      const itemData = { name: `New ${typeName}`, type: type };
      this.actor.createEmbeddedDocuments("Item", [itemData]);
    });

    // Spell preparation toggle
    html.find(".spell-prep-toggle").click(ev => {
      ev.stopPropagation();
      const itemId = ev.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.update({ "system.preparation.prepared": !item.system.preparation?.prepared });
    });

    // Spell filter
    html.find(".spell-filter").click(ev => {
      const filter = ev.currentTarget.dataset.filter;
      html.find(".spell-filter").removeClass("active");
      $(ev.currentTarget).addClass("active");
      if (filter === "all") {
        html.find(".spell-level-group").show();
      } else {
        html.find(".spell-level-group").hide();
        html.find(`.spell-level-group[data-level="${filter}"]`).show();
      }
      this._activeSpellFilter = filter;
    });

    // Restore spell filter
    if (this._activeSpellFilter && this._activeSpellFilter !== "all") {
      html.find(".spell-filter").removeClass("active");
      html.find(`.spell-filter[data-filter="${this._activeSpellFilter}"]`).addClass("active");
      html.find(".spell-level-group").hide();
      html.find(`.spell-level-group[data-level="${this._activeSpellFilter}"]`).show();
    }

    // Feature filter
    html.find(".feat-filter").click(ev => {
      const filter = ev.currentTarget.dataset.filter;
      html.find(".feat-filter").removeClass("active");
      $(ev.currentTarget).addClass("active");
      if (filter === "all") {
        html.find(".feature-category").show();
      } else {
        html.find(".feature-category").hide();
        html.find(`.feature-category[data-category="${filter}"]`).show();
      }
      this._activeFeatFilter = filter;
    });

    // Restore feature filter
    if (this._activeFeatFilter && this._activeFeatFilter !== "all") {
      html.find(".feat-filter").removeClass("active");
      html.find(`.feat-filter[data-filter="${this._activeFeatFilter}"]`).addClass("active");
      html.find(".feature-category").hide();
      html.find(`.feature-category[data-category="${this._activeFeatFilter}"]`).show();
    }

    // Resource value editing
    html.find(".resource-input").change(ev => {
      const key = ev.currentTarget.dataset.resource;
      const value = parseInt(ev.target.value) || 0;
      if (key) this.actor.update({ [`system.resources.${key}.value`]: value });
    });

    // XP editing
    html.find(".xp-input").change(ev => {
      const value = parseInt(ev.target.value) || 0;
      this.actor.update({ "system.details.xp.value": value });
    });

    // Saving throw proficiency toggle
    html.find(".save-prof").click(ev => {
      ev.stopPropagation();
      if (!this.isEditable) return;
      const ability = ev.currentTarget.closest(".save-row")?.dataset.ability;
      if (ability) {
        const current = this.actor.system.abilities[ability]?.proficient ?? 0;
        this.actor.update({ [`system.abilities.${ability}.proficient`]: current ? 0 : 1 });
      }
    });

    // Portrait click to change image
    html.find(".portrait").click(ev => {
      if (!this.isEditable) return;
      // Don't open picker if paper doll is visible
      if (html.find(".paperdoll-overlay.active").length) return;
      const fp = new FilePicker({
        type: "image",
        current: this.actor.img,
        callback: path => this.actor.update({ img: path })
      });
      fp.browse();
    });

    // Paper Doll toggle — persist state across re-renders
    html.find(".paperdoll-toggle").click(ev => {
      ev.stopPropagation();
      this._paperDollOpen = !this._paperDollOpen;
      html.find(".paperdoll-overlay").toggleClass("active", this._paperDollOpen);
    });

    // Restore paper doll open state after re-render
    if (this._paperDollOpen) {
      html.find(".paperdoll-overlay").addClass("active");
    }

    // Paper Doll slot click — open item sheet or show equip picker
    html.find(".pd-slot").click(ev => {
      ev.stopPropagation();
      if (!this.isEditable) return;
      const slotKey = ev.currentTarget.dataset.slot;
      const itemId = ev.currentTarget.dataset.itemId;
      if (itemId) {
        // Open item sheet
        const item = this.actor.items.get(itemId);
        if (item) item.sheet.render(true);
      } else {
        // Show equippable items for this slot
        this._showPaperDollPicker(slotKey, ev.currentTarget);
      }
    });

    // Paper Doll slot right-click — unequip individual slot
    html.find(".pd-slot").contextmenu(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!this.isEditable) return;
      const slotKey = ev.currentTarget.dataset.slot;
      const itemId = ev.currentTarget.dataset.itemId;
      if (itemId) {
        const slots = foundry.utils.deepClone(this.actor.getFlag("dnd-sheet-aaa", "paperDollSlots") ?? {});
        delete slots[slotKey];
        // Unset via -=key then overwrite to ensure Foundry actually removes the key
        await this.actor.unsetFlag("dnd-sheet-aaa", "paperDollSlots");
        await this.actor.setFlag("dnd-sheet-aaa", "paperDollSlots", slots);
        const item = this.actor.items.get(itemId);
        if (item?.system?.equipped !== undefined) await item.update({ "system.equipped": false });
      }
    });

    // Paper Doll drop handler on slots
    html.find(".pd-slot").each((i, el) => {
      el.addEventListener("dragover", ev => { ev.preventDefault(); el.classList.add("pd-drag-over"); });
      el.addEventListener("dragleave", ev => { el.classList.remove("pd-drag-over"); });
      el.addEventListener("drop", async ev => {
        ev.preventDefault();
        el.classList.remove("pd-drag-over");
        if (!this.isEditable) return;
        try {
          const data = JSON.parse(ev.dataTransfer.getData("text/plain"));
          if (data.type !== "Item") return;
          const item = this.actor.items.get(data.uuid?.split(".").pop()) || await Item.implementation.fromDropData(data);
          if (!item || item.parent !== this.actor) return;
          const slotKey = el.dataset.slot;
          const slots = this.actor.getFlag("dnd-sheet-aaa", "paperDollSlots") ?? {};
          slots[slotKey] = item.id;
          await this.actor.setFlag("dnd-sheet-aaa", "paperDollSlots", slots);
          if (item.system?.equipped !== undefined) await item.update({ "system.equipped": true });
        } catch(e) { /* ignore bad data */ }
      });
    });

    // Unequip All button
    html.find(".pd-unequip-all").click(async ev => {
      ev.stopPropagation();
      if (!this.isEditable) return;
      const slots = this.actor.getFlag("dnd-sheet-aaa", "paperDollSlots") ?? {};
      const ids = Object.values(slots).filter(Boolean);
      await this.actor.unsetFlag("dnd-sheet-aaa", "paperDollSlots");
      for (const id of ids) {
        const item = this.actor.items.get(id);
        if (item?.system?.equipped !== undefined) await item.update({ "system.equipped": false });
      }
    });

    // Sheet entrance animation — once per open, particles on every re-render
    if (!this._aaaEntered) {
      VA.sheetEnter(html);
      this._aaaEntered = true;
    } else {
      VA._startAmbientParticles(html);
    }
  }

  /**
   * Show a picker dialog for equipping items to a paper doll slot.
   */
  _showPaperDollPicker(slotKey, element) {
    const dollData = this._preparePaperDoll(this.actor);
    const slotDef = dollData.slots[slotKey];
    if (!slotDef) return;
    const items = this.actor.items.filter(i => slotDef.filter.includes(i.type));
    if (!items.length) return ui.notifications.info("No items available for this slot.");
    const listHtml = items.map(i =>
      `<div class="pd-pick-item" data-id="${i.id}" title="${i.name}"><img src="${i.img}"><span>${i.name}</span></div>`
    ).join("");
    const dlg = new Dialog({
      title: `Equip — ${slotDef.label}`,
      content: `<div class="pd-pick-list">${listHtml}</div>`,
      buttons: { cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" } },
      default: "cancel",
      render: dlgHtml => {
        dlgHtml.find(".pd-pick-item").click(async ev => {
          const id = ev.currentTarget.dataset.id;
          const slots = this.actor.getFlag("dnd-sheet-aaa", "paperDollSlots") ?? {};
          slots[slotKey] = id;
          await this.actor.setFlag("dnd-sheet-aaa", "paperDollSlots", slots);
          const item = this.actor.items.get(id);
          if (item?.system?.equipped !== undefined) await item.update({ "system.equipped": true });
          dlg.close();
        });
      }
    });
    dlg.render(true);
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                */
  /* -------------------------------------------- */

  /** @override */
  _canDragStart(selector) {
    return this.isEditable;
  }

  /** @override */
  _canDragDrop(selector) {
    return this.isEditable;
  }

  /** @override */
  _onDragStart(event) {
    const li = event.currentTarget.closest("[data-item-id]");
    if (!li?.dataset.itemId) return;
    const item = this.actor.items.get(li.dataset.itemId);
    if (!item) return;
    const dragData = item.toDragData();
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /** @override */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const actor = this.actor;

    switch (data.type) {
      case "Item":
        return this._onDropItem(event, data);
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Actor":
        return false;
    }
  }

  /** @override */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);

    // If it's the same actor, just sort
    if (this.actor.uuid === item.parent?.uuid) {
      return this._onSortItem(event, item.toObject());
    }

    // Otherwise, create the item on this actor
    return this._onDropItemCreate(item.toObject(), event);
  }

  async _onDropItemCreate(itemData, event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    return this.actor.createEmbeddedDocuments("Item", itemData);
  }
}

/* ============================================== */
/*  Module Registration                           */
/* ============================================== */

Hooks.once("init", () => {
  console.log("AAA Sheet | Initializing AAA D&D Character Sheet");

  Actors.registerSheet("dnd5e", AAACharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "AAA RPG Character Sheet"
  });
});

Hooks.once("ready", () => {
  console.log("AAA Sheet | Ready");

  // Apply dark UI class to body for chat/journal/dialog styling
  document.body.classList.add("aaa-dark-ui");
});

/* ============================================== */
/*  Sound System — Chat Hooks                     */
/* ============================================== */

// Primary hook: fires once when the message is created (no HTML needed)
// dnd5e 5.x always has flags.dnd5e.item.uuid on activity-based messages
Hooks.on("createChatMessage", async (message, options, userId) => {
  try {
    await _aaaProcessChatSound(message);
  } catch (e) {
    console.warn("AAA Sheet | createChatMessage sound error:", e);
  }
  try {
    await _aaaProcessChatImage(message);
  } catch (e) {
    console.warn("AAA Sheet | createChatMessage image error:", e);
  }
});

// Fallback hook: for legacy chat cards that use data-item-id in HTML
Hooks.on("renderChatMessage", async (message, html, data) => {
  try {
    if (!_aaaIsFirstGM()) return;
    if (message.getFlag(MODULE_ID, "soundPlayed")) return;

    let item = null;
    const actor = _aaaResolveActor(message.speaker);

    // Method 1: dnd5e 5.x flags (highest priority, works for all message types)
    const dnd5eFlags = message.flags?.dnd5e;
    if (dnd5eFlags?.item) {
      const uuid = dnd5eFlags.item.uuid;
      const id = dnd5eFlags.item.id;
      if (uuid) {
        try { item = await fromUuid(uuid); } catch (e) { /* ignore */ }
      }
      if (!item && id && actor) item = actor.items.get(id);
    }

    // Method 2: dnd5e message helper
    if (!item && typeof message.getAssociatedItem === "function") {
      try { item = await message.getAssociatedItem(); } catch (e) { /* ignore */ }
    }

    // Method 3: HTML [data-item-id] (legacy dnd5e / Maestro style)
    if (!item) {
      const el = (html instanceof HTMLElement) ? html
        : (html?.[0] instanceof HTMLElement) ? html[0]
        : (typeof html?.get === "function") ? html.get(0)
        : null;
      if (el) {
        let itemEl = el.querySelector?.("[data-item-id]");
        if (!itemEl && el.matches?.("[data-item-id]")) itemEl = el;
        if (itemEl) {
          const itemId = itemEl.dataset?.itemId ?? itemEl.getAttribute?.("data-item-id");
          if (itemId && actor) item = actor.items.get(itemId);
          if (!item && itemId) item = game.items?.get(itemId);
        }
      }
    }

    if (!item) return;

    const playlistId = item.getFlag(MODULE_ID, "soundPlaylist");
    const trackId = item.getFlag(MODULE_ID, "soundTrack");
    if (!playlistId || !trackId) return;

    const volume = item.getFlag(MODULE_ID, "soundVolume") ?? 0.8;
    await _aaaPlayItemSound(playlistId, trackId, volume);
    await message.setFlag(MODULE_ID, "soundPlayed", true);
  } catch (e) {
    console.warn("AAA Sheet | renderChatMessage sound error:", e);
  }
});
