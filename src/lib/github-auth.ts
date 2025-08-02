// lib/github-auth.ts

import fs from "fs";
import jwt from "jsonwebtoken";

const GITHUB_APP_ID = process.env.GITHUB_APP_ID!;
const GITHUB_PRIVATE_KEY = fs.readFileSync("./private-key.pem", "utf8");

export function generateGitHubJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 10 * 60, // valid for 10 minutes
    iss: GITHUB_APP_ID,
  };

  return jwt.sign(payload, GITHUB_PRIVATE_KEY, { algorithm: "RS256" });
}

export async function getInstallationAccessToken(
  installationId: string
): Promise<string> {
  const jwt = generateGitHubJWT();

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Failed to get installation access token: ${res.status} ${res.statusText} — ${errorText}`
    );
  }

  const data = await res.json();
  return data.token;
}
