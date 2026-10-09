import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Run the actual sheet class without launching Foundry or its license/chat hooks.
const source = fs.readFileSync(new URL("../scripts/aaa-sheet.mjs", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "") + "\nglobalThis.Sheet = AAACharacterSheet;";
let sheet, calls, notifications, manager, disabled;
beforeEach(() => {
  calls = []; notifications = []; disabled = false;
  manager = { steps: [{}], render: () => calls.push("render") };
  const context = vm.createContext({
    ActorSheet: class {}, FormApplication: class {}, Hooks: { on() {}, once() {} },
    CONFIG: { DND5E: { maxLevel: 20 }, Item: { dataModels: { race: { metadata: { singleton: true } } } } },
    game: {
      i18n: { localize: key => key }, settings: { get: () => disabled },
      dnd5e: { applications: { advancement: { AdvancementManager: {
        forNewItem: (actor, data) => { calls.push({ newItem: data }); return manager; },
        forLevelChange: (actor, id, delta) => { calls.push({ id, delta }); return manager; }
      } } } }
    },
    renderAdvancement: app => app.render(),
    ui: { notifications: { warn: message => notifications.push(message), error: message => notifications.push(message) } }
  });
  vm.runInContext(source, context);
  sheet = new context.Sheet();
  sheet.isEditable = true;
  sheet.actor = { isOwner: true, items: [], system: { details: { level: 7 } }, createEmbeddedDocuments: (type, data) => calls.push({ create: data }) };
});
test("a new class opens its native advancement without pre-creating it", async () => {
  const data = { type: "class", system: { identifier: "paladin", levels: 1, advancement: [{}] } };
  await sheet._onDropItemCreate(data, {});
  assert.equal(calls[0].newItem, data);
  assert.equal(calls[1], "render");
  assert.equal(calls.some(call => call?.create), false);
});
test("dropping an existing class advances it and does not create duplicates", async () => {
  sheet.actor.items = [{ id: "paladin", type: "class", system: { identifier: "paladin", levels: 7 } }];
  await sheet._onDropItemCreate({ type: "class", system: { identifier: "paladin", levels: 2 } }, {});
  assert.deepEqual(calls[0], { id: "paladin", delta: 2 });
  assert.equal(calls[1], "render");
});
test("class drops cap their delta at the total character level limit", async () => {
  sheet.actor.system.details.level = 19;
  await sheet._onDropItemCreate({ type: "class", system: { levels: 4, advancement: [{}] } }, {});
  assert.equal(calls[0].newItem.system.levels, 1);
});
test("maximum level is enforced even if advancements are disabled", async () => {
  disabled = true;
  sheet.actor.system.details.level = 20;
  await sheet._onDropItemCreate({ type: "class", system: { levels: 1 } }, {});
  assert.equal(calls.length, 0);
  assert.match(notifications[0], /MaxLevel/);
});
test("species singleton is enforced before launching advancement", async () => {
  sheet.actor.items = [{ type: "race" }];
  await sheet._onDropItemCreate({ type: "race", system: { advancement: [{}] } }, {});
  assert.equal(calls.length, 0);
  assert.match(notifications[0], /Singleton/);
});
test("ordinary item drops still use embedded item creation", async () => {
  const data = { type: "weapon", system: {} };
  await sheet._onDropItemCreate(data, {});
  assert.equal(calls[0].create[0], data);
});
test("read-only drops cannot create items or launch advancement", async () => {
  sheet.isEditable = false;
  await sheet._onDropItemCreate({ type: "class", system: { levels: 1, advancement: [{}] } }, {});
  assert.equal(calls.length, 0);
});
