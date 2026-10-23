## D&D Velvet Sheet v1.5.1

- Restored document form persistence and native rich-text biography editing.
- Improved Info cards with complete item/spell metadata, keyboard-accessible image inspection and a native Cast/Use action when permitted.
- Clarified personal colors: appearance is saved separately for each user and character.
- Updated licensing documentation to match the existing soft gate. Authentication failures or expired subscriptions never block sheet functions.
- Added a **Prepared** spell filter that combines with level and name search, preserves cantrips/always-available spells, and supports modern D&D numeric preparation states.

### Update

Update the module in Foundry, restart Foundry, and refresh connected clients. No character migration is needed. Use the rich-text editor Save control to save biography text.

### Validation

Automated tests and browser fixtures cover descriptions, permissions, keyboard interactions, persistence targets and combined spell filters. Existing advancement, motion and appearance tests passed. Full live campaign validation remains pending.
