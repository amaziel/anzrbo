import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const expectedOutput = ".vercel/output";
const publicOutputCandidates = [".vercel/output/static", ".output/public", "dist/client", "dist"];
const serverEntryCandidates = [
  ".vercel/output/functions/__server.func/index.mjs",
  ".vercel/output/functions/server.func/index.mjs",
  ".output/server/index.mjs",
];
const distFallback = "dist";
const appShell = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ANZRBO</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

function fail(message) {
  console.error(`[vercel-output-check] ${message}`);
  process.exit(1);
}

function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    total += stat.isDirectory() ? countFiles(full) : 1;
  }
  return total;
}

function findServerEntry() {
  const explicitEntry = serverEntryCandidates.find((file) => existsSync(file));
  if (explicitEntry) return explicitEntry;

  const functionsDir = ".vercel/output/functions";
  if (!existsSync(functionsDir)) return null;

  for (const entry of readdirSync(functionsDir)) {
    const candidate = join(functionsDir, entry, "index.mjs");
    if (entry.endsWith(".func") && existsSync(candidate)) return candidate;
  }

  return null;
}

const serverEntry = findServerEntry();
const publicOutput = publicOutputCandidates.find((dir) => existsSync(dir)) ?? null;
if (!publicOutput && !serverEntry) {
  fail(`Aucune sortie publique ou serveur trouvée (${publicOutputCandidates.join(", ")} / ${serverEntryCandidates.join(", ")}).`);
}

const publicFiles = publicOutput ? countFiles(publicOutput) : 0;
if (publicOutput && publicFiles === 0 && !serverEntry) {
  fail(`${publicOutput} est vide, la publication refuserait la sortie de build.`);
}

if (!publicOutput) {
  mkdirSync(distFallback, { recursive: true });
} else if (publicOutput !== distFallback) {
  if (publicOutput.startsWith(`${distFallback}/`)) {
    const tempDist = ".dist-public-output";
    rmSync(tempDist, { recursive: true, force: true });
    renameSync(publicOutput, tempDist);
    rmSync(distFallback, { recursive: true, force: true });
    renameSync(tempDist, distFallback);
  } else {
    rmSync(distFallback, { recursive: true, force: true });
    mkdirSync(distFallback, { recursive: true });
    cpSync(publicOutput, distFallback, { recursive: true });
  }
}
if (!existsSync(join(distFallback, "index.html"))) {
  const shellHtml = join(distFallback, "_shell.html");
  if (existsSync(shellHtml)) {
    cpSync(shellHtml, join(distFallback, "index.html"));
  } else if (serverEntry) {
    writeFileSync(join(distFallback, "index.html"), appShell);
  } else {
    fail(`${distFallback}/index.html est introuvable et aucune entrée serveur n'a été générée.`);
  }
}

const manifest = {
  checkedAt: new Date().toISOString(),
  vercelOutputDirectory: existsSync(expectedOutput) ? expectedOutput : null,
  publicOutputDirectory: publicOutput,
  serverEntry,
  distFallback,
  publicFiles,
  deployment: {
    environment: process.env.VERCEL_ENV ?? "local",
    url: process.env.VERCEL_URL ?? null,
    gitCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  },
};

mkdirSync(dirname(join(distFallback, "build-diagnostics.json")), { recursive: true });
writeFileSync(join(distFallback, "build-diagnostics.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[dist-check] OK: dist prêt, public: ${publicOutput} (${publicFiles} fichiers), serveur: ${serverEntry ?? "non vérifié"}`);