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

test("truthful shell copy warns draft is temporary and not loaded from backend truth", () => {
  const pageHtml = fs.readFileSync(PAGE_PATH, "utf8");
  const formPartial = fs.readFileSync(FORM_PARTIAL_PATH, "utf8");

  assert.match(
    pageHtml,
    /temporaryDraftWarning|draftWarning|temporary draft/i,
    "Expected page shell to expose a dedicated temporary draft warning area",
  );

  assert.match(
    formPartial,
    /sementara|temporary|hilang saat refresh|akan hilang/i,
    "Expected form copy to warn that shell-only draft is temporary",
  );

  assert.match(
    formPartial,
    /tidak dimuat dari backend canonical|belum dimuat dari backend canonical|bukan backend canonical/i,
    "Expected form copy to state the values are not loaded from canonical backend truth",
  );
});

test("backendOperationalSettingsAlpineData starts with empty shell draft and a warning state", () => {
  const state = backendOperationalSettingsAlpineData();

  state.init();

  assert.deepEqual(state.form, {
    GEOFENCE_RADIUS_DEFAULT_M: "",
    AUTO_CHECKOUT_IDLE_MIN: "",
    AUTO_CHECKOUT_TBUFFER_MIN: "",
    LATE_CHECKOUT_TOLERANCE_MIN: "",
    DEFAULT_SHIFT_END: "",
  });
  assert.deepEqual(state.originalForm, {
    GEOFENCE_RADIUS_DEFAULT_M: "",
    AUTO_CHECKOUT_IDLE_MIN: "",
    AUTO_CHECKOUT_TBUFFER_MIN: "",
    LATE_CHECKOUT_TOLERANCE_MIN: "",
    DEFAULT_SHIFT_END: "",
  });
  assert.match(state.infoMessage, /backend canonical/i);
  assert.match(state.infoMessage, /temporary|sementara/i);
  assert.equal(state.lastSavedDraftAt, "");
});

test("backendOperationalSettingsAlpineData saveDraft announces in-memory temporary draft instead of durable save", async () => {
  const alerts = [];
  const env = installBrowserGlobals((payload) => alerts.push(payload));

  try {
    const state = backendOperationalSettingsAlpineData();
    state.init();
    state.form = {
      GEOFENCE_RADIUS_DEFAULT_M: "100",
      AUTO_CHECKOUT_IDLE_MIN: "20",
      AUTO_CHECKOUT_TBUFFER_MIN: "10",
      LATE_CHECKOUT_TOLERANCE_MIN: "120",
      DEFAULT_SHIFT_END: "17:00",
    };

    await state.saveDraft();

    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, "warning");
    assert.match(alerts[0].title, /sementara|temporary/i);
    assert.match(alerts[0].message, /memori halaman|in-memory|hilang saat refresh/i);
    assert.equal(state.lastSavedDraftAt, "");
  } finally {
    env.restore();
  }
});
