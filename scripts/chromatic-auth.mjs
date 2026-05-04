#!/usr/bin/env node
/**
 * One-shot OAuth 2.0 + PKCE flow for the Chromatic API.
 *
 * Usage:
 *   node scripts/chromatic-auth.mjs
 *
 * Spins up a localhost HTTP server, opens the user's browser to the
 * Chromatic authorize endpoint, catches the redirect, exchanges the code
 * for a token, and writes the result to .chromatic-token.json (gitignored).
 *
 * Endpoints discovered via:
 *   curl https://www.chromatic.com/.well-known/oauth-authorization-server
 */

import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { exec } from "node:child_process";
import { writeFileSync } from "node:fs";
import { URL, URLSearchParams } from "node:url";

const CLIENT_ID = "aa36cfb8fbca4abab92b673e9d241c42";
// Full agents-API scope set (per Chromatic's getting-started doc).
const SCOPES = [
  "user:read",
  "account:read",
  "account:write",
  "project:read",
  "project:write",
  "build:read",
  "build:write",
  "storybook:read",
].join(" ");
const AUTH_URL = "https://www.chromatic.com/authorize";
const TOKEN_URL = "https://www.chromatic.com/token";
const API_URL = "https://www.chromatic.com/api";
// RFC 8707 resource indicator — Chromatic requires it; the value is the
// GraphQL API URL itself.
const RESOURCE = API_URL;

const PORT = parseInt(process.env.CHROMATIC_OAUTH_PORT || "8080", 10);
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

function b64url(buf) {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

const verifier = b64url(randomBytes(32));
const challenge = b64url(createHash("sha256").update(verifier).digest());
const state = b64url(randomBytes(16));

const authUrl = new URL(AUTH_URL);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("code_challenge", challenge);
authUrl.searchParams.set("code_challenge_method", "S256");
authUrl.searchParams.set("resource", RESOURCE);

let resolveCode;
const codePromise = new Promise((res) => {
  resolveCode = res;
});

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  const recvState = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  if (error) {
    res.writeHead(400, { "content-type": "text/html" });
    res.end(`<p>Auth error: ${error}<br>${errDesc ?? ""}</p>`);
    resolveCode({ error, errDesc });
    return;
  }
  if (recvState !== state) {
    res.writeHead(400, { "content-type": "text/html" });
    res.end("<p>State mismatch — aborted for security.</p>");
    resolveCode({ error: "state_mismatch" });
    return;
  }
  if (!code) {
    res.writeHead(400, { "content-type": "text/html" });
    res.end("<p>No authorization code returned.</p>");
    resolveCode({ error: "no_code" });
    return;
  }

  res.writeHead(200, { "content-type": "text/html" });
  res.end(
    "<!doctype html><meta charset=utf-8><title>Authenticated</title>" +
      "<body style=font-family:system-ui;padding:2rem><h1>Authenticated ✓</h1>" +
      "<p>You can close this tab and return to the terminal.</p></body>",
  );
  resolveCode({ code });
});

server.listen(PORT, () => {
  console.log(`Listening on ${REDIRECT_URI}`);
  console.log("Opening browser for Chromatic auth…");
  console.log(`(if it doesn't open, visit: ${authUrl.href})\n`);
  exec(`open ${JSON.stringify(authUrl.href)}`, (err) => {
    if (err) console.error("Could not auto-open browser:", err.message);
  });
});

// Hard timeout so the server doesn't hang forever
const timeout = setTimeout(() => {
  console.error("\nTimed out waiting for the redirect (5 min).");
  process.exit(2);
}, 5 * 60 * 1000);

const result = await codePromise;
clearTimeout(timeout);
server.close();

if (result.error) {
  console.error("\nAuth failed:", result.error, result.errDesc ?? "");
  process.exit(1);
}

console.log("✓ Got authorization code, exchanging for token…");

const tokenResp = await fetch(TOKEN_URL, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code: result.code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
    resource: RESOURCE,
  }),
});
const tokenJson = await tokenResp.json();
if (!tokenResp.ok) {
  console.error("Token exchange failed:", tokenResp.status, tokenJson);
  process.exit(1);
}

writeFileSync(
  ".chromatic-token.json",
  JSON.stringify(
    {
      ...tokenJson,
      obtained_at: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log("✓ Token saved to .chromatic-token.json");
if (tokenJson.scope) console.log("  scope:        ", tokenJson.scope);
if (tokenJson.expires_in) console.log("  expires_in:   ", tokenJson.expires_in);
if (tokenJson.token_type) console.log("  token_type:   ", tokenJson.token_type);
if (tokenJson.refresh_token) console.log("  refresh_token: <stored>");

// Smoke test: fetch the viewer to confirm the token works.
console.log("\nSmoke-testing the token with a `viewer` query…");
const probe = await fetch(API_URL, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${tokenJson.access_token}`,
  },
  body: JSON.stringify({
    query: "{ viewer { id name username projectCount } }",
  }),
});
const probeJson = await probe.json();
if (probeJson.errors) {
  console.error("API call returned errors:", probeJson.errors);
  process.exit(1);
}
console.log("✓ viewer:", probeJson.data?.viewer);
