# Web FE Refresh Session Adoption Implementation Plan

> **Status:** Superseded historical plan. The active Web FE auth contract no longer adopts `/auth/refresh`; source and ADR-002 now use `/auth/me` bootstrap plus forced re-authentication for protected-request auth failures. References to `refreshSession`, `REFRESH_URL`, or silent refresh below are retained as historical planning context only and are not current runtime truth.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement truthful silent refresh for Web FE so protected requests and protected-page bootstrap can recover from normal access-token expiry, while invalid/revoked/inactivity-expired sessions force full re-auth and transport failures do not masquerade as auth invalidation.

**Architecture:** Add a centralized auth-session runtime that classifies auth failures, coordinates a single in-flight refresh, and exposes one auth-aware request path for protected API calls. Then wire bootstrap, auth guard, auth store, and logout/cleanup to consume that runtime instead of relying on scattered local-storage checks.

**Tech Stack:** Webpack multi-page app, Alpine.js, Axios, Node 20+, Node built-in test runner

---

## File Structure Map

- `src/js/services/authSessionRuntime.js` — pure auth runtime helpers and browser-facing orchestration primitives: failure classification, single-flight refresh, bootstrap resolution, storage snapshot helpers, forced artifact cleanup.
- `src/js/services/authRequest.js` — one auth-aware request helper that wraps Axios requests, attaches canonical auth headers, adds `X-Client-Type`, and routes refreshable `401` failures through the centralized runtime.
- `src/js/services/authService.js` — auth API adapter layer for login, `/auth/me`, refresh, logout, canonical auth headers, session-hint accessors, and forced re-auth entrypoint.
- `src/js/utils/storageManager.js` — canonical persisted user-data helpers plus removal of legacy auth keys still present in the repo.
- `src/js/index.js` — startup bootstrap consumer that resolves protected-page session truth through the runtime instead of trusting local-only state.
- `src/js/stores/authStore.js` — Alpine auth store updated to consume runtime-backed refresh and bootstrap results.
- `src/js/utils/authGuard.js` — route boundary that redirects immediately only when there is no session hint at all; otherwise defers session truth to bootstrap.
- `src/js/features/signinHandler.js` — login redirect flow that uses runtime-backed user/session confirmation rather than local-only redirect assumptions.
- `src/js/components/logoutComponent.js` — UI logout consumer that delegates final cleanup to centralized auth service/runtime helpers.
- `src/js/utils/roleBasedAccess.js` — role gate that stops doing custom fallback cleanup and delegates forced re-auth to the centralized path.
- `src/js/services/userService.js` — migrate protected user-management requests from raw Axios/manual token reads to `authRequest`.
- `src/js/services/bookingService.js` — migrate protected booking requests from raw Axios/manual token reads to `authRequest`.
- `src/js/services/attendanceService.js` — migrate protected attendance requests from raw Axios/manual token reads to `authRequest`.
- `src/js/services/reportService.js` — migrate protected report requests from raw Axios/manual token reads to `authRequest` while keeping existing dev-only mock fallback.
- `tests/auth-session-runtime.test.js` — narrow Node test target for pure runtime behavior: failure classification, storage snapshot normalization, cleanup, replay-once behavior, and bootstrap session resolution.
- `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md` — record the adopted refresh-session semantics and session hint vs session truth boundary.
- `docs/superpowers/specs/2026-04-22-web-fe-refresh-session-adoption-design.md` — approved design/spec for this work.
- `docs/superpowers/plans/2026-04-22-web-fe-refresh-session-adoption.md` — this implementation plan.

> **Testing note:** The repo currently has no first-party application test harness. This plan adds a narrow Node built-in test target for the new pure auth runtime logic only. Browser/runtime verification remains `REQUIRES REPO VERIFICATION` after build because the exact backend fixture path is not locked in the repo.

### Task 1: Add the auth runtime test harness and core failure-classification primitives

**Files:**

- Create: `tests/auth-session-runtime.test.js`
- Create: `src/js/services/authSessionRuntime.js`
- Modify: `package.json`
- Test: `tests/auth-session-runtime.test.js`

- [ ] **Step 1: Add a dedicated auth-runtime test script and write the first failing tests**

Update the `scripts` block in `package.json` to add this exact test command right above `sort`:

```json
"test:auth-runtime": "node --experimental-default-type=module --test tests/auth-session-runtime.test.js",
```

Create `tests/auth-session-runtime.test.js` with this exact content:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyAuthFailure,
  createSingleFlightRefresh,
} from "../src/js/services/authSessionRuntime.js";

test("classifyAuthFailure marks expired access token as refreshable", () => {
  const result = classifyAuthFailure({
    response: {
      status: 401,
      data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired" },
    },
  });

  assert.equal(result.kind, "refreshable");
  assert.equal(result.reason, "access_token_expired");
});

test("classifyAuthFailure marks invalid refresh token as non-refreshable", () => {
  const result = classifyAuthFailure({
    response: {
      status: 401,
      data: { code: "REFRESH_TOKEN_INVALID", message: "invalid refresh" },
    },
  });

  assert.equal(result.kind, "non_refreshable");
  assert.equal(result.reason, "refresh_invalid");
});

test("classifyAuthFailure marks network failures as transport", () => {
  const result = classifyAuthFailure({
    request: { readyState: 4 },
    message: "Network Error",
  });

  assert.equal(result.kind, "transport");
  assert.equal(result.reason, "network_error");
});

test("createSingleFlightRefresh shares one in-flight refresh promise", async () => {
  let calls = 0;
  const refresh = createSingleFlightRefresh(async () => {
    calls += 1;
    await Promise.resolve();
    return { ok: true };
  });

  const [first, second] = await Promise.all([refresh(), refresh()]);

  assert.equal(calls, 1);
  assert.deepEqual(first, { ok: true });
  assert.deepEqual(second, { ok: true });
});
```

- [ ] **Step 2: Run the new test target and verify it fails because the runtime module does not exist yet**

Run:

```bash
npm run test:auth-runtime
```

Expected:

- FAIL with `ERR_MODULE_NOT_FOUND` for `src/js/services/authSessionRuntime.js`.

- [ ] **Step 3: Write the minimal runtime module to satisfy the first tests**

Create `src/js/services/authSessionRuntime.js` with this exact content:

```js
const REFRESHABLE_CODES = new Set([
  "ACCESS_TOKEN_EXPIRED",
  "TOKEN_EXPIRED",
  "ACCESS_EXPIRED",
]);

const NON_REFRESHABLE_CODES = new Set([
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_REVOKED",
  "SESSION_REVOKED",
  "FULL_REAUTH_REQUIRED",
  "INACTIVITY_EXPIRED",
]);

export function classifyAuthFailure(error) {
  if (error?.request && !error?.response) {
    return { kind: "transport", reason: "network_error" };
  }

  const status = error?.response?.status;
  const code = String(error?.response?.data?.code || "").toUpperCase();
  const message = String(
    error?.response?.data?.message || error?.message || "",
  );

  if (status === 401 && NON_REFRESHABLE_CODES.has(code)) {
    const reason =
      code === "INACTIVITY_EXPIRED" ? "inactivity_expired" : "refresh_invalid";
    return { kind: "non_refreshable", reason };
  }

  if (
    status === 401 &&
    (REFRESHABLE_CODES.has(code) || /expired/i.test(message))
  ) {
    return { kind: "refreshable", reason: "access_token_expired" };
  }

  return { kind: "other", reason: "unclassified" };
}

export function createSingleFlightRefresh(refreshFn) {
  let inFlightPromise = null;

  return async function runSingleFlightRefresh() {
    if (!inFlightPromise) {
      inFlightPromise = Promise.resolve()
        .then(() => refreshFn())
        .finally(() => {
          inFlightPromise = null;
        });
    }

    return inFlightPromise;
  };
}
```

- [ ] **Step 4: Re-run the test target and verify the new runtime primitives pass**

Run:

```bash
npm run test:auth-runtime
```

Expected:

- PASS for all 4 tests in `tests/auth-session-runtime.test.js`.

- [ ] **Step 5: Commit the initial runtime harness**

Run:

```bash
git add package.json tests/auth-session-runtime.test.js src/js/services/authSessionRuntime.js
git commit -m "test: add auth session runtime harness"
```

Expected:

- One commit containing only the new test target and the minimal runtime primitives.

### Task 2: Normalize session-hint storage and centralize auth artifact cleanup

**Files:**

- Modify: `tests/auth-session-runtime.test.js`
- Modify: `src/js/services/authSessionRuntime.js`
- Modify: `src/js/services/authService.js`
- Modify: `src/js/utils/storageManager.js`
- Test: `tests/auth-session-runtime.test.js`

- [ ] **Step 1: Extend the runtime tests to cover legacy storage normalization and cleanup**

Append these exact helpers and tests to `tests/auth-session-runtime.test.js` below the existing tests:

```js
import {
  clearAuthArtifacts,
  readStoredSessionSnapshot,
} from "../src/js/services/authSessionRuntime.js";

function createMemoryStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    dump() {
      return Object.fromEntries(store.entries());
    },
  };
}

test("readStoredSessionSnapshot prefers canonical userData and authToken", () => {
  const localStorage = createMemoryStorage({
    userData: JSON.stringify({ id: 7, role_name: "Admin" }),
    authToken: "canonical-token",
    auth_token: "legacy-token",
  });

  const snapshot = readStoredSessionSnapshot(localStorage);

  assert.deepEqual(snapshot, {
    user: { id: 7, role_name: "Admin" },
    token: "canonical-token",
  });
});

test("readStoredSessionSnapshot falls back to legacy user token and auth_token", () => {
  const localStorage = createMemoryStorage({
    user: JSON.stringify({
      id: 9,
      role_name: "Management",
      token: "legacy-user-token",
    }),
    auth_token: "legacy-header-token",
  });

  const snapshot = readStoredSessionSnapshot(localStorage);

  assert.deepEqual(snapshot, {
    user: { id: 9, role_name: "Management", token: "legacy-user-token" },
    token: "legacy-header-token",
  });
});

test("clearAuthArtifacts removes canonical and legacy auth keys", () => {
  const localStorage = createMemoryStorage({
    userData: JSON.stringify({ id: 1 }),
    authToken: "canonical-token",
    user: JSON.stringify({ id: 1, token: "legacy-user-token" }),
    auth_token: "legacy-header-token",
    rememberMe: "true",
    rememberedEmail: "admin@example.com",
    redirectAfterLogin: "/index.html",
  });
  const sessionStorage = createMemoryStorage({
    redirectAfterLogin: "/index.html",
    sessionVerificationState: "pending",
  });

  clearAuthArtifacts(localStorage, sessionStorage);

  assert.deepEqual(localStorage.dump(), {});
  assert.deepEqual(sessionStorage.dump(), {});
});
```

- [ ] **Step 2: Run the tests and verify they fail because snapshot/cleanup helpers are missing**

Run:

```bash
npm run test:auth-runtime
```

Expected:

- FAIL with missing exports or assertion failures for `readStoredSessionSnapshot` and `clearAuthArtifacts`.

- [ ] **Step 3: Add snapshot and cleanup helpers, then route auth/storage consumers through them**

Replace the contents of `src/js/services/authSessionRuntime.js` with this exact version:

```js
const REFRESHABLE_CODES = new Set([
  "ACCESS_TOKEN_EXPIRED",
  "TOKEN_EXPIRED",
  "ACCESS_EXPIRED",
]);

const NON_REFRESHABLE_CODES = new Set([
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_REVOKED",
  "SESSION_REVOKED",
  "FULL_REAUTH_REQUIRED",
  "INACTIVITY_EXPIRED",
]);

const USER_KEYS = ["userData", "user", "currentUserData"];
const TOKEN_KEYS = ["authToken", "auth_token"];
const AUXILIARY_KEYS = ["rememberMe", "rememberedEmail", "redirectAfterLogin"];
const SESSION_KEYS = ["redirectAfterLogin", "sessionVerificationState"];

function parseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function classifyAuthFailure(error) {
  if (error?.request && !error?.response) {
    return { kind: "transport", reason: "network_error" };
  }

  const status = error?.response?.status;
  const code = String(error?.response?.data?.code || "").toUpperCase();
  const message = String(
    error?.response?.data?.message || error?.message || "",
  );

  if (status === 401 && NON_REFRESHABLE_CODES.has(code)) {
    const reason =
      code === "INACTIVITY_EXPIRED" ? "inactivity_expired" : "refresh_invalid";
    return { kind: "non_refreshable", reason };
  }

  if (
    status === 401 &&
    (REFRESHABLE_CODES.has(code) || /expired/i.test(message))
  ) {
    return { kind: "refreshable", reason: "access_token_expired" };
  }

  return { kind: "other", reason: "unclassified" };
}

export function createSingleFlightRefresh(refreshFn) {
  let inFlightPromise = null;

  return async function runSingleFlightRefresh() {
    if (!inFlightPromise) {
      inFlightPromise = Promise.resolve()
        .then(() => refreshFn())
        .finally(() => {
          inFlightPromise = null;
        });
    }

    return inFlightPromise;
  };
}

export function readStoredSessionSnapshot(
  localStorageRef = globalThis.localStorage,
) {
  if (!localStorageRef) {
    return null;
  }

  const canonicalUser = parseJson(localStorageRef.getItem("userData"));
  const legacyUser =
    parseJson(localStorageRef.getItem("user")) ||
    parseJson(localStorageRef.getItem("currentUserData"));
  const user = canonicalUser || legacyUser;

  const canonicalToken = localStorageRef.getItem("authToken");
  const legacyToken = localStorageRef.getItem("auth_token");
  const userToken = user?.token || user?.access_token || null;
  const token = canonicalToken || legacyToken || userToken || null;

  if (!user && !token) {
    return null;
  }

  return { user: user || null, token };
}

export function clearAuthArtifacts(
  localStorageRef = globalThis.localStorage,
  sessionStorageRef = globalThis.sessionStorage,
) {
  [...USER_KEYS, ...TOKEN_KEYS, ...AUXILIARY_KEYS].forEach((key) => {
    localStorageRef?.removeItem?.(key);
  });

  SESSION_KEYS.forEach((key) => {
    sessionStorageRef?.removeItem?.(key);
  });
}
```

Update `src/js/services/authService.js` with these exact edits:

```js
import {
  clearAuthArtifacts,
  readStoredSessionSnapshot,
} from "./authSessionRuntime.js";
```

```js
function hasSessionHint() {
  return readStoredSessionSnapshot(window.localStorage) !== null;
}

function isAuthenticated() {
  return hasSessionHint();
}

function getCurrentUser() {
  return readStoredSessionSnapshot(window.localStorage)?.user ?? null;
}
```

```js
async function logout() {
  try {
    try {
      envLog("debug", "Attempting logout with URL:", API_CONFIG.LOGOUT_URL);
      await axios.post(API_CONFIG.LOGOUT_URL);
      envLog("info", "Logout berhasil di backend");
    } catch (error) {
      envLog(
        "warn",
        "Backend logout failed, proceeding with frontend logout:",
        error.message,
      );
    }

    clearAuthArtifacts(window.localStorage, window.sessionStorage);
    removeUserFromStorage();

    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie =
        name +
        "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
        window.location.hostname;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });

    return true;
  } catch (error) {
    console.error("Logout error:", error.message);
    clearAuthArtifacts(window.localStorage, window.sessionStorage);
    removeUserFromStorage();
    return true;
  }
}
```

Update the export block in `src/js/services/authService.js` to include `hasSessionHint`:

```js
export {
  login,
  fetchCurrentUser,
  logout,
  isAuthenticated,
  getCurrentUser,
  hasSessionHint,
};
```

Update the browser global in `src/js/services/authService.js` to include `hasSessionHint`:

```js
window.AuthService = {
  login,
  fetchCurrentUser,
  logout,
  isAuthenticated,
  getCurrentUser,
  hasSessionHint,
};
```

Update `src/js/utils/storageManager.js` by extending the legacy cleanup list in `removeUserFromStorage()` to this exact block:

```js
localStorage.removeItem("currentUserData");
localStorage.removeItem("auth_token");
localStorage.removeItem("user");
```

- [ ] **Step 4: Run the auth-runtime tests again and verify the storage/cleanup behavior passes**

Run:

```bash
npm run test:auth-runtime
```

Expected:

- PASS for the original tests plus the 3 new snapshot/cleanup tests.

- [ ] **Step 5: Commit the normalized auth artifact behavior**

Run:

```bash
git add tests/auth-session-runtime.test.js src/js/services/authSessionRuntime.js src/js/services/authService.js src/js/utils/storageManager.js
git commit -m "feat: normalize auth session artifacts"
```

Expected:

- One commit containing the new snapshot/cleanup behavior and its tests.

### Task 3: Add the centralized protected-request recovery path and migrate service consumers

**Files:**

- Modify: `tests/auth-session-runtime.test.js`
- Modify: `src/js/services/authSessionRuntime.js`
- Create: `src/js/services/authRequest.js`
- Modify: `src/js/services/authService.js`
- Modify: `src/js/services/userService.js`
- Modify: `src/js/services/bookingService.js`
- Modify: `src/js/services/attendanceService.js`
- Modify: `src/js/services/reportService.js`
- Test: `tests/auth-session-runtime.test.js`

- [ ] **Step 1: Add failing tests for replay-once, forced re-auth, and transport-failure behavior**

Append these exact tests to `tests/auth-session-runtime.test.js`:

```js
import { createProtectedRequestExecutor } from "../src/js/services/authSessionRuntime.js";

test("createProtectedRequestExecutor replays one protected request after refresh succeeds", async () => {
  let attempts = 0;
  let refreshCalls = 0;
  const executor = createProtectedRequestExecutor({
    executeRefresh: async () => {
      refreshCalls += 1;
      return { ok: true };
    },
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async () => {
      throw new Error("forced reauth should not be called");
    },
  });

  const result = await executor(async ({ replayed }) => {
    attempts += 1;
    if (!replayed) {
      const error = new Error("expired");
      error.response = {
        status: 401,
        data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired" },
      };
      throw error;
    }
    return { ok: true, replayed };
  });

  assert.equal(attempts, 2);
  assert.equal(refreshCalls, 1);
  assert.deepEqual(result, { ok: true, replayed: true });
});

test("createProtectedRequestExecutor calls forced reauth when refresh becomes non-refreshable", async () => {
  let forcedReauthCalls = 0;
  const executor = createProtectedRequestExecutor({
    executeRefresh: async () => {
      const error = new Error("refresh invalid");
      error.response = {
        status: 401,
        data: { code: "REFRESH_TOKEN_INVALID", message: "invalid refresh" },
      };
      throw error;
    },
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async () => {
      forcedReauthCalls += 1;
    },
  });

  await assert.rejects(() =>
    executor(async () => {
      const error = new Error("expired");
      error.response = {
        status: 401,
        data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired" },
      };
      throw error;
    }),
  );

  assert.equal(forcedReauthCalls, 1);
});

test("createProtectedRequestExecutor does not force reauth on transport refresh failures", async () => {
  let forcedReauthCalls = 0;
  const executor = createProtectedRequestExecutor({
    executeRefresh: async () => {
      const error = new Error("Network Error");
      error.request = { readyState: 4 };
      throw error;
    },
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async () => {
      forcedReauthCalls += 1;
    },
  });

  await assert.rejects(() =>
    executor(async () => {
      const error = new Error("expired");
      error.response = {
        status: 401,
        data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired" },
      };
      throw error;
    }),
  );

  assert.equal(forcedReauthCalls, 0);
});
```

- [ ] **Step 2: Run the tests and verify they fail because the protected-request executor is missing**

Run:

```bash
npm run test:auth-runtime
```

Expected:

- FAIL with missing export or behavior failures for `createProtectedRequestExecutor`.

- [ ] **Step 3: Implement the executor and route protected service calls through one auth-aware request helper**

Append this exact export to `src/js/services/authSessionRuntime.js`:

```js
export function createProtectedRequestExecutor({
  executeRefresh,
  classifyFailure,
  onForcedReauth,
}) {
  const refreshOnce = createSingleFlightRefresh(executeRefresh);

  return async function runProtectedRequest(executeRequest, options = {}) {
    const replayed = options.replayed === true;

    try {
      return await executeRequest({ replayed });
    } catch (error) {
      const initialFailure = classifyFailure(error);
      if (initialFailure.kind !== "refreshable" || replayed) {
        throw error;
      }

      try {
        await refreshOnce();
      } catch (refreshError) {
        const refreshFailure = classifyFailure(refreshError);
        if (refreshFailure.kind === "non_refreshable") {
          await onForcedReauth(refreshError);
        }
        throw refreshError;
      }

      return executeRequest({ replayed: true });
    }
  };
}
```

Create `src/js/services/authRequest.js` with this exact content:

```js
import axios from "axios";
import { createProtectedRequestExecutor } from "./authSessionRuntime.js";
import {
  buildAuthRequestHeaders,
  forceReauthenticate,
  refreshSession,
} from "./authService.js";
import { classifyAuthFailure } from "./authSessionRuntime.js";

const runProtectedRequest = createProtectedRequestExecutor({
  executeRefresh: refreshSession,
  classifyFailure: classifyAuthFailure,
  onForcedReauth: forceReauthenticate,
});

export async function authRequest(config) {
  return runProtectedRequest(async () => {
    const mergedHeaders = {
      "X-Client-Type": "web-fe",
      ...buildAuthRequestHeaders(),
      ...(config.headers || {}),
    };

    return axios({
      ...config,
      withCredentials: true,
      headers: mergedHeaders,
    });
  });
}
```

Add these exact helpers to `src/js/services/authService.js` below `fetchCurrentUser()`:

```js
async function refreshSession() {
  const response = await axios.post(
    API_CONFIG.REFRESH_URL,
    {},
    {
      withCredentials: true,
      headers: {
        "X-Client-Type": "web-fe",
        ...buildAuthRequestHeaders(),
      },
    },
  );

  const refreshedUser =
    response.data?.data?.user || response.data?.data || null;
  const refreshedToken =
    response.data?.data?.access_token || response.data?.data?.token || null;

  if (refreshedUser) {
    saveUserToStorage(refreshedUser);
  }

  if (refreshedToken) {
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.AUTH_TOKEN, refreshedToken);
  }

  return response.data;
}

function buildAuthRequestHeaders() {
  const snapshot = readStoredSessionSnapshot(window.localStorage);
  if (!snapshot?.token) {
    return {};
  }

  return {
    Authorization: `Bearer ${snapshot.token}`,
  };
}

async function forceReauthenticate() {
  clearAuthArtifacts(window.localStorage, window.sessionStorage);
  removeUserFromStorage();

  if (typeof Alpine !== "undefined" && Alpine.store && Alpine.store("auth")) {
    Alpine.store("auth").clearAuth();
  }

  window.location.href = "/signin.html";
}
```

Update the export block in `src/js/services/authService.js` to this exact version:

```js
export {
  login,
  fetchCurrentUser,
  logout,
  isAuthenticated,
  getCurrentUser,
  hasSessionHint,
  refreshSession,
  buildAuthRequestHeaders,
  forceReauthenticate,
};
```

Update the browser global in `src/js/services/authService.js` to this exact version:

```js
window.AuthService = {
  login,
  fetchCurrentUser,
  logout,
  isAuthenticated,
  getCurrentUser,
  hasSessionHint,
  refreshSession,
  buildAuthRequestHeaders,
  forceReauthenticate,
};
```

Now migrate the protected service files to `authRequest`.

In `src/js/services/userService.js`, replace the top imports and remove the local token helpers so the file starts like this:

```js
import { API_CONFIG, envLog } from "../config/env.js";
import { authRequest } from "./authRequest.js";
import {
  validatePhotoFile,
  handlePhotoUploadError,
  PHOTO_CONFIG,
} from "../utils/photoValidation.js";
```

Then replace each raw Axios call with these exact patterns:

```js
const response = await authRequest({
  method: "get",
  url: url.toString(),
});
```

```js
const response = await authRequest({
  method: "get",
  url: `${API_CONFIG.BASE_URL}/users/${userId}`,
});
```

```js
const response = await authRequest({
  method: "patch",
  url: `${API_CONFIG.BASE_URL}/users/${userId}`,
  data: formData,
  headers: {
    "Content-Type": "multipart/form-data",
  },
});
```

```js
const response = await authRequest({
  method: "delete",
  url: `${API_CONFIG.BASE_URL}/users/${userId}`,
});
```

```js
const response = await authRequest({
  method: "post",
  url: `${API_CONFIG.BASE_URL}/users`,
  data: formData,
  headers: {
    "Content-Type": "multipart/form-data",
  },
});
```

```js
const response = await authRequest({
  method: "patch",
  url: `${API_CONFIG.BASE_URL}/users/${userId}`,
  data: dataToSend,
  headers: {
    "Content-Type": "application/json",
  },
});
```

```js
const response = await authRequest({
  method: "post",
  url: `${API_CONFIG.BASE_URL}/users/${userId}/photo`,
  data: formData,
  headers: {
    "Content-Type": "multipart/form-data",
  },
});
```

```js
const response = await authRequest({
  method: "get",
  url: `${API_CONFIG.BASE_URL}/roles`,
});
```

```js
const response = await authRequest({
  method: "get",
  url: `${API_CONFIG.BASE_URL}/programs`,
});
```

```js
const response = await authRequest({
  method: "get",
  url: url.toString(),
});
```

```js
const response = await authRequest({
  method: "get",
  url: `${API_CONFIG.BASE_URL}/divisions`,
});
```

In `src/js/services/bookingService.js`, replace the top imports with:

```js
import { API_CONFIG, envLog } from "../config/env.js";
import { authRequest } from "./authRequest.js";
```

Then replace each request with these exact calls:

```js
const response = await authRequest({
  method: "get",
  url,
  headers: {
    "Content-Type": "application/json",
  },
});
```

```js
const response = await authRequest({
  method: "patch",
  url,
  data: { status },
  headers: {
    "Content-Type": "application/json",
  },
});
```

```js
const response = await authRequest({
  method: "delete",
  url,
  headers: {
    "Content-Type": "application/json",
  },
});
```

In `src/js/services/attendanceService.js`, replace the top imports with:

```js
import { API_CONFIG, envLog } from "../config/env.js";
import { authRequest } from "./authRequest.js";
```

Then replace each request with these exact calls:

```js
const response = await authRequest({
  method: "get",
  url,
  headers: {
    "Content-Type": "application/json",
  },
});
```

```js
const response = await authRequest({
  method: "delete",
  url,
  headers: {
    "Content-Type": "application/json",
  },
});
```

In `src/js/services/reportService.js`, replace the top imports with:

```js
import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";
```

Then replace the protected API call with this exact block:

```js
const response = await authRequest({
  method: "get",
  url: `${API_CONFIG.BASE_URL}/summary`,
  params: queryParams,
});
```

- [ ] **Step 4: Run the runtime tests and the repo build to verify the centralized request path compiles cleanly**

Run:

```bash
npm run test:auth-runtime && npm run build
```

Expected:

- The auth-runtime test target passes.
- Webpack production build succeeds.

- [ ] **Step 5: Commit the centralized protected-request recovery path**

Run:

```bash
git add tests/auth-session-runtime.test.js src/js/services/authSessionRuntime.js src/js/services/authRequest.js src/js/services/authService.js src/js/services/userService.js src/js/services/bookingService.js src/js/services/attendanceService.js src/js/services/reportService.js
git commit -m "feat: centralize auth request recovery"
```

Expected:

- One commit containing the new auth-aware request path and the service migrations.

### Task 4: Wire bootstrap, auth guard, auth store, signin redirect, and fallback cleanup to the runtime

**Files:**

- Modify: `tests/auth-session-runtime.test.js`
- Modify: `src/js/services/authSessionRuntime.js`
- Modify: `src/js/services/authService.js`
- Modify: `src/js/index.js`
- Modify: `src/js/stores/authStore.js`
- Modify: `src/js/utils/authGuard.js`
- Modify: `src/js/features/signinHandler.js`
- Modify: `src/js/components/logoutComponent.js`
- Modify: `src/js/utils/roleBasedAccess.js`
- Test: `tests/auth-session-runtime.test.js`

- [ ] **Step 1: Add failing tests for bootstrap session resolution semantics**

Append these exact tests to `tests/auth-session-runtime.test.js`:

```js
import { createBootstrapSessionResolver } from "../src/js/services/authSessionRuntime.js";

test("createBootstrapSessionResolver returns unauthenticated when no session hint exists", async () => {
  const resolveSession = createBootstrapSessionResolver({
    hasSessionHint: () => false,
    fetchCurrentUser: async () => {
      throw new Error("fetchCurrentUser should not run");
    },
    refreshSession: async () => {
      throw new Error("refreshSession should not run");
    },
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveSession();
  assert.deepEqual(result, { state: "unauthenticated", user: null });
});

test("createBootstrapSessionResolver refreshes and resolves authenticated user", async () => {
  let fetchCalls = 0;
  const resolveSession = createBootstrapSessionResolver({
    hasSessionHint: () => true,
    fetchCurrentUser: async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        const error = new Error("expired");
        error.response = {
          status: 401,
          data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired" },
        };
        throw error;
      }
      return { id: 3, role_name: "Admin" };
    },
    refreshSession: async () => ({ ok: true }),
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveSession();
  assert.deepEqual(result, {
    state: "authenticated",
    user: { id: 3, role_name: "Admin" },
  });
});

test("createBootstrapSessionResolver keeps verification_failed separate from non-refreshable auth", async () => {
  const resolveSession = createBootstrapSessionResolver({
    hasSessionHint: () => true,
    fetchCurrentUser: async () => {
      const error = new Error("Network Error");
      error.request = { readyState: 4 };
      throw error;
    },
    refreshSession: async () => ({ ok: true }),
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveSession();
  assert.equal(result.state, "verification_failed");
});
```

- [ ] **Step 2: Run the tests and verify they fail because the bootstrap resolver is still missing**

Run:

```bash
npm run test:auth-runtime
```

Expected:

- FAIL with missing export or behavior failures for `createBootstrapSessionResolver`.

- [ ] **Step 3: Implement the bootstrap resolver and make startup/guard/store/logout consumers follow it**

Append this exact export to `src/js/services/authSessionRuntime.js`:

```js
export function createBootstrapSessionResolver({
  hasSessionHint,
  fetchCurrentUser,
  refreshSession,
  classifyFailure,
}) {
  return async function resolveBootstrapSession() {
    if (!hasSessionHint()) {
      return { state: "unauthenticated", user: null };
    }

    try {
      const user = await fetchCurrentUser();
      return { state: "authenticated", user };
    } catch (error) {
      const failure = classifyFailure(error);

      if (failure.kind === "refreshable") {
        await refreshSession();
        const user = await fetchCurrentUser();
        return { state: "authenticated", user };
      }

      if (failure.kind === "transport") {
        return { state: "verification_failed", user: null, error };
      }

      return { state: "non_refreshable", user: null, error };
    }
  };
}
```

Add this exact helper to `src/js/services/authService.js` below `forceReauthenticate()`:

```js
const resolveBootstrapSession = createBootstrapSessionResolver({
  hasSessionHint,
  fetchCurrentUser,
  refreshSession,
  classifyFailure,
});
```

Add these imports to the top of `src/js/services/authService.js`:

```js
import {
  classifyAuthFailure,
  clearAuthArtifacts,
  createBootstrapSessionResolver,
  readStoredSessionSnapshot,
} from "./authSessionRuntime.js";
```

Add this alias directly below those imports in `src/js/services/authService.js`:

```js
const classifyFailure = classifyAuthFailure;
```

Update the export block in `src/js/services/authService.js` to this exact version:

```js
export {
  login,
  fetchCurrentUser,
  logout,
  isAuthenticated,
  getCurrentUser,
  hasSessionHint,
  refreshSession,
  buildAuthRequestHeaders,
  forceReauthenticate,
  resolveBootstrapSession,
};
```

Update the browser global in `src/js/services/authService.js` to include `resolveBootstrapSession`:

```js
window.AuthService = {
  login,
  fetchCurrentUser,
  logout,
  isAuthenticated,
  getCurrentUser,
  hasSessionHint,
  refreshSession,
  buildAuthRequestHeaders,
  forceReauthenticate,
  resolveBootstrapSession,
};
```

Update the auth imports at the top of `src/js/index.js` to this exact block:

```js
import {
  hasSessionHint,
  resolveBootstrapSession,
  forceReauthenticate,
} from "./services/authService.js";
```

Replace `initializeAuthSession()` in `src/js/index.js` with this exact version:

```js
function initializeAuthSession() {
  console.log("Initializing authentication session...");

  const currentPath = window.location.pathname;
  const protectedPages = [
    "/index.html",
    "/management-user.html",
    "/management-booking.html",
    "/management-attendance.html",
    "/profile.html",
    "/calendar.html",
    "/form-user.html",
  ];

  const pageName = currentPath.split("/").pop() || "index.html";
  const isProtectedPage =
    protectedPages.some((page) => page.includes(pageName)) ||
    currentPath === "/";

  if (isProtectedPage) {
    if (!hasSessionHint()) {
      sessionStorage.setItem("redirectAfterLogin", window.location.href);
      window.location.href = "/signin.html";
      return;
    }

    validateUserSession();
    return;
  }

  if (pageName === "signin.html" && hasSessionHint()) {
    validateSigninPageSession();
  }
}
```

Replace `validateUserSession()` in `src/js/index.js` with this exact version:

```js
async function validateUserSession() {
  try {
    const resolution = await resolveBootstrapSession();

    if (resolution.state === "authenticated") {
      if (
        typeof Alpine !== "undefined" &&
        Alpine.store &&
        Alpine.store("auth")
      ) {
        Alpine.store("auth").setUser(resolution.user);
      }
      return;
    }

    if (resolution.state === "verification_failed") {
      const storedUser = getUserFromStorage();
      if (
        storedUser &&
        typeof Alpine !== "undefined" &&
        Alpine.store &&
        Alpine.store("auth")
      ) {
        Alpine.store("auth").setUser(storedUser);
      }
      window.showInlineAlert?.(
        "warning",
        "Session belum bisa diverifikasi karena koneksi atau server bermasalah.",
      );
      return;
    }

    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    await forceReauthenticate();
  } catch (error) {
    console.error("Error validating session:", error);
    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    await forceReauthenticate();
  }
}
```

Add this exact function directly below `validateUserSession()` in `src/js/index.js`:

```js
async function validateSigninPageSession() {
  try {
    const resolution = await resolveBootstrapSession();

    if (resolution.state === "authenticated") {
      if (
        typeof Alpine !== "undefined" &&
        Alpine.store &&
        Alpine.store("auth")
      ) {
        Alpine.store("auth").setUser(resolution.user);
      }
      window.location.href = "/index.html";
    }
  } catch (error) {
    console.warn("Signin session verification skipped:", error.message);
  }
}
```

Update the import block at the top of `src/js/utils/authGuard.js` to this exact line:

```js
import { getCurrentUser, hasSessionHint } from "../services/authService.js";
```

Replace `checkAuthentication()` in `src/js/utils/authGuard.js` with this exact version:

```js
function checkAuthentication() {
  const currentPath = window.location.pathname;
  const currentPage = getCurrentPageFromPath(currentPath);

  console.log("Auth guard checking page:", currentPage);

  if (isProtectedPage(currentPage) && !hasSessionHint()) {
    console.log("No session hint found, redirecting to signin");
    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    window.location.href = "/signin.html";
    return;
  }

  const currentUser = getCurrentUser();
  if (currentUser) {
    updateAlpineAuthStore();
  }

  console.log("Auth guard check completed");
}
```

Update the imports at the top of `src/js/stores/authStore.js` to this exact block:

```js
import {
  getUserFromStorage,
  removeUserFromStorage,
} from "../utils/storageManager.js";
import {
  fetchCurrentUser,
  hasSessionHint,
  resolveBootstrapSession,
} from "../services/authService.js";
```

Replace `loadUserFromStorage()` and `refreshUser()` in `src/js/stores/authStore.js` with these exact versions:

```js
    loadUserFromStorage() {
      try {
        const userData = getUserFromStorage();
        if (userData && hasSessionHint()) {
          this.user = userData;
          this.isAuthenticated = true;
          console.log("User data loaded from storage:", userData);
        } else {
          this.clearAuth();
        }
      } catch (error) {
        console.error("Error loading user from storage:", error);
        this.clearAuth();
      }
    },
```

```js
    async refreshUser() {
      try {
        this.setLoading(true);
        const resolution = await resolveBootstrapSession();

        if (resolution.state === "authenticated") {
          this.setUser(resolution.user);
          return;
        }

        if (resolution.state === "verification_failed") {
          this.setError("Session belum bisa diverifikasi.");
          return;
        }

        this.clearAuth();
      } catch (error) {
        console.error("Error refreshing user:", error);
        this.setError(error.message);
        this.clearAuth();
      } finally {
        this.setLoading(false);
      }
    },
```

Update the import line at the top of `src/js/components/logoutComponent.js` to this exact block:

```js
import { logout, forceReauthenticate } from "../services/authService.js";
```

Replace `forceLogout()` in `src/js/components/logoutComponent.js` with this exact version:

```js
function forceLogout() {
  forceReauthenticate().catch((error) => {
    console.error("Force logout error:", error);
    window.location.href = "/signin.html";
  });
}
```

Update the import line at the top of `src/js/utils/roleBasedAccess.js` to this exact block:

```js
import {
  forceReauthenticate,
  getCurrentUser,
  hasSessionHint,
} from "../services/authService.js";
```

Replace both `if (!isAuthenticated())` checks in `hasPageAccess()` and `canAccessDashboard()` with this exact line:

```js
  if (!hasSessionHint()) {
```

Replace the fallback inside `logout()` in `src/js/utils/roleBasedAccess.js` from:

```js
forceLogout();
```

to this exact line:

```js
await forceReauthenticate();
```

- [ ] **Step 4: Run the runtime tests and build again to verify bootstrap wiring still compiles**

Run:

```bash
npm run test:auth-runtime && npm run build
```

Expected:

- The auth-runtime tests pass.
- Webpack production build succeeds with the new bootstrap and consumer wiring.

- [ ] **Step 5: Commit the bootstrap and consumer integration**

Run:

```bash
git add tests/auth-session-runtime.test.js src/js/services/authSessionRuntime.js src/js/services/authService.js src/js/index.js src/js/stores/authStore.js src/js/utils/authGuard.js src/js/features/signinHandler.js src/js/components/logoutComponent.js src/js/utils/roleBasedAccess.js
git commit -m "feat: wire refresh session bootstrap flow"
```

Expected:

- One commit containing the startup, guard, store, and cleanup integration.

### Task 5: Update ADR-002 and capture the new truthful refresh-session semantics

**Files:**

- Modify: `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md`
- Test: `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md`

- [ ] **Step 1: Add the refresh-session decision details to ADR-002**

Update the `## Decision` section in `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md` so it becomes this exact block:

```md
## Decision

We will make Web FE authentication and session behavior truthful: expired, missing, invalid, and denied states must be presented as such, and the UI must not imply backend validation when only local state is available.

For refresh-session adoption, Web FE will treat cached browser state only as a **session hint**, not as final session truth. Protected-page bootstrap and protected API recovery must use one centralized auth runtime that:

- classifies auth failure as refreshable, non-refreshable, or transport-related,
- runs refresh through a single-flight path,
- replays a protected request at most once after refresh succeeds,
- forces full re-auth when refresh is invalid, revoked, or blocked by inactivity expiry,
- does **not** treat refresh transport failure as proof that the session is invalid.
```

Then append this exact subsection under `## Trade-offs / Consequences`:

```md
### Refresh-session consequences

- Positive: protected-page bootstrap and runtime request recovery now share the same session-truth path.
- Positive: access-token expiry can recover without misleading logout if refresh still succeeds.
- Positive: transport/server problems during refresh can be surfaced honestly instead of being mislabeled as invalid auth.
- Negative: Web FE must maintain a small centralized auth runtime instead of leaving session behavior fully distributed.
- Negative: legacy token/header access paths need to be normalized to prevent partial refresh adoption.
```

- [ ] **Step 2: Verify the ADR now documents session hint vs session truth and single-flight refresh behavior**

Run:

```bash
python - <<'PY'
from pathlib import Path
path = Path("docs/adr/ADR-002-auth-session-and-truthful-access-denial.md")
text = path.read_text()
required = [
    "session hint",
    "centralized auth runtime",
    "single-flight path",
    "replays a protected request at most once",
    "does **not** treat refresh transport failure as proof that the session is invalid",
]
for item in required:
    if item not in text:
        raise SystemExit(f"missing ADR text: {item}")
print("adr refresh-session text verified")
PY
```

Expected:

- Script prints `adr refresh-session text verified`.

- [ ] **Step 3: Run the code verification suite again after the ADR update to capture the final implementation state**

Run:

```bash
npm run test:auth-runtime && npm run build
```

Expected:

- Tests pass.
- Production build succeeds.

- [ ] **Step 4: Record the manual verification boundary explicitly**

Add this exact note to the end of `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md`:

```md
## Manual verification boundary

REQUIRES REPO VERIFICATION for the live backend scenarios below because the repo does not lock an automated fixture path for them:

- access token expired but refreshable while a protected dashboard page is open,
- refresh invalid/revoked,
- inactivity-expired refresh denial,
- offline/server-down during refresh,
- multiple concurrent protected requests that hit refresh at the same time.
```

- [ ] **Step 5: Commit the ADR update and final verification state**

Run:

```bash
git add docs/adr/ADR-002-auth-session-and-truthful-access-denial.md
git commit -m "docs: capture refresh session auth semantics"
```

Expected:

- One commit containing only the ADR update.

## Self-Review

### Spec coverage check

- Centralized auth runtime: covered by Tasks 1-4.
- Single refresh path and no refresh storm: covered by Task 3 tests and executor implementation.
- Truthful bootstrap and protected-page behavior: covered by Task 4.
- Forced cleanup for invalid/revoked/inactivity-expired sessions: covered by Tasks 2-4.
- Transport failure not equal to auth invalid: covered by Task 3 tests and Task 4 bootstrap behavior.
- Docs / ADR update requirement: covered by Task 5.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” text remains.
- Every code-changing step includes concrete code blocks.
- Every run step includes exact commands and expected outcomes.

### Type consistency check

- The plan uses one consistent runtime file name: `src/js/services/authSessionRuntime.js`.
- The auth-aware request helper is consistently named `authRequest` in `src/js/services/authRequest.js`.
- The forced full-login helper is consistently named `forceReauthenticate`.
- The bootstrap resolver is consistently named `resolveBootstrapSession`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-web-fe-refresh-session-adoption.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
