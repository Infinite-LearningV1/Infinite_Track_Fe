import test from "node:test";
import assert from "node:assert/strict";

import {
  initRoleBasedAccess,
  showAccessDenied,
} from "../src/js/utils/roleBasedAccess.js";

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

test("showAccessDenied keeps current location when keepCurrentLocation is true", () => {
  const inserted = [];
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAlpine = globalThis.Alpine;
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
      pathname: "/index.html",
      href: "http://127.0.0.1:3000/index.html",
    },
  };
  globalThis.document = {
    body: {
      style: {},
      insertAdjacentHTML(position, html) {
        inserted.push({ position, html });
      },
    },
    getElementById() {
      return {
        classList: { add() {}, remove() {} },
        querySelector() {
          return {
            classList: { add() {}, remove() {} },
            addEventListener() {},
          };
        },
        addEventListener() {},
      };
    },
    addEventListener() {},
  };
  globalThis.Alpine = {
    store(name) {
      if (name === "auth") {
        return {
          isAuthenticated: true,
          sessionState: "authenticated",
          user: { id: 3, role_name: "Employee" },
        };
      }
      return null;
    },
  };

  try {
    showAccessDenied("Employee", { keepCurrentLocation: true });
    assert.equal(inserted.length, 1);
    assert.match(inserted[0].html, /Akses Ditolak/);
    assert.equal(
      globalThis.window.location.href,
      "http://127.0.0.1:3000/index.html",
    );
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.Alpine = previousAlpine;
    globalThis.localStorage = previousLocalStorage;
    globalThis.sessionStorage = previousSessionStorage;
  }
});

test("initRoleBasedAccess marks dashboard boundary denied for Employee without redirect", () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAlpine = globalThis.Alpine;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const inserted = [];
  const localStorageRef = createMemoryStorage();
  const sessionStorageRef = createMemoryStorage();

  globalThis.localStorage = localStorageRef;
  globalThis.sessionStorage = sessionStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: {
      pathname: "/index.html",
      href: "http://127.0.0.1:3000/index.html",
    },
  };
  globalThis.document = {
    body: {
      dataset: {},
      style: {},
      insertAdjacentHTML(position, html) {
        inserted.push({ position, html });
      },
    },
    getElementById() {
      return {
        classList: { add() {}, remove() {} },
        querySelector() {
          return {
            classList: { add() {}, remove() {} },
            addEventListener() {},
          };
        },
        addEventListener() {},
      };
    },
    addEventListener() {},
  };
  globalThis.requestAnimationFrame = (callback) => callback();
  globalThis.Alpine = {
    store(name) {
      if (name === "auth") {
        return {
          isAuthenticated: true,
          sessionState: "authenticated",
          user: { id: 3, role_name: "Employee" },
        };
      }
      return null;
    },
  };

  try {
    initRoleBasedAccess();

    assert.equal(globalThis.document.body.dataset.accessBoundary, "denied");
    assert.equal(inserted.length, 1);
    assert.equal(
      globalThis.window.location.href,
      "http://127.0.0.1:3000/index.html",
    );
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.Alpine = previousAlpine;
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
  }
});
