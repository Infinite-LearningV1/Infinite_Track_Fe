import test from "node:test";
import assert from "node:assert/strict";

import {
  backendOperationalSettingsAlpineData,
  validateBackendOperationalSettingsForm,
} from "../src/js/features/backendOperationalSettings/backendOperationalSettings.js";
import {
  hasPageAccess,
  initRoleBasedAccess,
} from "../src/js/utils/roleBasedAccess.js";
import {
  checkAuthentication,
  isProtectedPage,
} from "../src/js/utils/authGuard.js";

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
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
}

function installBrowserGlobals({
  localStorageSeed = {},
  sessionStorageSeed = {},
  pathname = "/management-backend-settings.html",
  href = "http://127.0.0.1:3000/management-backend-settings.html",
  authStore = null,
  showInlineAlert = undefined,
} = {}) {
  const localStorageRef = createMemoryStorage(localStorageSeed);
  const sessionStorageRef = createMemoryStorage(sessionStorageSeed);
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousSessionStorage = globalThis.sessionStorage;
  const previousAlpine = globalThis.Alpine;

  globalThis.localStorage = localStorageRef;
  globalThis.sessionStorage = sessionStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: {
      pathname,
      href,
    },
    showInlineAlert,
  };

  if (authStore) {
    globalThis.Alpine = {
      store(name) {
        if (name === "auth") {
          return authStore;
        }

        return null;
      },
    };
  } else {
    globalThis.Alpine = undefined;
  }

  return {
    localStorageRef,
    sessionStorageRef,
    restore() {
      globalThis.window = previousWindow;
      globalThis.localStorage = previousLocalStorage;
      globalThis.sessionStorage = previousSessionStorage;
      globalThis.Alpine = previousAlpine;
    },
  };
}

const EMPTY_DRAFT = {
  GEOFENCE_RADIUS_DEFAULT_M: "",
  AUTO_CHECKOUT_IDLE_MIN: "",
  AUTO_CHECKOUT_TBUFFER_MIN: "",
  LATE_CHECKOUT_TOLERANCE_MIN: "",
  DEFAULT_SHIFT_END: "",
};

test("auth guard treats backend settings page as protected and redirects unauthenticated users", () => {
  const env = installBrowserGlobals();

  try {
    assert.equal(isProtectedPage("/management-backend-settings.html"), true);

    checkAuthentication();

    assert.equal(
      env.sessionStorageRef.dump().redirectAfterLogin,
      "http://127.0.0.1:3000/management-backend-settings.html",
    );
    assert.equal(globalThis.window.location.href, "/signin.html");
  } finally {
    env.restore();
  }
});

test("role-based access only allows Admin on backend settings page", () => {
  const adminEnv = installBrowserGlobals({
    localStorageSeed: {
      userData: JSON.stringify({ id: 1, role_name: "Admin" }),
    },
  });

  try {
    assert.equal(hasPageAccess("/management-backend-settings.html"), true);
  } finally {
    adminEnv.restore();
  }

  const managementEnv = installBrowserGlobals({
    localStorageSeed: {
      userData: JSON.stringify({ id: 2, role_name: "Management" }),
    },
  });

  try {
    assert.equal(hasPageAccess("/management-backend-settings.html"), false);
  } finally {
    managementEnv.restore();
  }
});

test("initRoleBasedAccess redirects non-admin users away from backend settings page", () => {
  const env = installBrowserGlobals({
    localStorageSeed: {
      userData: JSON.stringify({ id: 2, role_name: "Management" }),
    },
  });

  try {
    initRoleBasedAccess();
    assert.equal(globalThis.window.location.href, "/index.html");
  } finally {
    env.restore();
  }
});

test("backendOperationalSettingsAlpineData init starts from an empty shell draft and stays pristine", () => {
  const state = backendOperationalSettingsAlpineData();

  state.init();

  assert.deepEqual(state.form, EMPTY_DRAFT);
  assert.deepEqual(state.originalForm, EMPTY_DRAFT);
  assert.equal(state.hasChanges, false);
  assert.equal(state.canSave, false);
});

test("backendOperationalSettingsAlpineData saveDraft normalizes valid input, updates baseline, and stays explicitly temporary", async () => {
  const alerts = [];
  const env = installBrowserGlobals({
    showInlineAlert(payload) {
      alerts.push(payload);
    },
  });

  try {
    const state = backendOperationalSettingsAlpineData();
    state.init();
    state.form = {
      GEOFENCE_RADIUS_DEFAULT_M: " 100 ",
      AUTO_CHECKOUT_IDLE_MIN: " 20 ",
      AUTO_CHECKOUT_TBUFFER_MIN: " 10 ",
      LATE_CHECKOUT_TOLERANCE_MIN: " 120 ",
      DEFAULT_SHIFT_END: "17:00",
    };

    await state.saveDraft();

    assert.equal(state.form.AUTO_CHECKOUT_IDLE_MIN, "20");
    assert.equal(state.originalForm.AUTO_CHECKOUT_IDLE_MIN, "20");
    assert.equal(state.lastSavedDraftAt, "");
    assert.equal(state.saveError, "");
    assert.equal(state.isSaving, false);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, "warning");
    assert.match(alerts[0].message, /memori halaman|in-memory|hilang saat refresh/i);
  } finally {
    env.restore();
  }
});

test("backendOperationalSettingsAlpineData saveDraft keeps baseline on invalid input and resetForm restores it", async () => {
  const state = backendOperationalSettingsAlpineData();
  state.init();

  const baseline = { ...state.originalForm };
  state.form.AUTO_CHECKOUT_IDLE_MIN = "abc";
  state.form.DEFAULT_SHIFT_END = "25:99";

  await state.saveDraft();

  assert.deepEqual(state.originalForm, baseline);
  assert.equal(state.lastSavedDraftAt, "");
  assert.match(
    state.saveError,
    /Periksa kembali field yang wajib diisi sebelum menyimpan draft shell INF-142\./,
  );
  assert.equal(
    state.fieldErrors.AUTO_CHECKOUT_IDLE_MIN,
    "AUTO_CHECKOUT_IDLE_MIN wajib diisi dengan bilangan bulat.",
  );
  assert.equal(
    state.fieldErrors.DEFAULT_SHIFT_END,
    "DEFAULT_SHIFT_END wajib diisi dalam format HH:mm.",
  );

  state.resetForm();

  assert.deepEqual(state.form, baseline);
  assert.equal(state.saveError, "");
  assert.deepEqual(state.fieldErrors, {});
});

test("validateBackendOperationalSettingsForm rejects malformed numeric and time values", () => {
  const errors = validateBackendOperationalSettingsForm({
    GEOFENCE_RADIUS_DEFAULT_M: "-1",
    AUTO_CHECKOUT_IDLE_MIN: "10.5",
    AUTO_CHECKOUT_TBUFFER_MIN: "abc",
    LATE_CHECKOUT_TOLERANCE_MIN: " ",
    DEFAULT_SHIFT_END: "24:00",
  });

  assert.deepEqual(errors, {
    GEOFENCE_RADIUS_DEFAULT_M:
      "GEOFENCE_RADIUS_DEFAULT_M wajib diisi dengan bilangan bulat.",
    AUTO_CHECKOUT_IDLE_MIN:
      "AUTO_CHECKOUT_IDLE_MIN wajib diisi dengan bilangan bulat.",
    AUTO_CHECKOUT_TBUFFER_MIN:
      "AUTO_CHECKOUT_TBUFFER_MIN wajib diisi dengan bilangan bulat.",
    LATE_CHECKOUT_TOLERANCE_MIN:
      "LATE_CHECKOUT_TOLERANCE_MIN wajib diisi dengan bilangan bulat.",
    DEFAULT_SHIFT_END: "DEFAULT_SHIFT_END wajib diisi dalam format HH:mm.",
  });
});
