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
| Subscription | An **active, qualifying Patreon** subscription to [GM RedVelvet](https://www.patreon.com/gmredvelvet), for as long as you use the module — see [Licensing](#licensing). Only the **GM** authorises; players never see a prompt. |
| Internet | Required while playing. The licence is verified periodically against a licence server. |

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

## Licensing

AAA D&D Character Sheet requires an active, qualifying **Patreon** subscription to [GM RedVelvet](https://www.patreon.com/gmredvelvet).

**Only the GM authorises.** On their first load the GM is prompted to connect their Patreon account, which unlocks the module for everyone in the world. Players never see a prompt and never need an account of their own. If popups are blocked — common on phones — use the **auth-code** flow instead: connect on any device, copy the code, and paste it in.

### What happens if the subscription lapses

**Please read this before subscribing.** This is a subscription, not a one-off purchase, and the module re-checks it periodically against a licence server. Plainly:

- **If the subscription lapses, the sheet locks.** It is covered by an activation panel and cannot be used until the subscription is active again.
- **Your characters are not locked.** The sheet is registered alongside the system's default one, never in place of it, so you can switch any actor back through *Sheet Configuration* and keep playing immediately.
- **Nothing is altered or lost.** Foundry, your world, your actors, your items and your settings are untouched — your characters remain ordinary D&D 5e actors, readable by every other module. No data is withheld and no content becomes unopenable. Resubscribing turns the sheet straight back on.
- **An internet connection is required while playing.** Verification is periodic, so a client that cannot reach the licence server locks the sheet until it can. Fully offline or air-gapped games are not supported.

If a perpetual licence is what you need, this is not that today. I would rather say so here than have anyone find out mid-campaign.

## FAQ

**Do my players need their own subscription?**
No. Only the GM authorises, and that unlocks the world for everyone connected.

**If I stop subscribing, do I lose my characters?**
No. Your actors are ordinary D&D 5e actors and are never modified. Only the sheet locks — switch back to the default sheet in *Sheet Configuration* and everything is there.

**Can I use it offline?**
No. The licence is verified periodically over the internet, and a client that cannot reach the licence server locks the sheet until it can.

**The sheet didn't appear in Sheet Configuration.**
Confirm the module is enabled in *Manage Modules*, that the folder is named `dnd-velvet-sheets`, and that the GM has authorised the licence.

## Author

**GM RedVelvet** · [Patreon](https://www.patreon.com/gmredvelvet) · Discord: `gmredvelvet`


Personal appearance: the palette button in the sheet header opens a live HSV/RGB/HEX picker for background and accent colors, eight local font choices for titles and body text, four ornament styles, and automatic or manual class emblems. Preferences are stored in the current User flags per character; Actor data and other users' preferences are unaffected. Cancel/Escape discards the preview; Reset is a preview until saved. The emblem follows the highest-level D&D class or the PF2e class slug. Paladin/Champion and Artificer/Inventor share insignia. The collection contains 31 original class SVGs and the default crystal, including the 29 PF2e classes represented by this installation.

Portrait class backdrops: 31 original SVG line-art scenes follow the main class independently of the emblem. The personal Appearance panel can override the backdrop or remove it; previous preferences automatically use the class scene. Examples include a tree and woodland animals for Druid, a grimoire and sky chart for Wizard, a robed goddess of the oath for Paladin/Champion, a roaring wolf and axes for Barbarian, and a blade with shield for Fighter. Colors follow the selected accent, while Royal/Runic frames and the Minimal option retain their behavior.

Interface language policy: all module-owned interface text is English, including navigation, appearance, class art labels, tooltips, Info dialogs and progression messages. Both supported language catalogs intentionally contain the same English text so the module remains English when Foundry uses Spanish.
