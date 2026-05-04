/**
 * Tiny helper for hitting the Chromatic GraphQL API from local scripts.
 *
 *   import { chromaticGraphQL } from "./lib/chromatic.mjs";
 *   const data = await chromaticGraphQL(`{ viewer { id name } }`);
 *
 * Reads the saved token from .chromatic-token.json. If the access token
 * is within 30s of expiring, refreshes it (and writes the new token pair
 * back to disk — refresh tokens rotate on every use).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { URLSearchParams } from "node:url";

const CLIENT_ID = "aa36cfb8fbca4abab92b673e9d241c42";
const TOKEN_URL = "https://www.chromatic.com/token";
const API_URL = "https://www.chromatic.com/api";
const RESOURCE = API_URL;
const TOKEN_FILE = ".chromatic-token.json";

function load() {
  if (!existsSync(TOKEN_FILE)) {
    throw new Error(
      `No ${TOKEN_FILE} found — run \`node scripts/chromatic-auth.mjs\` first.`,
    );
  }
  return JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
}

function save(token) {
  writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
}

function isExpiringSoon(token, marginSeconds = 30) {
  if (!token.obtained_at || !token.expires_in) return true;
  const obtained = new Date(token.obtained_at).getTime();
  const expiresAt = obtained + token.expires_in * 1000;
  return Date.now() + marginSeconds * 1000 >= expiresAt;
}

async function refresh(token) {
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: token.refresh_token,
      resource: RESOURCE,
    }),
  });
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(
      `Refresh failed (${resp.status}): ${JSON.stringify(json)}`,
    );
  }
  const next = { ...json, obtained_at: new Date().toISOString() };
  save(next);
  return next;
}

export async function getAccessToken() {
  let token = load();
  if (isExpiringSoon(token)) {
    token = await refresh(token);
  }
  return token.access_token;
}

/**
 * POST a GraphQL operation. Returns `data` (or throws if `errors` is
 * present). Pass variables in the second arg.
 */
export async function chromaticGraphQL(query, variables) {
  const accessToken = await getAccessToken();
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await resp.json();
  if (json.errors) {
    throw new Error(
      `Chromatic API errors: ${JSON.stringify(json.errors, null, 2)}`,
    );
  }
  return json.data;
}
