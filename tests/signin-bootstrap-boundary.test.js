import test from "node:test";
import assert from "node:assert/strict";

import SigninHandler from "../src/js/features/signinHandler.js";

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

      if (selector === "#password") {
        return passwordInput;
      }

      if (selector === 'button[type="submit"], form button:last-of-type') {
        return submitButton;
      }

      return null;
    },
  };
}

test("SigninHandler.shouldAutoInitSigninHandler returns false outside signin form context", () => {
  const dashboardDocument = createFakeDocument();

  assert.equal(SigninHandler.shouldAutoInitSigninHandler(dashboardDocument), false);
});

test("SigninHandler.shouldAutoInitSigninHandler returns true for signin form context", () => {
  const signinDocument = createFakeDocument({
    hasForm: true,
    hasEmailInput: true,
    hasPasswordInput: true,
    hasSubmitButton: true,
  });

  assert.equal(SigninHandler.shouldAutoInitSigninHandler(signinDocument), true);
});
