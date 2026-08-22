import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = ["index.html", "signin.html", "bundle.js", "style.css"];
const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".svg",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
]);
const FORBIDDEN_TOP_LEVEL_FILES = new Set([
  "package.json",
  "package-lock.json",
  "webpack.config.js",
  "postcss.config.js",
  ".prettierrc",
]);

function inventoryFiles(directory, relativeDirectory = "") {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path
        .join(relativeDirectory, entry.name)
        .split(path.sep)
        .join("/");
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return inventoryFiles(absolutePath, relativePath);
      }
      if (entry.isFile()) {
        return [relativePath];
      }
      throw new Error(`Forbidden build artifact entry: ${relativePath}`);
    })
    .sort();
}

function isImagePath(relativePath, prefix) {
  if (!relativePath.startsWith(prefix)) return false;
  const extension = path.posix.extname(relativePath).toLowerCase();
  return relativePath.length > prefix.length && IMAGE_EXTENSIONS.has(extension);
}

function assertAllowedPath(relativePath) {
  const basename = path.posix.basename(relativePath);
  const topLevelName = relativePath.split("/")[0];

  if (basename.startsWith(".env") || basename.startsWith(".git")) {
    throw new Error(`Forbidden build artifact path: ${relativePath}`);
  }
  if (relativePath === "tests" || relativePath.startsWith("tests/")) {
    throw new Error(`Forbidden build artifact path: ${relativePath}`);
  }
  if (FORBIDDEN_TOP_LEVEL_FILES.has(topLevelName)) {
    throw new Error(`Forbidden build artifact path: ${relativePath}`);
  }
  if (
    relativePath.startsWith("src/") &&
    !isImagePath(relativePath, "src/images/")
  ) {
    throw new Error(`Forbidden build artifact path: ${relativePath}`);
  }
  if (
    relativePath.startsWith("node_modules/") &&
    !isImagePath(relativePath, "node_modules/leaflet/dist/images/")
  ) {
    throw new Error(`Forbidden build artifact path: ${relativePath}`);
  }
}

export function validateBuildArtifact(buildDir = "build") {
  const resolvedBuildDir = path.resolve(buildDir);
  if (!fs.existsSync(resolvedBuildDir)) {
    throw new Error(`Build directory does not exist: ${resolvedBuildDir}`);
  }
  if (!fs.statSync(resolvedBuildDir).isDirectory()) {
    throw new Error(`Build path is not a directory: ${resolvedBuildDir}`);
  }

  const files = inventoryFiles(resolvedBuildDir);
  if (files.length === 0) {
    throw new Error(`Build directory is empty: ${resolvedBuildDir}`);
  }

  const missing = REQUIRED.filter(
    (requiredFile) => !files.includes(requiredFile),
  );
  if (missing.length > 0) {
    throw new Error(
      `Build artifact is missing required file(s): ${missing.join(", ")}`,
    );
  }

  for (const relativePath of files) {
    assertAllowedPath(relativePath);
  }

  return { fileCount: files.length, files };
}

function runCli() {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const buildDir = process.env.BUILD_DIR || path.resolve(root, "build");
  const result = validateBuildArtifact(buildDir);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
