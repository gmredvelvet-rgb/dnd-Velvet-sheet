# AAA D&D Character Sheet

**A custom, animated character sheet for D&D 5e on Foundry VTT.** RPG-style presentation with parallax portrait effects, animated transitions and a game-like feel — built on top of the system's own data, so your characters stay exactly as D&D 5e understands them.

[![Foundry v13](https://img.shields.io/badge/Foundry-v13-informational)](https://foundryvtt.com/)
[![System: dnd5e](https://img.shields.io/badge/system-dnd5e-red)](https://github.com/foundryvtt/dnd5e)
[![License: Proprietary](https://img.shields.io/badge/license-Proprietary%20(Patreon)-red)](#licensing)

> ⚠️ **Installation note:** the module folder must be named `dnd-velvet-sheets` — Foundry requires the folder name to match the module id. Installing from the manifest URL handles this automatically.

---

## Requirements

| Requirement | Detail |
|---|---|
| Foundry VTT | **v12** minimum, **v13** verified. |
| Game system | **D&D 5e** (`dnd5e`). |
| Subscription | Optional [GM RedVelvet Patreon](https://www.patreon.com/gmredvelvet) support. The soft gate keeps all functions available; see [Licensing](#licensing-and-soft-gate). |
| Internet | Needed for Patreon authentication and renewal. Connection failures never lock the sheet. |

One subscription unlocks all the modules:

- [VN Dialogues Enhanced](https://github.com/gmredvelvet-rgb/vnd-enhanced)
- [Velvet PF2e Sheet](https://github.com/gmredvelvet-rgb/pf2e-velvet-sheet)
- AAA D&D Sheet ← this module
- [Velvet Mobile](https://github.com/gmredvelvet-rgb/velvet-mobile)

## Installation

1. In Foundry, open **Add-on Modules → Install Module**.
2. Paste the **manifest URL** into the *Manifest URL* field:
   ```
   https://github.com/gmredvelvet-rgb/dnd-Velvet-sheet/releases/latest/download/module.json
   ```
3. Click **Install**, then enable **AAA D&D Character Sheet** in your world's *Manage Modules*.
4. Open a character, then **Sheet Configuration → This Sheet → AAA D&D Character Sheet**.

The sheet is registered alongside the system's own — it never replaces it by default, so switching back is always one setting away.

## Features

- **Character progression:** “Level up” uses D&D's native advancement manager, including multiclass selection. Per-class arrows use the same manager. Cancelling the assistant does not write a level in advance.
- **Plutonium:** a dedicated button opens its public Classes & Subclasses importer for the current actor. Select sources, class/subclass and target levels there. Requires an active Plutonium module and its configured minimum import role. This is the importer workflow; Plutonium's original sheet Level Up manager is not publicly exported in 2.19.5.v14.
- **Premium presentation:** obsidian, aged gold and blue light, engraved metal panels, original vector crests and an astral portrait frame. Combat cards, inset vitality/experience bars, inventory rarity frames and the Info popup share one finish. Portraits remain contained and keyboard focus stays visible.
- **Saving throws:** each ability has its saving-throw modifier and roll button directly below it. The proficiency diamond remains a separate editable control. These pairs stay together when the grid wraps to three columns; Vitality and subsequent sections follow the complete grid.
- **Info:** always-visible description buttons on features, spells, items and class entries. Adapted from Velvet's TaleSpire sheet, the popup enriches full descriptions with native rule links/rolls, respects observer access and unidentified descriptions, restores focus on close, and offers an explicit full-sheet button. Reading Info never uses or casts the item.
- **Dynamic motion:** staggered entrances, a slow portrait halo/orbit, seven fixed light motes, pointer lighting and restrained control feedback. HP changes produce distinct damage/healing lights; confirmed level increases produce a gold cue. A localized vitality indicator distinguishes stable, wounded, critical and zero HP.
- Each window owns and cleans up its motion. Effects pause off-screen or in hidden tabs, respect live reduced-motion changes, and also work on read-only sheets. Fast tab navigation caps row animation at 24 visible rows and clears temporary transforms after transitions.
- Dropped classes, species and backgrounds with advancement now open their system choices; repeat class drops increase the existing class through the advancement manager.

After installing these changes, restart Foundry and refresh connected clients so the added stylesheet loads. Existing characters require no migration. Validation: `node --test tests/*.test.mjs`. Browser fixtures cover 560, 640, 820 and 1080 pixel window widths; a live campaign check is still needed for the complete Plutonium source-selection/import flow.

Motion validation additionally covers concurrent sheets, repeated renders, cleanup, rapid tab switches, live reduced-motion changes, visibility pause/resume and HP/level feedback in Chromium fixtures. These are browser checks with sample characters, not a live Foundry campaign test.

Info validation covers description rendering, private/unidentified text, keyboard opening/closing, global link/roll handlers, permission changes, delayed responses, repeated renders and narrow windows. These browser checks use sample items; verify descriptions from your campaign in Foundry after refreshing clients.

The enhanced finish uses three local SVG assets (crest, astral engraving and static grain), with no additional libraries or animation timers. Layout checks cover all tabs at 560/640/820/1080/1440 pixel widths, short windows, long character names and reduced motion. The sidebar scrolls when necessary to keep its final action reachable.

- **A character sheet that looks like a game**, not a form: animated UI driven by GSAP and Anime.js, with a parallax portrait and a cohesive dark aesthetic.
- **Full tab set** — Attributes, Skills, Features, Inventory, Spells, Effects and Biography.
- **Per-actor sound configuration**, so a character can carry its own audio.
- **Built on the system's own data.** Nothing is stored in a private format and nothing is migrated. Your actors remain ordinary D&D 5e actors, readable by every other module and by the system's default sheet.

## Licensing and soft gate

Support development through an active, qualifying [GM RedVelvet Patreon](https://www.patreon.com/gmredvelvet) subscription. This module uses a **soft gate**: all sheet features remain available without a subscription. An expired subscription or temporary authentication failure never locks a character or stops play.

**Velvet License Hub** handles one Patreon connection for compatible modules. Only the GM connects; players do not need Patreon accounts. Unlicensed worlds receive the Hub's trial reminder. If the Hub is unavailable, the sheet's existing fallback shows a dismissible, auto-hiding reminder to the GM.

## FAQ

**Do players need their own subscription?**
No. Only the GM connects Patreon through the Hub.

**What happens when a subscription expires?**
The trial reminder can return. The sheet and your characters remain usable.

**Does an internet outage lock the sheet?**
No. Internet access is needed to connect or refresh Patreon authorization; a failed check never blocks sheet functions.

**The sheet did not appear in Sheet Configuration.**
Check that the correct game system, this module and Velvet License Hub are installed and enabled, and refresh connected clients.

## Author

**GM RedVelvet** · [Patreon](https://www.patreon.com/gmredvelvet) · Discord: `gmredvelvet`


Personal appearance: the palette button in the sheet header opens a live HSV/RGB/HEX picker for background and accent colors, eight local font choices for titles and body text, four ornament styles, and automatic or manual class emblems. Preferences are stored in the current User flags per character; Actor data and other users' preferences are unaffected. Cancel/Escape discards the preview; Reset is a preview until saved. The emblem follows the highest-level D&D class or the PF2e class slug. Paladin/Champion and Artificer/Inventor share insignia. The collection contains 31 original class SVGs and the default crystal, including the 29 PF2e classes represented by this installation.

Portrait class backdrops: 31 original SVG line-art scenes follow the main class independently of the emblem. The personal Appearance panel can override the backdrop or remove it; previous preferences automatically use the class scene. Examples include a tree and woodland animals for Druid, a grimoire and sky chart for Wizard, a robed goddess of the oath for Paladin/Champion, a roaring wolf and axes for Barbarian, and a blade with shield for Fighter. Colors follow the selected accent, while Royal/Runic frames and the Minimal option retain their behavior.

Interface language policy: all module-owned interface text is English, including navigation, appearance, class art labels, tooltips, Info dialogs and progression messages. Both supported language catalogs intentionally contain the same English text so the module remains English when Foundry uses Spanish.

Biography editing uses Foundry's native rich-text editor and document form. Use the editor Save control to save rich text. Appearance is personal to each User and character: the GM does not automatically see a player's chosen colors.

The Prepared spell filter combines with spell level and name search. It includes cantrips, prepared spells and always-available magic; preparation changes use the installed system schema (including D&D 5.1+/6 numeric preparation states).
