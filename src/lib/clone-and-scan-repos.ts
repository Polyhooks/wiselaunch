import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

interface Repo {
  full_name: string; // e.g. "Polyhooks/wiselaunch"
}

const resultsDir = path.resolve("scan-results");
fs.mkdirSync(resultsDir, { recursive: true });

export async function cloneAndScanRepos(
  repositories: Repo[],
  installationAccessToken: string
) {
  console.log("here");
  const cloneBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "cloned-repos-"));

  for (const repo of repositories) {
    const repoSlug = repo.full_name.replace("/", "__");

    try {
      const repoPath = cloneRepo(
        repo.full_name,
        installationAccessToken,
        cloneBaseDir
      );
      console.log(repoPath);
      const resultPath = runSemgrep(repoSlug, repoPath, cloneBaseDir);
      moveResultToOutput(resultPath, repoSlug);
    } catch (err) {
      console.error(`❌ Error processing ${repo.full_name}:`, err);
    }
  }
}

function cloneRepo(fullName: string, token: string, baseDir: string): string {
  const slug = fullName.replace("/", "__");
  const destPath = path.join(baseDir, slug);
  const cloneUrl = `https://x-access-token:${token}@github.com/${fullName}.git`;

  console.log(`🚀 Cloning ${fullName}...`);
  execSync(`git clone --depth=1 ${cloneUrl} ${destPath}`, {
    stdio: "inherit",
  });

  return destPath;
}

function runSemgrep(
  repoSlug: string,
  repoPath: string,
  outputDir: string
): string {
  console.log(`🔍 Running Semgrep on ${repoSlug}...`);

  const resultPath = path.join(outputDir, `${repoSlug}.json`);

  execSync(`semgrep --config=auto --json --output ${resultPath} ${repoPath}`, {
    stdio: "inherit",
  });

  return resultPath;
}

function moveResultToOutput(resultPath: string, repoSlug: string) {
  const targetPath = path.join(resultsDir, `${repoSlug}.json`);
  fs.renameSync(resultPath, targetPath);
  console.log(`📄 Scan result saved to ${targetPath}`);
}
