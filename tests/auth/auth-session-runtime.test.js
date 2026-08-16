import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

import {
  classifyAuthFailure,
  createSingleFlightRefresh,
  createProtectedRequestExecutor,
  createBootstrapSessionResolver,
  clearAuthArtifacts,
  readAuthRedirectNotice,
  readStoredSessionSnapshot,
} from "../../src/js/services/authSessionRuntime.js";
import { buildAuthRequestConfig } from "../../src/js/services/authRequest.js";
import {
  fetchCurrentUser,
  forceReauthenticate,
  logout,
  refreshSession,
} from "../../src/js/services/authService.js";
import { initAuthStore } from "../../src/js/stores/authStore.js";

test("classifyAuthFailure marks expired access token as refreshable", () => {
  const result = classifyAuthFailure({
    status: 401,
    data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired" },
  });

  assert.deepEqual(result, {
    kind: "refreshable",
    reason: "access_token_expired",
  });
});

test("classifyAuthFailure marks invalid refresh token as non-refreshable", () => {
  const result = classifyAuthFailure({
    status: 401,
    data: { code: "REFRESH_TOKEN_INVALID", message: "invalid refresh" },
  });

  assert.deepEqual(result, {
    kind: "non_refreshable",
    reason: "refresh_invalid",
  });
});

test("classifyAuthFailure marks invalid bearer token as non-refreshable", () => {
  const result = classifyAuthFailure({
    response: {
      status: 401,
      data: { message: "Invalid token" },
    },
  });

  assert.deepEqual(result, {
    kind: "non_refreshable",
    reason: "refresh_invalid",
  });
});

test("classifyAuthFailure marks missing bearer token as non-refreshable", () => {
  const result = classifyAuthFailure({
    response: {
      status: 401,
      data: { message: "No token provided" },
    },
  });

  assert.deepEqual(result, {
    kind: "non_refreshable",
    reason: "refresh_invalid",
  });
});

test("classifyAuthFailure treats refresh or session expired message without code as non-refreshable", () => {
  const result = classifyAuthFailure({
    status: 401,
    data: { message: "refresh token expired" },
  });

  assert.deepEqual(result, {
    kind: "non_refreshable",
    reason: "refresh_invalid",
  });
});

test("classifyAuthFailure marks semantic access-token expiry as refreshable", () => {
  const result = classifyAuthFailure({
    status: 200,
    data: {
      success: false,
      code: "AUTH_ACCESS_TOKEN_EXPIRED",
      message: "Access token expired",
    },
  });

  assert.deepEqual(result, {
    kind: "refreshable",
    reason: "access_token_expired",
  });
});

test("classifyAuthFailure marks semantic missing session response as non-refreshable", () => {
  const result = classifyAuthFailure({
    status: 200,
    data: { success: false, message: "Tidak ada sesi aktif" },
  });

  assert.deepEqual(result, {
    kind: "non_refreshable",
    reason: "refresh_invalid",
  });
});

test("classifyAuthFailure marks network failures as transport", () => {
  const result = classifyAuthFailure({
    request: { readyState: 4 },
    message: "Network Error",
  });

  assert.deepEqual(result, {
    kind: "transport",
    reason: "network_error",
  });
});

test("createSingleFlightRefresh shares one in-flight refresh promise", async () => {
  let calls = 0;

  const refresh = createSingleFlightRefresh(async () => {
    calls += 1;
    return { ok: true };
  });

  const [first, second] = await Promise.all([refresh(), refresh()]);

  assert.equal(calls, 1);
  assert.deepEqual(first, { ok: true });
  assert.deepEqual(second, { ok: true });
});

test("createProtectedRequestExecutor replays one protected request after refresh succeeds", async () => {
  const calls = [];
  let attempts = 0;
  const expiredError = {
    response: {
      status: 401,
      data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired access token" },
    },
  };

  const runProtectedRequest = createProtectedRequestExecutor({
    executeRefresh: async () => {
      calls.push("refresh");
      return { ok: true };
    },
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async () => {
      calls.push("forced-reauth");
    },
  });

  const result = await runProtectedRequest(async ({ replayed }) => {
    attempts += 1;
    calls.push(`request-${attempts}-${replayed ? "replayed" : "initial"}`);

    if (!replayed) {
      throw expiredError;
    }

    return { ok: true };
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(attempts, 2);
  assert.deepEqual(calls, [
    "request-1-initial",
    "refresh",
    "request-2-replayed",
  ]);
});

test("createProtectedRequestExecutor calls forced reauth when refresh becomes non-refreshable", async () => {
  const calls = [];
  const expiredError = {
    response: {
      status: 401,
      data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired access token" },
    },
  };
  const invalidRefreshError = {
    response: {
      status: 401,
      data: { code: "REFRESH_TOKEN_INVALID", message: "invalid refresh token" },
    },
  };

  const runProtectedRequest = createProtectedRequestExecutor({
    executeRefresh: async () => {
      calls.push("refresh");
      throw invalidRefreshError;
    },
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async () => {
      calls.push("forced-reauth");
    },
  });

  await assert.rejects(
    () =>
      runProtectedRequest(async ({ replayed }) => {
        calls.push(`request-${replayed ? "replayed" : "initial"}`);
        throw expiredError;
      }),
    (error) => {
      assert.equal(error, invalidRefreshError);
      return true;
    },
  );

  assert.deepEqual(calls, ["request-initial", "refresh", "forced-reauth"]);
});

test("createProtectedRequestExecutor calls forced reauth when replay is non-refreshable", async () => {
  const calls = [];
  const expiredError = {
    response: {
      status: 401,
      data: {
        code: "AUTH_ACCESS_TOKEN_EXPIRED",
        message: "expired access token",
      },
    },
  };
  const revokedError = {
    response: {
      status: 401,
      data: {
        code: "AUTH_REFRESH_TOKEN_REVOKED",
        message: "Refresh session revoked",
      },
    },
  };

  const runProtectedRequest = createProtectedRequestExecutor({
    executeRefresh: async () => {
      calls.push("refresh");
      return { ok: true };
    },
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async (_error, options) => {
      calls.push({ type: "forced-reauth", notice: options.redirectNotice });
    },
  });

  await assert.rejects(
    () =>
      runProtectedRequest(async ({ replayed }) => {
        calls.push(`request-${replayed ? "replayed" : "initial"}`);
        throw replayed ? revokedError : expiredError;
      }),
    (error) => {
      assert.equal(error, revokedError);
      return true;
    },
  );

  assert.deepEqual(calls, [
    "request-initial",
    "refresh",
    "request-replayed",
    {
      type: "forced-reauth",
      notice: {
        type: "warning",
        title: "Session berakhir",
        message: "Sesi Anda tidak lagi valid. Silakan login lagi.",
        timeoutMs: 6000,
        reason: "refresh_invalid",
      },
    },
  ]);
});

test("createProtectedRequestExecutor calls forced reauth on direct non-refreshable protected response", async () => {
  const calls = [];
  const inactiveError = {
    response: {
      status: 401,
      data: {
        code: "AUTH_SESSION_INACTIVE",
        message: "Sesi sudah tidak aktif",
      },
    },
  };

  const runProtectedRequest = createProtectedRequestExecutor({
    executeRefresh: async () => {
      calls.push("refresh");
    },
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async (_error, options) => {
      calls.push({ type: "forced-reauth", notice: options.redirectNotice });
    },
  });

  await assert.rejects(
    () =>
      runProtectedRequest(async ({ replayed }) => {
        calls.push(`request-${replayed ? "replayed" : "initial"}`);
        throw inactiveError;
      }),
    (error) => {
      assert.equal(error, inactiveError);
      return true;
    },
  );

  assert.deepEqual(calls, [
    "request-initial",
    {
      type: "forced-reauth",
      notice: {
        type: "warning",
        title: "Session berakhir",
        message: "Sesi tidak aktif lebih dari 48 jam. Silakan login lagi.",
        timeoutMs: 6000,
        reason: "inactivity_expired",
      },
    },
  ]);
});

test("createProtectedRequestExecutor does not force reauth on transport refresh failures", async () => {
  const calls = [];
  const expiredError = {
    response: {
      status: 401,
      data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired access token" },
    },
  };
  const transportRefreshError = {
    request: { readyState: 4 },
    message: "Network Error",
  };

  const runProtectedRequest = createProtectedRequestExecutor({
    executeRefresh: async () => {
      calls.push("refresh");
      throw transportRefreshError;
    },
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async () => {
      calls.push("forced-reauth");
    },
  });

  await assert.rejects(
    () =>
      runProtectedRequest(async ({ replayed }) => {
        calls.push(`request-${replayed ? "replayed" : "initial"}`);
        throw expiredError;
      }),
    (error) => {
      assert.equal(error, transportRefreshError);
      return true;
    },
  );

  assert.deepEqual(calls, ["request-initial", "refresh"]);
});

test("createBootstrapSessionResolver returns unauthenticated without session hint", async () => {
  const calls = [];
  const resolveBootstrapSession = createBootstrapSessionResolver({
    hasSessionHint: () => false,
    fetchCurrentUser: async () => {
      calls.push("fetch");
      return { id: 1 };
    },
    refreshSession: async () => {
      calls.push("refresh");
    },
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveBootstrapSession();

  assert.deepEqual(result, { state: "unauthenticated", user: null });
  assert.deepEqual(calls, []);
});

test("createBootstrapSessionResolver refreshes and re-fetches on refreshable failure", async () => {
  let fetchAttempts = 0;
  const expiredError = {
    response: {
      status: 401,
      data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired access token" },
    },
  };

  const resolveBootstrapSession = createBootstrapSessionResolver({
    hasSessionHint: () => true,
    fetchCurrentUser: async () => {
      fetchAttempts += 1;
      if (fetchAttempts === 1) {
        throw expiredError;
      }
      return { id: 3, role_name: "Admin" };
    },
    refreshSession: async () => ({ success: true }),
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveBootstrapSession();

  assert.deepEqual(result, {
    state: "authenticated",
    user: { id: 3, role_name: "Admin" },
  });
  assert.equal(fetchAttempts, 2);
});

test("createBootstrapSessionResolver returns verification_failed on transport error", async () => {
  const transportError = {
    request: { readyState: 4 },
    message: "Network Error",
  };

  const resolveBootstrapSession = createBootstrapSessionResolver({
    hasSessionHint: () => true,
    fetchCurrentUser: async () => {
      throw transportError;
    },
    refreshSession: async () => ({ success: true }),
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveBootstrapSession();

  assert.equal(result.state, "verification_failed");
  assert.equal(result.user, null);
  assert.equal(result.error, transportError);
});

test("createBootstrapSessionResolver treats unclassified auth shape failures as verification_failed", async () => {
  const semanticError = new Error("Gagal mengambil data pengguna");

  const resolveBootstrapSession = createBootstrapSessionResolver({
    hasSessionHint: () => true,
    fetchCurrentUser: async () => {
      throw semanticError;
    },
    refreshSession: async () => ({ success: true }),
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveBootstrapSession();

  assert.equal(result.state, "verification_failed");
  assert.equal(result.user, null);
  assert.equal(result.error, semanticError);
});

test("createBootstrapSessionResolver treats unclassified refresh failures as verification_failed", async () => {
  let fetchAttempts = 0;
  const expiredError = {
    response: {
      status: 401,
      data: {
        code: "AUTH_ACCESS_TOKEN_EXPIRED",
        message: "expired access token",
      },
    },
  };
  const semanticRefreshError = new Error("Refresh session tidak valid");

  const resolveBootstrapSession = createBootstrapSessionResolver({
    hasSessionHint: () => true,
    fetchCurrentUser: async () => {
      fetchAttempts += 1;
      throw expiredError;
    },
    refreshSession: async () => {
      throw semanticRefreshError;
    },
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveBootstrapSession();

  assert.equal(result.state, "verification_failed");
  assert.equal(result.user, null);
  assert.equal(result.error, semanticRefreshError);
  assert.equal(fetchAttempts, 1);
});

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

function createCleanupFailingStorage(seed = {}) {
  return {
    ...createMemoryStorage(seed),
    removeItem() {
      throw new Error("storage cleanup blocked");
    },
  };
}

test("auth store initialization preserves signin redirect session artifacts", () => {
  const originalAlpine = globalThis.Alpine;
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;

  const localStorageRef = createMemoryStorage({ authToken: "" });
  const sessionStorageRef = createMemoryStorage({
    redirectAfterLogin: "/reports.html#summary",
    authRedirectNotice: JSON.stringify({ message: "Silakan login lagi" }),
    sessionVerificationState: "pending",
  });
  const stores = {};

  globalThis.Alpine = {
    store(name, value) {
      if (value !== undefined) {
        stores[name] = value;
      }

      return stores[name];
    },
  };
  globalThis.localStorage = localStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
  };

  try {
    initAuthStore();

    assert.equal(stores.auth.user, null);
    assert.equal(stores.auth.isAuthenticated, false);
    assert.equal(stores.auth.sessionState, "unauthenticated");
    assert.equal(
      sessionStorageRef.getItem("redirectAfterLogin"),
      "/reports.html#summary",
    );
    assert.equal(
      sessionStorageRef.getItem("authRedirectNotice"),
      JSON.stringify({ message: "Silakan login lagi" }),
    );
    assert.equal(
      sessionStorageRef.getItem("sessionVerificationState"),
      "pending",
    );
  } finally {
    globalThis.Alpine = originalAlpine;
    globalThis.localStorage = originalLocalStorage;
    globalThis.window = originalWindow;
  }
});

test("auth store keeps token-only session hint for backend bootstrap", () => {
  const originalAlpine = globalThis.Alpine;
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;

  const localStorageRef = createMemoryStorage({ authToken: "token-only" });
  const sessionStorageRef = createMemoryStorage();
  const stores = {};

  globalThis.Alpine = {
    store(name, value) {
      if (value !== undefined) {
        stores[name] = value;
      }

      return stores[name];
    },
  };
  globalThis.localStorage = localStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
  };

  try {
    initAuthStore();

    assert.equal(stores.auth.user, null);
    assert.equal(stores.auth.isAuthenticated, false);
    assert.equal(stores.auth.sessionState, "unauthenticated");
    assert.equal(localStorageRef.getItem("authToken"), "token-only");
  } finally {
    globalThis.Alpine = originalAlpine;
    globalThis.localStorage = originalLocalStorage;
    globalThis.window = originalWindow;
  }
});

test("auth store surfaces storage cleanup failures", () => {
  const originalAlpine = globalThis.Alpine;
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;

  const localStorageRef = createCleanupFailingStorage({
    userData: JSON.stringify({ id: 1 }),
  });
  const sessionStorageRef = createMemoryStorage();
  const stores = {};

  globalThis.Alpine = {
    store(name, value) {
      if (value !== undefined) {
        stores[name] = value;
      }

      return stores[name];
    },
  };
  globalThis.localStorage = localStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
  };

  try {
    initAuthStore();

    assert.equal(stores.auth.clearAuth(), false);
    assert.equal(stores.auth.user, null);
    assert.equal(stores.auth.isAuthenticated, false);
    assert.equal(stores.auth.sessionState, "unauthenticated");
    assert.equal(stores.auth.error, "Data sesi di browser gagal dibersihkan.");
  } finally {
    globalThis.Alpine = originalAlpine;
    globalThis.localStorage = originalLocalStorage;
    globalThis.window = originalWindow;
  }
});

test("auth store refreshUser forces reauth with canonical inactivity notice", async () => {
  const originalAlpine = globalThis.Alpine;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalWindow = globalThis.window;
  const originalGet = axios.get;

  const localStorageRef = createMemoryStorage({ authToken: "session-hint" });
  const sessionStorageRef = createMemoryStorage();
  const stores = {};

  globalThis.Alpine = {
    store(name, value) {
      if (value !== undefined) {
        stores[name] = value;
      }

      return stores[name];
    },
  };
  globalThis.localStorage = localStorageRef;
  globalThis.sessionStorage = sessionStorageRef;
  globalThis.window = {
    Alpine: globalThis.Alpine,
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: {
      href: "/profile.html",
      pathname: "/profile.html",
      search: "",
    },
  };
  axios.get = async () => {
    const error = new Error("Sesi sudah tidak aktif");
    error.response = {
      status: 401,
      data: {
        code: "AUTH_SESSION_INACTIVE",
        message: "Sesi sudah tidak aktif",
      },
    };
    throw error;
  };

  try {
    initAuthStore();

    await stores.auth.refreshUser();

    assert.equal(stores.auth.user, null);
    assert.equal(stores.auth.isAuthenticated, false);
    assert.equal(stores.auth.sessionState, "unauthenticated");
    assert.equal(globalThis.window.location.href, "/signin.html");
    assert.deepEqual(readAuthRedirectNotice(sessionStorageRef), {
      type: "warning",
      title: "Session berakhir",
      message: "Sesi tidak aktif lebih dari 48 jam. Silakan login lagi.",
      timeoutMs: 6000,
      reason: "inactivity_expired",
    });
  } finally {
    globalThis.Alpine = originalAlpine;
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
    globalThis.window = originalWindow;
    axios.get = originalGet;
  }
});

test("readStoredSessionSnapshot prefers canonical userData/authToken over legacy values", () => {
  const storage = createMemoryStorage({
    userData: JSON.stringify({ id: 1, role: "admin" }),
    authToken: "canonical-token",
    user: JSON.stringify({ id: 2, token: "legacy-user-token" }),
    auth_token: "legacy-auth-token",
    currentUserData: JSON.stringify({ id: 3, token: "legacy-current-token" }),
  });

  const snapshot = readStoredSessionSnapshot(storage);

  assert.deepEqual(snapshot, {
    user: { id: 1, role: "admin" },
    token: "canonical-token",
  });
});

test("readStoredSessionSnapshot falls back to legacy user token and auth_token", () => {
  const userStorage = createMemoryStorage({
    user: JSON.stringify({ id: 9, token: "legacy-user-token" }),
  });

  const userSnapshot = readStoredSessionSnapshot(userStorage);

  assert.deepEqual(userSnapshot, {
    user: { id: 9, token: "legacy-user-token" },
    token: "legacy-user-token",
  });

  const tokenStorage = createMemoryStorage({
    auth_token: "legacy-auth-token",
  });

  const tokenSnapshot = readStoredSessionSnapshot(tokenStorage);

  assert.deepEqual(tokenSnapshot, {
    user: null,
    token: "legacy-auth-token",
  });
});

test("buildAuthRequestConfig keeps safe caller headers and strips bearer credentials", () => {
  const config = buildAuthRequestConfig(
    {
      url: "/protected",
      method: "get",
      headers: {
        "X-Trace-Id": "trace-123",
        Authorization: "Bearer stale-token",
      },
    },
    () => ({ Authorization: "Bearer fresh-token" }),
  );

  assert.equal(config.withCredentials, true);
  assert.equal(config.headers["X-Client-Type"], "web");
  assert.equal(config.headers["X-Trace-Id"], "trace-123");
  assert.equal(config.headers.Authorization, undefined);
});

test("buildAuthRequestConfig keeps protected replays cookie-based", () => {
  const firstAttempt = buildAuthRequestConfig(
    {
      headers: {
        Authorization: "Bearer stale-token",
      },
    },
    () => ({ Authorization: "Bearer first-token" }),
  );

  const replayAttempt = buildAuthRequestConfig(
    {
      headers: {
        Authorization: "Bearer stale-token",
      },
    },
    () => ({ Authorization: "Bearer second-token" }),
  );

  assert.equal(firstAttempt.withCredentials, true);
  assert.equal(replayAttempt.withCredentials, true);
  assert.equal(firstAttempt.headers.Authorization, undefined);
  assert.equal(replayAttempt.headers.Authorization, undefined);
});

test("clearAuthArtifacts removes canonical and legacy auth keys from localStorage and sessionStorage", () => {
  const localStorageRef = createMemoryStorage({
    userData: "x",
    user: "x",
    currentUserData: "x",
    authToken: "x",
    auth_token: "x",
    rememberMe: "x",
    rememberedEmail: "x",
    redirectAfterLogin: "x",
    untouched: "keep",
  });
  const sessionStorageRef = createMemoryStorage({
    redirectAfterLogin: "x",
    sessionVerificationState: "x",
    untouchedSession: "keep",
  });

  clearAuthArtifacts(localStorageRef, sessionStorageRef);

  assert.deepEqual(localStorageRef.dump(), { untouched: "keep" });
  assert.deepEqual(sessionStorageRef.dump(), { untouchedSession: "keep" });
});

test("clearAuthArtifacts preserves redirectAfterLogin in sessionStorage when explicitly requested", () => {
  const localStorageRef = createMemoryStorage({
    userData: "x",
    authToken: "x",
    redirectAfterLogin: "https://app.example/protected",
    untouched: "keep",
  });
  const sessionStorageRef = createMemoryStorage({
    redirectAfterLogin: "https://app.example/stale",
    sessionVerificationState: "x",
    untouchedSession: "keep",
  });

  clearAuthArtifacts(localStorageRef, sessionStorageRef, {
    preserveRedirectAfterLogin: "https://app.example/protected?tab=summary",
  });

  assert.deepEqual(localStorageRef.dump(), { untouched: "keep" });
  assert.deepEqual(sessionStorageRef.dump(), {
    redirectAfterLogin: "https://app.example/protected?tab=summary",
    untouchedSession: "keep",
  });
});

test("forceReauthenticate preserves redirect and avoids second storage cleanup hop", async () => {
  const localStorageRef = createMemoryStorage({
    userData: "x",
    authToken: "x",
    user: "x",
    currentUserData: "x",
    auth_token: "x",
    rememberMe: "x",
    rememberedEmail: "x",
    redirectAfterLogin: "https://app.example/protected",
    untouched: "keep",
  });
  const sessionStorageRef = createMemoryStorage({
    redirectAfterLogin: "https://app.example/stale",
    sessionVerificationState: "x",
    untouchedSession: "keep",
  });

  const authStore = {
    user: { id: 1 },
    isAuthenticated: true,
    sessionState: "authenticated",
    error: "old-error",
    isLoading: true,
  };

  let clearAuthCalls = 0;
  authStore.clearAuth = () => {
    clearAuthCalls += 1;
  };

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = localStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    Alpine: {
      store: () => authStore,
    },
    location: { href: "/dashboard.html" },
  };

  try {
    await forceReauthenticate({
      preserveRedirectAfterLogin: "https://app.example/protected?tab=summary",
    });

    assert.equal(clearAuthCalls, 0);
    assert.equal(authStore.user, null);
    assert.equal(authStore.isAuthenticated, false);
    assert.equal(authStore.sessionState, "unauthenticated");
    assert.equal(authStore.error, null);
    assert.equal(authStore.isLoading, false);

    assert.deepEqual(localStorageRef.dump(), { untouched: "keep" });
    assert.deepEqual(sessionStorageRef.dump(), {
      redirectAfterLogin: "https://app.example/protected?tab=summary",
      untouchedSession: "keep",
    });
    assert.equal(globalThis.window.location.href, "/signin.html");
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("forceReauthenticate persists redirect notice when cross-tab broadcast fails", async () => {
  const localStorageRef = createMemoryStorage({
    userData: "x",
    authToken: "x",
  });
  const sessionStorageRef = createMemoryStorage();
  const notice = {
    type: "warning",
    title: "Session berakhir",
    message: "Sesi Anda tidak lagi valid. Silakan login lagi.",
    timeoutMs: 6000,
    reason: "refresh_invalid",
  };

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = localStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    BroadcastChannel: class FailingBroadcastChannel {
      constructor() {
        throw new Error("broadcast unavailable");
      }
    },
    Alpine: {
      store: () => null,
    },
    location: { href: "/profile.html", pathname: "/profile.html", search: "" },
  };

  try {
    await forceReauthenticate({ redirectNotice: notice });

    assert.deepEqual(readAuthRedirectNotice(sessionStorageRef), notice);
    assert.equal(globalThis.window.location.href, "/signin.html");
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("forceReauthenticate redirects when redirect notice storage fails", async () => {
  const localStorageRef = createMemoryStorage({
    userData: "x",
    authToken: "x",
  });
  const sessionStorageRef = {
    ...createMemoryStorage(),
    setItem() {
      throw new Error("notice storage blocked");
    },
  };
  const authStore = {
    user: { id: 1 },
    isAuthenticated: true,
    sessionState: "authenticated",
    error: "old-error",
    isLoading: true,
  };

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = localStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    Alpine: {
      store: () => authStore,
    },
    location: { href: "/signin.html", pathname: "/signin.html", search: "" },
  };

  try {
    await forceReauthenticate({
      redirectNotice: {
        type: "warning",
        title: "Session berakhir",
        message: "Sesi Anda tidak lagi valid. Silakan login lagi.",
        timeoutMs: 6000,
        reason: "refresh_invalid",
      },
    });

    assert.equal(authStore.user, null);
    assert.equal(authStore.isAuthenticated, false);
    assert.equal(authStore.sessionState, "unauthenticated");
    assert.equal(authStore.error, null);
    assert.equal(authStore.isLoading, false);
    assert.equal(globalThis.window.location.href, "/signin.html");
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("forceReauthenticate surfaces storage cleanup failures in auth store", async () => {
  const localStorageRef = createCleanupFailingStorage({
    userData: "x",
    authToken: "x",
  });
  const sessionStorageRef = createMemoryStorage();
  const authStore = {
    user: { id: 1 },
    isAuthenticated: true,
    sessionState: "authenticated",
    error: null,
    isLoading: true,
  };

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = localStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    Alpine: {
      store: () => authStore,
    },
    location: { href: "/profile.html", pathname: "/profile.html", search: "" },
  };

  try {
    const storageCleared = await forceReauthenticate();

    assert.equal(storageCleared, false);
    assert.equal(authStore.user, null);
    assert.equal(authStore.isAuthenticated, false);
    assert.equal(authStore.sessionState, "unauthenticated");
    assert.equal(authStore.error, "Data sesi di browser gagal dibersihkan.");
    assert.equal(authStore.isLoading, false);
    assert.equal(globalThis.window.location.href, "/signin.html");
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("fetchCurrentUser rejects raw 200 payload without semantic auth success", async () => {
  const originalGet = axios.get;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  const localStorageRef = createMemoryStorage();
  const sessionStorageRef = createMemoryStorage();

  globalThis.localStorage = localStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: { href: "/profile.html", origin: "http://localhost" },
  };

  axios.get = async () => ({
    status: 200,
    data: {
      message: "Tidak ada sesi aktif",
    },
  });

  try {
    await assert.rejects(() => fetchCurrentUser(), /Tidak ada sesi aktif/);
  } finally {
    axios.get = originalGet;
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("refreshSession rejects raw 200 payload without semantic refresh success", async () => {
  const originalPost = axios.post;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  const localStorageRef = createMemoryStorage();
  const sessionStorageRef = createMemoryStorage();

  globalThis.localStorage = localStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: { href: "/profile.html", origin: "http://localhost" },
  };

  axios.post = async () => ({
    status: 200,
    data: {
      message: "Refresh session tidak valid",
    },
  });

  try {
    await assert.rejects(() => refreshSession(), /Refresh session tidak valid/);
  } finally {
    axios.post = originalPost;
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("logout reports frontend cleanup failure", async () => {
  const originalPost = axios.post;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  const localStorageRef = createCleanupFailingStorage({
    userData: "x",
    authToken: "x",
  });
  const sessionStorageRef = createMemoryStorage();

  axios.post = async () => ({ status: 200, data: { success: true } });
  globalThis.localStorage = localStorageRef;
  globalThis.document = { cookie: "" };
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: { hostname: "localhost" },
  };

  try {
    assert.equal(await logout(), false);
  } finally {
    axios.post = originalPost;
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("logout clears local auth state before backend logout resolves", async () => {
  const originalPost = axios.post;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  const localStorageRef = createMemoryStorage({
    userData: JSON.stringify({ id: 3, role_name: "Employee" }),
    authToken: "employee-token",
  });
  const sessionStorageRef = createMemoryStorage();

  let releaseBackendLogout;
  const backendLogoutPending = new Promise((resolve) => {
    releaseBackendLogout = resolve;
  });

  axios.post = async () => {
    await backendLogoutPending;
    return { status: 200, data: { success: true } };
  };
  globalThis.localStorage = localStorageRef;
  globalThis.document = { cookie: "stubRole=Employee; authToken=employee-token" };
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: { hostname: "localhost" },
  };

  try {
    const logoutPromise = logout();

    assert.equal(localStorageRef.getItem("userData"), null);
    assert.equal(localStorageRef.getItem("authToken"), null);

    releaseBackendLogout();
    assert.equal(await logoutPromise, true);
  } finally {
    axios.post = originalPost;
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("logout component redirects and clears runtime state when cleanup fails", async () => {
  const originalPost = axios.post;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;
  const originalAlpine = globalThis.Alpine;

  const localStorageRef = createCleanupFailingStorage({
    userData: "x",
    authToken: "x",
  });
  const sessionStorageRef = createMemoryStorage();
  const authStore = {
    user: { id: 1 },
    isAuthenticated: true,
    sessionState: "authenticated",
    error: null,
    isLoading: true,
  };

  axios.post = async () => ({ status: 200, data: { success: true } });
  globalThis.localStorage = localStorageRef;
  globalThis.Alpine = {
    store: () => authStore,
  };
  globalThis.document = {
    readyState: "complete",
    cookie: "",
    body: {
      style: {},
      insertAdjacentHTML() {},
    },
    addEventListener() {},
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
  };
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    Alpine: globalThis.Alpine,
    location: {
      href: "/profile.html",
      pathname: "/profile.html",
      search: "",
      hostname: "localhost",
    },
    showDangerAlert() {},
  };

  try {
    const moduleUrl = new URL(
      `../../src/js/components/logoutComponent.js?test=${Date.now()}`,
      import.meta.url,
    );
    const { logoutUser } = await import(moduleUrl.href);

    await logoutUser(true);

    assert.equal(authStore.user, null);
    assert.equal(authStore.isAuthenticated, false);
    assert.equal(authStore.sessionState, "unauthenticated");
    assert.equal(authStore.error, "Data sesi di browser gagal dibersihkan.");
    assert.equal(authStore.isLoading, false);
    assert.equal(globalThis.window.location.href, "/signin.html");
    assert.equal(
      readAuthRedirectNotice(sessionStorageRef).reason,
      "storage_cleanup_failed",
    );
  } finally {
    axios.post = originalPost;
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
    globalThis.Alpine = originalAlpine;
  }
});

test("redirectAfterLogin falls back to fresh login user when bootstrap session is non-refreshable", async () => {
  const originalGet = axios.get;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalDocument = globalThis.document;

  const localStorageRef = createMemoryStorage({ authToken: "fresh-token" });
  const sessionStorageRef = createMemoryStorage();
  const redirectCalls = [];

  globalThis.localStorage = localStorageRef;
  globalThis.sessionStorage = sessionStorageRef;
  globalThis.document = {
    readyState: "loading",
    addEventListener() {},
    querySelector() {
      return null;
    },
    getElementById() {
      return null;
    },
  };
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: { href: "/signin.html", origin: "http://localhost" },
    RoleBasedAccess: {
      redirectBasedOnRole(roleName) {
        redirectCalls.push(roleName);
        globalThis.window.location.href = "/index.html";
      },
      hasPageAccess() {
        return true;
      },
    },
  };

  axios.get = async () => {
    const error = new Error("AUTH_SESSION_INACTIVE");
    error.response = {
      status: 401,
      data: {
        code: "AUTH_SESSION_INACTIVE",
        message: "Sesi sudah tidak aktif",
      },
    };
    throw error;
  };

  try {
    const moduleUrl = new URL(
      `../../src/js/features/signinHandler.js?test=${Date.now()}`,
      import.meta.url,
    );
    const { default: SigninHandler } = await import(moduleUrl.href);

    await SigninHandler.redirectAfterLogin({
      loginJustSucceeded: true,
      loginUser: { id: 7, role_name: "Admin" },
    });

    assert.deepEqual(redirectCalls, ["Admin"]);
    assert.equal(globalThis.window.location.href, "/index.html");
  } finally {
    axios.get = originalGet;
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
    globalThis.document = originalDocument;
  }
});

test("redirectAfterLogin ignores stale profile redirect after non-refreshable bootstrap for Management", async () => {
  const originalGet = axios.get;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalDocument = globalThis.document;

  const localStorageRef = createMemoryStorage({ authToken: "fresh-token" });
  const sessionStorageRef = createMemoryStorage({
    redirectAfterLogin: "/profile.html?from=stale-login",
  });
  const redirectCalls = [];

  globalThis.localStorage = localStorageRef;
  globalThis.sessionStorage = sessionStorageRef;
  globalThis.document = {
    readyState: "loading",
    addEventListener() {},
    querySelector() {
      return null;
    },
    getElementById() {
      return null;
    },
  };
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: { href: "/signin.html", origin: "http://localhost" },
    RoleBasedAccess: {
      hasPageAccessForUser() {
        return true;
      },
      redirectBasedOnRole(roleName) {
        redirectCalls.push(roleName);
        globalThis.window.location.href = "/index.html";
      },
    },
  };

  axios.get = async () => {
    const error = new Error("AUTH_SESSION_INACTIVE");
    error.response = {
      status: 401,
      data: {
        code: "AUTH_SESSION_INACTIVE",
        message: "Sesi sudah tidak aktif",
      },
    };
    throw error;
  };

  try {
    const moduleUrl = new URL(
      `../../src/js/features/signinHandler.js?test=${Date.now()}`,
      import.meta.url,
    );
    const { default: SigninHandler } = await import(moduleUrl.href);

    await SigninHandler.redirectAfterLogin({
      loginJustSucceeded: true,
      loginUser: { id: 11, role_name: "Management" },
    });

    assert.deepEqual(redirectCalls, ["Management"]);
    assert.equal(globalThis.window.location.href, "/index.html");
    assert.equal(globalThis.sessionStorage.getItem("redirectAfterLogin"), null);
  } finally {
    axios.get = originalGet;
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
    globalThis.document = originalDocument;
  }
});
