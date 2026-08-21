import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (file) => fs.readFileSync(path.resolve(ROOT, file), "utf8");

test("repository forces text working trees to LF", () => {
  assert.match(read(".gitattributes"), /^\* text=auto eol=lf$/m);
});

test("formatting is repository-level and editor agnostic", () => {
  const prettier = JSON.parse(read(".prettierrc"));
  assert.equal(prettier.printWidth, 80);
  assert.deepEqual(prettier.plugins, ["prettier-plugin-tailwindcss"]);
  assert.equal(
    fs.existsSync(path.resolve(ROOT, ".vscode/settings.json")),
    false,
  );
});
