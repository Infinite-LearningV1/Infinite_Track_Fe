import test from "node:test";
import assert from "node:assert/strict";

import {
  initRoleBasedAccess,
  redirectBasedOnRole,
  showAccessDenied,
} from "../../src/js/utils/roleBasedAccess.js";

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

for (const deniedRole of ["Employee", "Internship"]) {
  test(`initRoleBasedAccess marks dashboard boundary denied for ${deniedRole} without redirect`, () => {
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
            user: { id: 3, role_name: deniedRole },
          };
        }
        return null;
      },
    };

    try {
      initRoleBasedAccess();

      assert.equal(globalThis.document.body.dataset.accessBoundary, "denied");
      assert.equal(inserted.length, 1);
      assert.match(inserted[0].html, /Kembali ke Sign In/);
      assert.doesNotMatch(
        inserted[0].html,
        /<button[\s\S]*Tutup[\s\S]*<\/button>/,
      );
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
}

test("showAccessDenied escapes role labels before inserting modal HTML", () => {
  const inserted = [];
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
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

  try {
    showAccessDenied("<img src=x onerror=alert(1)>", {
      keepCurrentLocation: true,
    });

    assert.equal(inserted.length, 1);
    assert.doesNotMatch(inserted[0].html, /<img src=x onerror=alert\(1\)>/);
    assert.match(inserted[0].html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.localStorage = previousLocalStorage;
    globalThis.sessionStorage = previousSessionStorage;
  }
});

test("redirectBasedOnRole routes unsupported roles to safe signin", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: { href: "http://127.0.0.1:3000/form-user.html" },
  };

  try {
    redirectBasedOnRole("Contractor");
    assert.equal(globalThis.window.location.href, "/signin.html");
  } finally {
    globalThis.window = previousWindow;
  }
});

test("initRoleBasedAccess hard-denies unknown verified dashboard role without redirect", () => {
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
          user: { id: 4, role_name: "Contractor" },
        };
      }
      return null;
    },
  };

  try {
    initRoleBasedAccess();

    assert.equal(globalThis.document.body.dataset.accessBoundary, "denied");
    assert.equal(inserted.length, 1);
    assert.match(inserted[0].html, /Akses Ditolak/);
    assert.match(inserted[0].html, /Tutup/);
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

test("hard-deny primary action truthfully routes to the role landing page", async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAlpine = globalThis.Alpine;
  const previousSetTimeout = globalThis.setTimeout;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const localStorageRef = createMemoryStorage();
  const sessionStorageRef = createMemoryStorage();
  const listeners = {};
  const classList = { add() {}, remove() {} };

  globalThis.localStorage = localStorageRef;
  globalThis.sessionStorage = sessionStorageRef;
  globalThis.window = {
    localStorage: localStorageRef,
    sessionStorage: sessionStorageRef,
    location: {
      pathname: "/index.html",
      href: "http://127.0.0.1:3000/index.html",
    },
    AuthService: {
      async logout() {
        return true;
      },
      async forceReauthenticate() {
        globalThis.window.location.href = "/signin.html";
      },
    },
  };
  globalThis.document = {
    body: {
      style: {},
      insertAdjacentHTML() {},
    },
    getElementById() {
      return {
        classList,
        remove() {},
        querySelector(selector) {
          if (!listeners[selector]) {
            listeners[selector] = {};
          }

          return {
            classList,
            addEventListener(eventName, callback) {
              listeners[selector][eventName] = callback;
            },
          };
        },
        addEventListener() {},
      };
    },
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.Alpine = undefined;
  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  globalThis.requestAnimationFrame = (callback) => callback();

  try {
    showAccessDenied("Employee", {
      keepCurrentLocation: true,
      primaryAction: "redirect",
    });

    assert.equal(
      globalThis.window.location.href,
      "http://127.0.0.1:3000/index.html",
    );

    listeners["#modal-redirect-btn"].click();
    await new Promise((resolve) => previousSetTimeout(resolve, 25));

    assert.equal(globalThis.window.location.href, "/signin.html");
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.Alpine = previousAlpine;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
  }
});
