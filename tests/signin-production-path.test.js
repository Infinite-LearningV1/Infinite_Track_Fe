import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_FILE_PATH = fileURLToPath(import.meta.url);
const TEST_DIR = path.dirname(TEST_FILE_PATH);
const SIGNIN_HTML_PATH = path.resolve(TEST_DIR, "../src/signin.html");

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
