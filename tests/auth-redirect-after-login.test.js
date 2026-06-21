import test from "node:test";
import assert from "node:assert/strict";

import { forceReauthenticate } from "../src/js/services/authService.js";
import SigninHandler from "../src/js/features/signinHandler.js";

function createStorage(initialEntries = []) {
  const data = new Map(initialEntries);

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

function withBrowserGlobals(callback) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;

  try {
    return callback();
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
  }
}

test("forceReauthenticate preserves the current same-origin path before signin redirect", async () => {
  await withBrowserGlobals(async () => {
    const localStorage = createStorage([
      ["userData", JSON.stringify({ id: 1 })],
    ]);
    const sessionStorage = createStorage();
    const location = {
      pathname: "/reports.html",
      search: "?range=weekly",
      hash: "#summary",
      href: "/reports.html?range=weekly#summary",
    };

    globalThis.localStorage = localStorage;
    globalThis.sessionStorage = sessionStorage;
    globalThis.window = {
      localStorage,
      sessionStorage,
      location,
    };

    await forceReauthenticate();

    assert.equal(
      sessionStorage.getItem("redirectAfterLogin"),
      "/reports.html?range=weekly#summary",
    );
    assert.equal(localStorage.getItem("userData"), null);
    assert.equal(location.href, "/signin.html");
  });
});

test("redirectAfterLogin ignores cross-origin redirect targets", async () => {
  await withBrowserGlobals(async () => {
    const localStorage = createStorage();
    const sessionStorage = createStorage([
      ["redirectAfterLogin", "https://evil.example/reports.html"],
    ]);
    const location = {
      origin: "https://admin.example.test",
      href: "https://admin.example.test/signin.html",
    };

    globalThis.localStorage = localStorage;
    globalThis.sessionStorage = sessionStorage;
    globalThis.window = {
      location,
      localStorage,
      sessionStorage,
      RoleBasedAccess: {
        hasPageAccess: () => true,
      },
    };

    await SigninHandler.redirectAfterLogin({
      loginJustSucceeded: true,
      loginUser: { id: 1, role_name: "admin" },
    });

    assert.equal(location.href, "/index.html");
  });
});

test("redirectAfterLogin ignores stale /profile.html for Admin and falls back to dashboard", async () => {
  await withBrowserGlobals(async () => {
    const localStorage = createStorage([
      ["redirectAfterLogin", "/management-user.html?from=stale-tab"],
    ]);
    const sessionStorage = createStorage([
      ["redirectAfterLogin", "/profile.html?from=current-tab"],
    ]);
    const location = {
      origin: "https://admin.example.test",
      href: "https://admin.example.test/signin.html",
    };
    const accessChecks = [];
    const roleRedirects = [];

    globalThis.localStorage = localStorage;
    globalThis.sessionStorage = sessionStorage;
    globalThis.window = {
      location,
      localStorage,
      sessionStorage,
      RoleBasedAccess: {
        hasPageAccessForUser(pathname, userData) {
          accessChecks.push({ pathname, userData });
          return (
            pathname === "/profile.html" && userData?.role_name === "Admin"
          );
        },
        redirectBasedOnRole(userRole) {
          roleRedirects.push(userRole);
          location.href = "/index.html";
        },
      },
    };

    await SigninHandler.redirectAfterLogin({
      loginJustSucceeded: true,
      loginUser: { id: 7, role_name: "Admin" },
    });

    assert.deepEqual(accessChecks, [
      {
        pathname: "/profile.html",
        userData: { id: 7, role_name: "Admin" },
      },
    ]);
    assert.deepEqual(roleRedirects, ["Admin"]);
    assert.equal(location.href, "/index.html");
    assert.equal(localStorage.getItem("redirectAfterLogin"), null);
    assert.equal(sessionStorage.getItem("redirectAfterLogin"), null);
  });
});

test("redirectAfterLogin checks stored target access against fresh login user", async () => {
  await withBrowserGlobals(async () => {
    const localStorage = createStorage([
      ["redirectAfterLogin", "/management-user.html?from=signin"],
    ]);
    const sessionStorage = createStorage();
    const location = {
      origin: "https://admin.example.test",
      href: "https://admin.example.test/signin.html",
    };
    const accessChecks = [];

    globalThis.localStorage = localStorage;
    globalThis.sessionStorage = sessionStorage;
    globalThis.window = {
      location,
      localStorage,
      sessionStorage,
      RoleBasedAccess: {
        hasPageAccessForUser(pathname, userData) {
          accessChecks.push({ pathname, userData });
          return (
            pathname === "/management-user.html" &&
            userData?.role_name === "Admin"
          );
        },
        hasPageAccess() {
          throw new Error("stale auth-store access check should not be used");
        },
      },
    };

    await SigninHandler.redirectAfterLogin({
      loginJustSucceeded: true,
      loginUser: { id: 7, role_name: "Admin" },
    });

    assert.deepEqual(accessChecks, [
      {
        pathname: "/management-user.html",
        userData: { id: 7, role_name: "Admin" },
      },
    ]);
    assert.equal(location.href, "/management-user.html?from=signin");
    assert.equal(localStorage.getItem("redirectAfterLogin"), null);
  });
});

test("redirectAfterLogin skips stored target when fresh RBAC check is unavailable", async () => {
  await withBrowserGlobals(async () => {
    const localStorage = createStorage([
      ["redirectAfterLogin", "/management-user.html?from=signin"],
    ]);
    const sessionStorage = createStorage();
    const location = {
      origin: "https://admin.example.test",
      href: "https://admin.example.test/signin.html",
    };
    const roleRedirects = [];

    globalThis.localStorage = localStorage;
    globalThis.sessionStorage = sessionStorage;
    globalThis.window = {
      location,
      localStorage,
      sessionStorage,
      RoleBasedAccess: {
        redirectBasedOnRole(userRole) {
          roleRedirects.push(userRole);
          location.href = "/index.html";
        },
      },
    };

    await SigninHandler.redirectAfterLogin({
      loginJustSucceeded: true,
      loginUser: { id: 7, role_name: "Admin" },
    });

    assert.deepEqual(roleRedirects, ["Admin"]);
    assert.equal(location.href, "/index.html");
    assert.equal(localStorage.getItem("redirectAfterLogin"), null);
  });
});

test("redirectAfterLogin shows access denied instead of navigating Employee to dashboard", async () => {
  await withBrowserGlobals(async () => {
    const localStorage = createStorage();
    const sessionStorage = createStorage([
      ["redirectAfterLogin", "/index.html"],
    ]);
    const location = {
      origin: "https://admin.example.test",
      href: "https://admin.example.test/signin.html",
    };
    const deniedRoles = [];
    const roleRedirects = [];

    globalThis.localStorage = localStorage;
    globalThis.sessionStorage = sessionStorage;
    globalThis.window = {
      location,
      localStorage,
      sessionStorage,
      RoleBasedAccess: {
        hasPageAccessForUser(pathname, userData) {
          return (
            pathname === "/index.html" && userData?.role_name === "Employee"
          );
        },
        showAccessDenied(userRole) {
          deniedRoles.push(userRole);
        },
        redirectBasedOnRole(userRole) {
          roleRedirects.push(userRole);
          location.href = "/profile.html";
        },
      },
    };

    await SigninHandler.redirectAfterLogin({
      loginJustSucceeded: true,
      loginUser: { id: 8, role_name: "Employee" },
    });

    assert.deepEqual(deniedRoles, ["Employee"]);
    assert.deepEqual(roleRedirects, []);
    assert.equal(location.href, "https://admin.example.test/signin.html");
    assert.equal(sessionStorage.getItem("redirectAfterLogin"), null);
  });
});
