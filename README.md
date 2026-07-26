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
