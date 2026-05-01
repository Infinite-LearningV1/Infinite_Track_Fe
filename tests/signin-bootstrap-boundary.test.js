import test from "node:test";
import assert from "node:assert/strict";

import { shouldAutoInitSigninHandler } from "../src/js/features/signinHandler.js";

function createFakeDocument({
  hasForm = false,
  hasEmailInput = false,
  hasPasswordInput = false,
  hasSubmitButton = false,
} = {}) {
  const form = hasForm ? { tagName: "FORM" } : null;
  const emailInput = hasEmailInput ? { id: "email" } : null;
  const passwordInput = hasPasswordInput ? { id: "password" } : null;
  const submitButton = hasSubmitButton ? { type: "submit" } : null;

  return {
    getElementById(id) {
      if (id === "email") {
        return emailInput;
      }

      if (id === "password") {
        return passwordInput;
      }

      return null;
    },
    querySelector(selector) {
      if (selector === "form") {
        return form;
      }

      if (selector === 'input[type="password"], input[x-bind\\:type]') {
        return passwordInput;
      }

      if (selector === 'button[type="submit"], form button:last-of-type') {
        return submitButton;
      }

      return null;
    },
  };
}

test("shouldAutoInitSigninHandler returns false outside signin form context", () => {
  const dashboardDocument = createFakeDocument();

  assert.equal(shouldAutoInitSigninHandler(dashboardDocument), false);
});

test("shouldAutoInitSigninHandler returns true for signin form context", () => {
  const signinDocument = createFakeDocument({
    hasForm: true,
    hasEmailInput: true,
    hasPasswordInput: true,
    hasSubmitButton: true,
  });

  assert.equal(shouldAutoInitSigninHandler(signinDocument), true);
});
