import { execSync } from "child_process";
import fs from "fs";
import { readFile } from "fs/promises";
import path from "path";
import os from "os";

interface Repo {
  full_name: string; // e.g. "Polyhooks/wiselaunch"
}

interface Position {
  line: number;
  col: number;
  offset: number;
}

interface SemgrepMetadata {
  category: string;
  subcategory: string[];
  cwe: string[];
  confidence: string;
  likelihood: string;
  impact: string;
  owasp: string[];
  technology: string[];
  references: string[];
  license: string;
  vulnerability_class: string[];
  source: string;
  shortlink: string;
}

interface SemgrepExtra {
  message: string;
  metadata: SemgrepMetadata;
  severity: string;
  fingerprint: string;
  lines: string;
  validation_state: string;
  engine_kind: string;
}

interface SemgrepFinding {
  check_id: string;
  path: string;
  start: Position;
  end: Position;
  extra: SemgrepExtra;
  fullFile?: string;
  referencedCode?: string;
}

interface SemgrepOutput {
  version: string;
  results: SemgrepFinding[];
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
      const results = runSemgrep(repoSlug, repoPath);
      const hydratedResults = await hydrateSemgrepResultsWithCode(results);
      console.log(hydratedResults);
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

function runSemgrep(repoSlug: string, repoPath: string): SemgrepOutput {
  console.log(`🔍 Running Semgrep on ${repoSlug}...`);

  const output = execSync(`semgrep --config=auto --json ${repoPath}`, {
    encoding: "utf-8",
  });

  return JSON.parse(output);
}

async function hydrateSemgrepResultsWithCode(
  parsed: SemgrepOutput
): Promise<SemgrepOutput> {
  const hydratedResults: SemgrepFinding[] = [];

  for (const finding of parsed.results) {
    const filePath = finding.path;
    let fullFile: string | undefined;
    let referencedCode: string | undefined;

    try {
      fullFile = await readFile(filePath, "utf-8");
      const lines = fullFile.split("\n");
      const start = Math.max(finding.start.line - 1, 0);
      const end = Math.min(finding.end.line, lines.length);
      referencedCode = lines.slice(start, end).join("\n");
    } catch (err) {
      console.warn(
        `⚠️ Could not read file ${filePath}:`,
        (err as Error).message
      );
    }

    hydratedResults.push({
      ...finding,
      fullFile,
      referencedCode,
    });
  }

  return {
    ...parsed,
    results: hydratedResults,
  };
}
