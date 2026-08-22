import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STABLE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

export function parseStableTag(tag) {
  const match = STABLE_TAG.exec(tag || "");
  if (!match) {
    throw new Error(`Release tag must be stable SemVer vX.Y.Z: ${tag}`);
  }
  return `${match[1]}.${match[2]}.${match[3]}`;
}

export function deriveReleaseIdentity(tag, packageVersion) {
  const version = parseStableTag(tag);
  if (version !== packageVersion) {
    throw new Error(
      `Tag version ${version} does not match package version ${packageVersion}`,
    );
  }
  return {
    version,
    releaseTitle: `Infinite Track Web ${tag}`,
    artifactName: `infinite-track-web-${tag}.zip`,
  };
}

function writeGithubOutput(identity, outputPath) {
  if (!outputPath) return;
  const output = [
    `version=${identity.version}`,
    `release_title=${identity.releaseTitle}`,
    `artifact_name=${identity.artifactName}`,
    "",
  ].join("\n");
  fs.appendFileSync(outputPath, output, "utf8");
}

function runCli() {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const packageManifest = process.env.PACKAGE_MANIFEST || "package.json";
  const packagePath = path.resolve(root, packageManifest);
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const tag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;
  const identity = deriveReleaseIdentity(tag, packageJson.version);

  console.log(`version=${identity.version}`);
  console.log(`release_title=${identity.releaseTitle}`);
  console.log(`artifact_name=${identity.artifactName}`);
  writeGithubOutput(identity, process.env.GITHUB_OUTPUT);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
