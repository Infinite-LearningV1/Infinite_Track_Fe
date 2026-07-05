import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTH_SESSION_SYNC_CHANNEL,
  broadcastAuthSessionClear,
  createAuthSessionSyncController,
} from "../src/js/services/authSessionRuntime.js";

function createWindow(pathname = "/index.html") {
  const listeners = new Map();

  return {
    location: { pathname },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    dispatch(type, event) {
      listeners.get(type)?.(event);
    },
  };
}

test("storage auth clear reloads protected pages", () => {
  const windowRef = createWindow("/index.html");
  let reloadCount = 0;
  const controller = createAuthSessionSyncController({
    windowRef,
    isProtectedPage: (path) => path === "/index.html",
    reload: () => {
      reloadCount += 1;
    },
  });

  controller.start();
  windowRef.dispatch("storage", {
    key: "userData",
    oldValue: JSON.stringify({ id: 1 }),
    newValue: null,
  });

  assert.equal(reloadCount, 1);
  controller.stop();
});

test("storage auth clear does not reload public pages", () => {
  const windowRef = createWindow("/signin.html");
  let reloadCount = 0;
  const controller = createAuthSessionSyncController({
    windowRef,
    isProtectedPage: (path) => path === "/index.html",
    reload: () => {
      reloadCount += 1;
    },
  });

  controller.start();
  windowRef.dispatch("storage", {
    key: "userData",
    oldValue: JSON.stringify({ id: 1 }),
    newValue: null,
  });

  assert.equal(reloadCount, 0);
  controller.stop();
});

test("BroadcastChannel auth clear message reloads protected pages", () => {
  let channelInstance;
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.listeners = new Map();
      channelInstance = this;
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    removeEventListener(type) {
      this.listeners.delete(type);
    }

    close() {}

    emit(message) {
      this.listeners.get("message")?.({ data: message });
    }
  }

  const windowRef = createWindow("/index.html");
  windowRef.BroadcastChannel = FakeBroadcastChannel;
  let reloadCount = 0;
  const controller = createAuthSessionSyncController({
    windowRef,
    isProtectedPage: (path) => path === "/index.html",
    reload: () => {
      reloadCount += 1;
    },
  });

  controller.start();

  assert.equal(channelInstance.name, AUTH_SESSION_SYNC_CHANNEL);

  channelInstance.emit({ type: "auth-cleared" });

  assert.equal(reloadCount, 1);
  controller.stop();
});

test("BroadcastChannel constructor failure does not break storage auth clear sync", () => {
  class FailingBroadcastChannel {
    constructor() {
      throw new Error("BroadcastChannel unavailable");
    }
  }

  const windowRef = createWindow("/index.html");
  windowRef.BroadcastChannel = FailingBroadcastChannel;
  let reloadCount = 0;
  const controller = createAuthSessionSyncController({
    windowRef,
    isProtectedPage: (path) => path === "/index.html",
    reload: () => {
      reloadCount += 1;
    },
  });

  assert.doesNotThrow(() => controller.start());
  windowRef.dispatch("storage", {
    key: "authToken",
    oldValue: "stale-token",
    newValue: null,
  });

  assert.equal(reloadCount, 1);
  controller.stop();
});

test("broadcastAuthSessionClear posts auth-cleared message", () => {
  const postedMessages = [];
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
    }

    postMessage(message) {
      postedMessages.push({ channel: this.name, message });
    }

    close() {}
  }

  broadcastAuthSessionClear({ BroadcastChannel: FakeBroadcastChannel });

  assert.deepEqual(postedMessages, [
    {
      channel: AUTH_SESSION_SYNC_CHANNEL,
      message: { type: "auth-cleared" },
    },
  ]);
});
