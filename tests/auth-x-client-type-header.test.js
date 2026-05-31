import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

import {
  fetchCurrentUser,
  login,
  refreshSession,
} from "../src/js/services/authService.js";

function createStorage(initialData = {}) {
  const data = new Map(Object.entries(initialData));

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function assertNoAuthorizationHeader(headers) {
  assert.equal(
    Object.keys(headers).some((key) => key.toLowerCase() === "authorization"),
    false,
  );
}

test("login sends X-Client-Type web header", async () => {
  const originalPost = axios.post;
  const originalLocalStorage = globalThis.localStorage;
  let sentConfig;

  globalThis.localStorage = createStorage();
  axios.post = async (_url, _payload, config) => {
    sentConfig = config;
    return {
      data: {
        success: true,
        data: { user: { id: 1, email: "user@example.test" } },
      },
    };
  };

  try {
    await login("user@example.test", "password123");

    assert.equal(sentConfig.headers["X-Client-Type"], "web");
  } finally {
    axios.post = originalPost;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("refreshSession sends X-Client-Type web header without Authorization", async () => {
  const originalPost = axios.post;
  const originalLocalStorage = globalThis.localStorage;
  let sentConfig;

  globalThis.localStorage = createStorage({
    authToken: "stored-token",
    userData: JSON.stringify({ token: "user-token" }),
  });
  axios.post = async (_url, _payload, config) => {
    sentConfig = config;
    return {
      data: {
        success: true,
        data: { user: { id: 1, email: "user@example.test" } },
      },
    };
  };

  try {
    await refreshSession();

    assert.equal(sentConfig.headers["X-Client-Type"], "web");
    assertNoAuthorizationHeader(sentConfig.headers);
  } finally {
    axios.post = originalPost;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("fetchCurrentUser sends X-Client-Type web header without Authorization", async () => {
  const originalGet = axios.get;
  const originalLocalStorage = globalThis.localStorage;
  let sentConfig;

  globalThis.localStorage = createStorage({
    auth_token: "legacy-token",
    userData: JSON.stringify({ token: "user-token" }),
  });
  axios.get = async (_url, config) => {
    sentConfig = config;
    return {
      status: 200,
      data: {
        success: true,
        data: { user: { id: 1, email: "user@example.test" } },
      },
    };
  };

  try {
    await fetchCurrentUser();

    assert.equal(sentConfig.headers["X-Client-Type"], "web");
    assertNoAuthorizationHeader(sentConfig.headers);
  } finally {
    axios.get = originalGet;
    globalThis.localStorage = originalLocalStorage;
  }
});
