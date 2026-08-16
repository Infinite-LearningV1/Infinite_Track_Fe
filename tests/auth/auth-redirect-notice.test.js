import test from "node:test";
import assert from "node:assert/strict";

import {
  createProtectedRequestExecutor,
  persistAuthRedirectNotice,
} from "../../src/js/services/authSessionRuntime.js";
import { initSigninHandler } from "../../src/js/features/signinHandler.js";

function createStorage() {
  const data = new Map();

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

async function captureForcedReauthNotice(refreshCode) {
  let forcedReauthOptions;
  const runProtectedRequest = createProtectedRequestExecutor({
    executeRefresh: async () => {
      const error = new Error(refreshCode);
      error.response = {
        status: 401,
        data: { code: refreshCode },
      };
      throw error;
    },
    classifyFailure: (error) => {
      const code = error?.response?.data?.code;

      if (code === "AUTH_ACCESS_TOKEN_EXPIRED") {
        return { kind: "refreshable", reason: "access_token_expired" };
      }

      if (code === "AUTH_SESSION_INACTIVE") {
        return { kind: "non_refreshable", reason: "inactivity_expired" };
      }

      return { kind: "non_refreshable", reason: "refresh_invalid" };
    },
    onForcedReauth: async (_error, options) => {
      forcedReauthOptions = options;
    },
  });

  await assert.rejects(() =>
    runProtectedRequest(async () => {
      const error = new Error("expired access");
      error.response = {
        status: 401,
        data: { code: "AUTH_ACCESS_TOKEN_EXPIRED" },
      };
      throw error;
    }),
  );

  return forcedReauthOptions.redirectNotice;
}

test("forced reauth for inactivity persists a 6s session-ended notice", async () => {
  const notice = await captureForcedReauthNotice("AUTH_SESSION_INACTIVE");

  assert.deepEqual(notice, {
    type: "warning",
    title: "Session berakhir",
    message: "Sesi tidak aktif lebih dari 48 jam. Silakan login lagi.",
    timeoutMs: 6000,
    reason: "inactivity_expired",
  });
});

test("forced reauth for invalid refresh persists a 6s invalid-session notice", async () => {
  const notice = await captureForcedReauthNotice("AUTH_REFRESH_TOKEN_INVALID");

  assert.equal(notice.type, "warning");
  assert.equal(notice.message, "Sesi Anda tidak lagi valid. Silakan login lagi.");
  assert.equal(notice.timeoutMs, 6000);
  assert.equal(notice.reason, "refresh_invalid");
});

test("signin notice display honors inactivity minimum timeout", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const sessionStorage = createStorage();
  let shownNotice;

  persistAuthRedirectNotice(
    {
      type: "warning",
      title: "Session berakhir",
      message: "Sesi tidak aktif lebih dari 48 jam. Silakan login lagi.",
      timeoutMs: 3000,
      reason: "inactivity_expired",
    },
    sessionStorage,
  );

  globalThis.window = {
    sessionStorage,
    showInlineAlert: (notice) => {
      shownNotice = notice;
    },
  };
  globalThis.document = {
    readyState: "loading",
    addEventListener: () => {},
  };

  try {
    initSigninHandler();

    assert.equal(shownNotice.timeoutMs, 6000);
    assert.equal(sessionStorage.getItem("authRedirectNotice"), null);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
