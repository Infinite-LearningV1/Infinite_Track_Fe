import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyAuthFailure,
  createProtectedRequestExecutor,
  createBootstrapSessionResolver,
  clearAuthArtifacts,
  readAuthRedirectNotice,
  readStoredSessionSnapshot,
} from "../src/js/services/authSessionRuntime.js";
import { buildAuthRequestConfig } from "../src/js/services/authRequest.js";
import { forceReauthenticate } from "../src/js/services/authService.js";

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

test("createProtectedRequestExecutor triggers forced reauth on refreshable auth failure without replay", async () => {
  const calls = [];
  const expiredError = {
    response: {
      status: 401,
      data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired access token" },
    },
  };

  const runProtectedRequest = createProtectedRequestExecutor({
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
      assert.equal(error, expiredError);
      return true;
    },
  );

  assert.deepEqual(calls, ["request-initial", "forced-reauth"]);
});

test("createProtectedRequestExecutor triggers forced reauth on non-refreshable auth failure", async () => {
  const calls = [];
  const unauthorizedError = {
    response: {
      status: 401,
      data: { code: "REFRESH_TOKEN_INVALID", message: "invalid refresh token" },
    },
  };

  const runProtectedRequest = createProtectedRequestExecutor({
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async () => {
      calls.push("forced-reauth");
    },
  });

  await assert.rejects(
    () =>
      runProtectedRequest(async ({ replayed }) => {
        calls.push(`request-${replayed ? "replayed" : "initial"}`);
        throw unauthorizedError;
      }),
    (error) => {
      assert.equal(error, unauthorizedError);
      return true;
    },
  );

  assert.deepEqual(calls, ["request-initial", "forced-reauth"]);
});

test("createProtectedRequestExecutor does not force reauth on transport failures", async () => {
  const calls = [];
  const transportError = {
    request: { readyState: 4 },
    message: "Network Error",
  };

  const runProtectedRequest = createProtectedRequestExecutor({
    classifyFailure: classifyAuthFailure,
    onForcedReauth: async () => {
      calls.push("forced-reauth");
    },
  });

  await assert.rejects(
    () =>
      runProtectedRequest(async ({ replayed }) => {
        calls.push(`request-${replayed ? "replayed" : "initial"}`);
        throw transportError;
      }),
    (error) => {
      assert.equal(error, transportError);
      return true;
    },
  );

  assert.deepEqual(calls, ["request-initial"]);
});

test("createBootstrapSessionResolver returns unauthenticated without session hint", async () => {
  const calls = [];
  const resolveBootstrapSession = createBootstrapSessionResolver({
    hasSessionHint: () => false,
    fetchCurrentUser: async () => {
      calls.push("fetch");
      return { id: 1 };
    },
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveBootstrapSession();

  assert.deepEqual(result, { state: "unauthenticated", user: null });
  assert.deepEqual(calls, []);
});

test("createBootstrapSessionResolver returns non_refreshable on auth failure", async () => {
  const expiredError = {
    response: {
      status: 401,
      data: { code: "ACCESS_TOKEN_EXPIRED", message: "expired access token" },
    },
  };

  const resolveBootstrapSession = createBootstrapSessionResolver({
    hasSessionHint: () => true,
    fetchCurrentUser: async () => {
      throw expiredError;
    },
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveBootstrapSession();

  assert.deepEqual(result, {
    state: "non_refreshable",
    user: null,
    error: expiredError,
  });
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
    classifyFailure: classifyAuthFailure,
  });

  const result = await resolveBootstrapSession();

  assert.equal(result.state, "verification_failed");
  assert.equal(result.user, null);
  assert.equal(result.error, transportError);
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

test("buildAuthRequestConfig keeps caller headers but canonical auth token wins", () => {
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
  assert.equal(config.headers["X-Client-Type"], "web-fe");
  assert.equal(config.headers["X-Trace-Id"], "trace-123");
  assert.equal(config.headers.Authorization, "Bearer fresh-token");
});

test("buildAuthRequestConfig recomputes canonical auth header per attempt", () => {
  let token = "first-token";

  const firstAttempt = buildAuthRequestConfig(
    {
      headers: {
        Authorization: "Bearer stale-token",
      },
    },
    () => ({ Authorization: `Bearer ${token}` }),
  );

  token = "second-token";

  const replayAttempt = buildAuthRequestConfig(
    {
      headers: {
        Authorization: "Bearer stale-token",
      },
    },
    () => ({ Authorization: `Bearer ${token}` }),
  );

  assert.equal(firstAttempt.headers.Authorization, "Bearer first-token");
  assert.equal(replayAttempt.headers.Authorization, "Bearer second-token");
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

test("forceReauthenticate persists redirect notice when provided", async () => {
  const localStorageRef = createMemoryStorage({
    userData: "x",
    authToken: "x",
  });
  const sessionStorageRef = createMemoryStorage({
    untouchedSession: "keep",
  });

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
    location: { href: "/dashboard.html" },
  };

  try {
    await forceReauthenticate({
      preserveRedirectAfterLogin: "https://app.example/protected",
      redirectNotice: {
        type: "warning",
        title: "Sesi Berakhir",
        message: "Silakan login kembali.",
      },
    });

    assert.deepEqual(readAuthRedirectNotice(sessionStorageRef), {
      type: "warning",
      title: "Sesi Berakhir",
      message: "Silakan login kembali.",
    });
    assert.equal(globalThis.window.location.href, "/signin.html");
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});
