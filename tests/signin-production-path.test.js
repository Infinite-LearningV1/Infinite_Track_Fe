import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const SIGNIN_HTML_PATH =
  "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/feature-inf-146-web-fe-refresh-session/src/signin.html";

test("production Alpine signin submit flow delegates redirect to SigninHandler.redirectAfterLogin", () => {
  const signinHtml = fs.readFileSync(SIGNIN_HTML_PATH, "utf8");

  assert.ok(
    signinHtml.includes("window.SigninHandler.redirectAfterLogin("),
    "Expected production signin flow to call window.SigninHandler.redirectAfterLogin(...) after successful login",
  );

  assert.ok(
    !signinHtml.includes("window.RoleBasedAccess.hasPageAccess(savedRedirectUrl)"),
    "Expected legacy inline redirect access check to be removed from production signin flow",
  );
});
