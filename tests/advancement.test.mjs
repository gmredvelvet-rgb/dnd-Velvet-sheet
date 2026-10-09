import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { advanceClass, openPlutoniumProgression, progressionAccess, renderAdvancement } from "../scripts/aaa-advancement.mjs";

let actor, updates, managerCalls, importerCalls, manager, plutonium, disabled;
class ApplicationV2 {}
beforeEach(() => {
  updates = []; managerCalls = []; importerCalls = []; disabled = false;
  const fighter = { id: "fighter", type: "class", system: { levels: 3 }, update: async data => updates.push(data) };
  actor = { isOwner: true, system: { details: { level: 5 } }, items: new Map([[fighter.id, fighter]]) };
  manager = { steps: [{}], render: options => { managerCalls.push({ render: options }); return manager; } };
  plutonium = { active: true, api: { importer: { pOpen: async options => importerCalls.push(options) }, config: { getValue: () => 2 } } };
  globalThis.CONFIG = { DND5E: { maxLevel: 20 } };
  globalThis.foundry = { applications: { api: { ApplicationV2 } } };
  globalThis.game = {
    i18n: { localize: key => key }, user: { role: 2 }, modules: new Map([["plutonium", plutonium]]),
    settings: { get: () => disabled },
    dnd5e: { applications: { advancement: { AdvancementManager: {
      forLevelChange: (...args) => { managerCalls.push(args); return manager; }
    } } } }
  };
});

test("multiclass progression passes a one-level delta to the system", async () => {
  await advanceClass(actor, "fighter", true);
  assert.deepEqual(managerCalls[0], [actor, "fighter", 1]);
  assert.deepEqual(managerCalls[1], { render: true });
  assert.equal(updates.length, 0);
});
test("opening and cancelling advancement does not pre-write the class level", async () => {
  await advanceClass(actor, "fighter", true);
  assert.equal(actor.items.get("fighter").system.levels, 3);
  assert.equal(updates.length, 0);
});
test("V2 advancement receives the object render signature", () => {
  const app = new ApplicationV2();
  app.render = options => options;
  assert.deepEqual(renderAdvancement(app), { force: true });
});
test("classes without steps follow the official direct-update fallback", async () => {
  manager.steps = [];
  await advanceClass(actor, "fighter", true);
  assert.deepEqual(updates, [{ "system.levels": 4 }]);
});
test("GM-disabled advancements follow the system setting", async () => {
  disabled = true;
  await advanceClass(actor, "fighter", true);
  assert.equal(managerCalls.length, 0);
  assert.deepEqual(updates, [{ "system.levels": 4 }]);
});
test("read-only and non-owner sheets cannot change levels or open the importer", async () => {
  await advanceClass(actor, "fighter", false);
  await openPlutoniumProgression(actor, false);
  actor.isOwner = false;
  await advanceClass(actor, "fighter", true);
  await openPlutoniumProgression(actor, true);
  assert.equal(managerCalls.length + updates.length + importerCalls.length, 0);
});
test("maximum total level blocks all class progression", async () => {
  actor.system.details.level = 20;
  assert.equal(progressionAccess(actor, true).canAdvance, false);
  await advanceClass(actor, "fighter", true);
  assert.equal(managerCalls.length + updates.length, 0);
});
test("missing classes and non-class items never advance", async () => {
  await advanceClass(actor, "missing", true);
  actor.items.get("fighter").type = "feat";
  await advanceClass(actor, "fighter", true);
  assert.equal(managerCalls.length + updates.length, 0);
});
test("a missing manager reports an error without silently skipping choices", async () => {
  delete game.dnd5e.applications.advancement.AdvancementManager;
  await assert.rejects(advanceClass(actor, "fighter", true), /Unavailable/);
  assert.equal(updates.length, 0);
});
test("Plutonium opens the public class importer bound to this actor", async () => {
  await openPlutoniumProgression(actor, true);
  assert.deepEqual(importerCalls, [{ actor, modeId: "classes-subclasses" }]);
  assert.equal(updates.length, 0);
});
test("Plutonium minimum role and inactive module are respected", async () => {
  game.user.role = 1;
  await openPlutoniumProgression(actor, true);
  game.user.role = 4;
  plutonium.active = false;
  await openPlutoniumProgression(actor, true);
  assert.equal(importerCalls.length, 0);
  assert.equal(progressionAccess(actor, true).canAdvance, true);
});
test("Plutonium API failures propagate without changing the actor", async () => {
  plutonium.api.importer.pOpen = async () => { throw new Error("Sources unavailable"); };
  await assert.rejects(openPlutoniumProgression(actor, true), /Sources unavailable/);
  assert.equal(updates.length, 0);
});
