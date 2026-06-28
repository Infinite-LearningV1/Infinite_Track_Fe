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

const CANONICAL_SETTINGS = {
  geofenceRadiusDefaultM: 100,
  autoCheckoutIdleMin: 10,
  autoCheckoutTBufferMin: 30,
  lateCheckoutToleranceMin: 15,
  defaultShiftEnd: "17:00:00",
};

const CANONICAL_FORM = {
  geofenceRadiusDefaultM: "100",
  autoCheckoutIdleMin: "10",
  autoCheckoutTBufferMin: "30",
  lateCheckoutToleranceMin: "15",
  defaultShiftEnd: "17:00",
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

function createSettingsService({
  initialSettings = CANONICAL_SETTINGS,
  updatedSettings = null,
  updatePayloads = [],
} = {}) {
  return {
    async getOperationalSettings() {
      return initialSettings;
    },
    async updateOperationalSettings(payload) {
      updatePayloads.push(payload);
      return (
        updatedSettings || {
          ...initialSettings,
          ...payload,
          defaultShiftEnd:
            payload.defaultShiftEnd?.length === 5
              ? `${payload.defaultShiftEnd}:00`
              : payload.defaultShiftEnd,
        }
      );
    },
  };
}

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

test("role-based access allows Admin and Management on backend settings page", () => {
  const adminEnv = installBrowserGlobals({
    authStore: {
      isAuthenticated: true,
      sessionState: "authenticated",
      user: { id: 1, role_name: "Admin" },
    },
  });

  try {
    assert.equal(hasPageAccess("/management-backend-settings.html"), true);
  } finally {
    adminEnv.restore();
  }

  const managementEnv = installBrowserGlobals({
    authStore: {
      isAuthenticated: true,
      sessionState: "authenticated",
      user: { id: 2, role_name: "Management" },
    },
  });

  try {
    assert.equal(hasPageAccess("/management-backend-settings.html"), true);
  } finally {
    managementEnv.restore();
  }
});

test("initRoleBasedAccess redirects roles outside Admin/Management to their allowed page", () => {
  const env = installBrowserGlobals({
    authStore: {
      isAuthenticated: true,
      sessionState: "authenticated",
      user: { id: 3, role_name: "Employee" },
    },
  });

  try {
    initRoleBasedAccess();
    assert.equal(globalThis.window.location.href, "/profile.html");
  } finally {
    env.restore();
  }
});

for (const deniedRole of ["Employee", "Internship"]) {
  test(`initRoleBasedAccess hard-denies dashboard access for ${deniedRole} instead of redirecting to profile`, () => {
    const deniedRoles = [];
    const env = installBrowserGlobals({
      pathname: "/index.html",
      href: "http://127.0.0.1:3000/index.html",
      authStore: {
        isAuthenticated: true,
        sessionState: "authenticated",
        user: { id: 3, role_name: deniedRole },
      },
    });

    const originalShowAccessDenied =
      globalThis.window.RoleBasedAccess?.showAccessDenied;

    try {
      globalThis.window.RoleBasedAccess = {
        ...(globalThis.window.RoleBasedAccess || {}),
        showAccessDenied(userRole) {
          deniedRoles.push(userRole);
        },
      };

      initRoleBasedAccess();

      assert.deepEqual(deniedRoles, [deniedRole]);
      assert.equal(
        globalThis.window.location.href,
        "http://127.0.0.1:3000/index.html",
      );
    } finally {
      if (originalShowAccessDenied) {
        globalThis.window.RoleBasedAccess.showAccessDenied =
          originalShowAccessDenied;
      }
      env.restore();
    }
  });
}

test("backendOperationalSettingsAlpineData init loads canonical backend settings", async () => {
  const state = backendOperationalSettingsAlpineData(createSettingsService());

  await state.init();

  assert.deepEqual(state.form, CANONICAL_FORM);
  assert.deepEqual(state.originalForm, CANONICAL_FORM);
  assert.equal(state.hasChanges, false);
  assert.equal(state.canSave, false);
  assert.equal(state.hasLoadedCanonicalSettings, true);
  assert.equal(state.loadError, "");
  assert.notEqual(state.lastLoadedAt, "");
});

test("backendOperationalSettingsAlpineData saveSettings sends typed canonical payload and syncs response", async () => {
  const alerts = [];
  const updatePayloads = [];
  const env = installBrowserGlobals({
    showInlineAlert(payload) {
      alerts.push(payload);
    },
  });

  try {
    const state = backendOperationalSettingsAlpineData(
      createSettingsService({ updatePayloads }),
    );
    await state.init();
    state.form = {
      geofenceRadiusDefaultM: " 100 ",
      autoCheckoutIdleMin: " 20 ",
      autoCheckoutTBufferMin: " 10 ",
      lateCheckoutToleranceMin: " 120 ",
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
    assert.deepEqual(state.form, {
      geofenceRadiusDefaultM: "100",
      autoCheckoutIdleMin: "20",
      autoCheckoutTBufferMin: "10",
      lateCheckoutToleranceMin: "120",
      defaultShiftEnd: "18:00",
    });
    assert.equal(state.saveError, "");
    assert.equal(state.isSaving, false);
    assert.notEqual(state.lastSavedAt, "");
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, "success");
    assert.match(alerts[0].message, /operasional admin/i);
  } finally {
    env.restore();
  }
});

test("backendOperationalSettingsAlpineData saveSettings keeps baseline on invalid input and resetForm restores it", async () => {
  const state = backendOperationalSettingsAlpineData(createSettingsService());
  await state.init();

  const baseline = { ...state.originalForm };
  state.form.autoCheckoutIdleMin = "abc";
  state.form.defaultShiftEnd = "25:99";

  await state.saveSettings();

  assert.deepEqual(state.originalForm, baseline);
  assert.equal(state.lastSavedAt, "");
  assert.match(
    state.saveError,
    /Periksa kembali field yang wajib diisi sebelum menyimpan pengaturan operasional\./,
  );
  assert.equal(
    state.fieldErrors.autoCheckoutIdleMin,
    "Batas idle sebelum checkout otomatis wajib diisi dengan bilangan bulat positif.",
  );
  assert.equal(
    state.fieldErrors.defaultShiftEnd,
    "Jam selesai shift default wajib diisi dalam format HH:mm.",
  );

  state.resetForm();

  assert.deepEqual(state.form, baseline);
  assert.equal(state.saveError, "");
  assert.deepEqual(state.fieldErrors, {});
});

test("backendOperationalSettingsAlpineData saveSettings stays safe without a browser window shim", async () => {
  const previousWindow = globalThis.window;
  Reflect.deleteProperty(globalThis, "window");

  try {
    const state = backendOperationalSettingsAlpineData(createSettingsService());
    await state.init();
    state.form.autoCheckoutIdleMin = "20";

    await state.saveSettings();

    assert.equal(state.saveError, "");
    assert.equal(state.isSaving, false);
    assert.equal(state.originalForm.autoCheckoutIdleMin, "20");
  } finally {
    if (typeof previousWindow === "undefined") {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test("validateBackendOperationalSettingsForm rejects malformed numeric and time values", () => {
  const errors = validateBackendOperationalSettingsForm({
    geofenceRadiusDefaultM: "-1",
    autoCheckoutIdleMin: "10.5",
    autoCheckoutTBufferMin: "abc",
    lateCheckoutToleranceMin: " ",
    defaultShiftEnd: "24:00",
  });

  assert.deepEqual(errors, {
    geofenceRadiusDefaultM:
      "Radius area absensi wajib diisi dengan bilangan bulat positif.",
    autoCheckoutIdleMin:
      "Batas idle sebelum checkout otomatis wajib diisi dengan bilangan bulat positif.",
    autoCheckoutTBufferMin:
      "Waktu penyangga checkout otomatis wajib diisi dengan bilangan bulat positif.",
    lateCheckoutToleranceMin:
      "Toleransi checkout terlambat wajib diisi dengan bilangan bulat positif.",
    defaultShiftEnd:
      "Jam selesai shift default wajib diisi dalam format HH:mm.",
  });
});
