#!/usr/bin/env node
/**
 * Refresh the Chromatic access token using the saved refresh token.
 * Refresh tokens rotate on every use, so we always overwrite both the
 * access and refresh tokens in .chromatic-token.json.
 *
 * Usage:
 *   node scripts/chromatic-refresh.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { URLSearchParams } from "node:url";

const CLIENT_ID = "aa36cfb8fbca4abab92b673e9d241c42";
const TOKEN_URL = "https://www.chromatic.com/token";
const RESOURCE = "https://www.chromatic.com/api";
const TOKEN_FILE = ".chromatic-token.json";

const existing = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
if (!existing.refresh_token) {
  console.error("No refresh_token in .chromatic-token.json — re-run chromatic-auth.mjs first.");
  process.exit(1);
}

const resp = await fetch(TOKEN_URL, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    refresh_token: existing.refresh_token,
    resource: RESOURCE,
  }),
});
const json = await resp.json();
if (!resp.ok) {
  console.error("Refresh failed:", resp.status, json);
  process.exit(1);
}

writeFileSync(
  TOKEN_FILE,
  JSON.stringify(
    {
      ...json,
      obtained_at: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log("✓ Refreshed token");
console.log("  expires_in:   ", json.expires_in);
console.log("  scope:        ", json.scope);
if (json.refresh_token) console.log("  refresh_token: <rotated, saved>");
