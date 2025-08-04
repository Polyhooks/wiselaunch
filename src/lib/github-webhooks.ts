// lib/github-webhooks.ts

import { Webhooks } from "@octokit/webhooks";
import { getInstallationAccessToken } from "./github-auth";
import { cloneAndScanRepos } from "./clone-and-scan-repos";

export const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
});

webhooks.on("installation", async ({ payload }) => {
  const installationId = payload.installation.id.toString();
  const token = await getInstallationAccessToken(installationId);
  if (payload.repositories) {
    cloneAndScanRepos(payload.repositories, token);
  }
});

webhooks.on("push", async ({ payload }) => {
  if (!payload?.installation?.id) return;

  const installationId = payload.installation.id.toString();
  const token = await getInstallationAccessToken(installationId);

  const repo = payload.repository.full_name;
  const ref = payload.ref;

  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits?sha=${ref}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  const commits = await res.json();
  console.log(`🔍 Latest commit on ${ref}:`, commits[0]?.sha);
});

webhooks.on("pull_request", async ({ payload }) => {
  console.log(payload);
});
