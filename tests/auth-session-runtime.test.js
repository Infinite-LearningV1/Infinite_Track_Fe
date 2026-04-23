import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyAuthFailure,
  createSingleFlightRefresh,
  createProtectedRequestExecutor,
  createBootstrapSessionResolver,
  clearAuthArtifacts,
  readStoredSessionSnapshot,
} from "../src/js/services/authSessionRuntime.js";
import { buildAuthRequestConfig } from "../src/js/services/authRequest.js";

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
  assert.deepEqual(calls, ["request-1-initial", "refresh", "request-2-replayed"]);
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
