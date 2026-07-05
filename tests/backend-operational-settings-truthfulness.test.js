import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { backendOperationalSettingsAlpineData } from "../src/js/features/backendOperationalSettings/backendOperationalSettings.js";

const TEST_FILE_PATH = fileURLToPath(import.meta.url);
const TEST_DIR = path.dirname(TEST_FILE_PATH);
const PAGE_PATH = path.resolve(
  TEST_DIR,
  "../src/management-backend-settings.html",
);
const FORM_PARTIAL_PATH = path.resolve(
  TEST_DIR,
  "../src/partials/form/form-backend-operational-settings.html",
);

const CANONICAL_SETTINGS = {
  geofenceRadiusDefaultM: 100,
  autoCheckoutIdleMin: 10,
  autoCheckoutTBufferMin: 30,
  lateCheckoutToleranceMin: 15,
  defaultShiftEnd: "17:00:00",
};

function createMemoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function installBrowserGlobals(showInlineAlert = undefined) {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousSessionStorage = globalThis.sessionStorage;
  const localStorageRef = createMemoryStorage();
  const sessionStorageRef = createMemoryStorage();

  globalThis.localStorage = localStorageRef;
  globalThis.sessionStorage = sessionStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: {
      pathname: "/management-backend-settings.html",
      href: "http://127.0.0.1:3000/management-backend-settings.html",
    },
    showInlineAlert,
  };

  return {
    restore() {
      globalThis.window = previousWindow;
      globalThis.localStorage = previousLocalStorage;
      globalThis.sessionStorage = previousSessionStorage;
    },
  };
}

function createSettingsService(updatePayloads = []) {
  return {
    async getOperationalSettings() {
      return CANONICAL_SETTINGS;
    },
    async updateOperationalSettings(payload) {
      updatePayloads.push(payload);
      return {
        ...CANONICAL_SETTINGS,
        ...payload,
        defaultShiftEnd:
          payload.defaultShiftEnd?.length === 5
            ? `${payload.defaultShiftEnd}:00`
            : payload.defaultShiftEnd,
      };
    },
  };
}

test("human-facing copy removes backend implementation details and keeps AHP threshold non-editable", () => {
  const pageHtml = fs.readFileSync(PAGE_PATH, "utf8");
  const formPartial = fs.readFileSync(FORM_PARTIAL_PATH, "utf8");

  assert.match(
    pageHtml,
    /Operational Settings/,
    "Expected page shell to use the Operational Settings title",
  );

  assert.doesNotMatch(
    pageHtml,
    /canonicalOperationalSettingsNotice|Backend Operational Settings/,
    "Expected page shell to remove the technical notice and old page title",
  );

  assert.match(
    formPartial,
    /Atur kebiasaan operasional harian/,
    "Expected form copy to use human-facing operational wording",
  );

  assert.doesNotMatch(
    formPartial,
    /\/api\/settings\/operational|backend canonical|Backend field|AHP_CR_THRESHOLD/i,
    "Expected form copy to hide backend implementation details from admins",
  );

  assert.doesNotMatch(
    formPartial,
    /x-model="form\.AHP_CR_THRESHOLD"/,
    "AHP_CR_THRESHOLD must not be rendered as an editable form field",
  );
});

test("backendOperationalSettingsAlpineData starts by loading canonical backend state", async () => {
  const state = backendOperationalSettingsAlpineData(createSettingsService());

  await state.init();

  assert.deepEqual(state.form, {
    geofenceRadiusDefaultM: "100",
    autoCheckoutIdleMin: "10",
    autoCheckoutTBufferMin: "30",
    lateCheckoutToleranceMin: "15",
    defaultShiftEnd: "17:00",
  });
  assert.deepEqual(state.originalForm, state.form);
  assert.equal(state.infoMessage, undefined);
  assert.equal(state.hasLoadedCanonicalSettings, true);
});

test("backendOperationalSettingsAlpineData saveSettings announces durable backend save", async () => {
  const alerts = [];
  const updatePayloads = [];
  const env = installBrowserGlobals((payload) => alerts.push(payload));

  try {
    const state = backendOperationalSettingsAlpineData(
      createSettingsService(updatePayloads),
    );
    await state.init();
    state.form = {
      geofenceRadiusDefaultM: "100",
      autoCheckoutIdleMin: "20",
      autoCheckoutTBufferMin: "10",
      lateCheckoutToleranceMin: "120",
      defaultShiftEnd: "18:00",
    };

    await state.saveSettings();

    assert.deepEqual(updatePayloads, [
      {
        geofenceRadiusDefaultM: 100,
        autoCheckoutIdleMin: 20,
        autoCheckoutTBufferMin: 10,
        lateCheckoutToleranceMin: 120,
        defaultShiftEnd: "18:00",
      },
    ]);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, "success");
    assert.match(alerts[0].title, /tersimpan/i);
    assert.match(alerts[0].message, /operasional admin/i);
    assert.doesNotMatch(alerts[0].message, /backend canonical/i);
    assert.notEqual(state.lastSavedAt, "");
  } finally {
    env.restore();
  }
});
