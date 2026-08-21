import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.resolve(ROOT, file), "utf8");

test("repository forces text working trees to LF", () => {
  assert.match(read(".gitattributes"), /^\* text=auto eol=lf$/m);
});
