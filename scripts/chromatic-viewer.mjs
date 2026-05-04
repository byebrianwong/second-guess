#!/usr/bin/env node
/**
 * Sanity check: print the authenticated user's profile via the
 * Chromatic GraphQL API. Auto-refreshes the access token if needed.
 */

import { chromaticGraphQL } from "./lib/chromatic.mjs";

const data = await chromaticGraphQL(
  "{ viewer { id name username projectCount accounts { id name } } }",
);
console.log(JSON.stringify(data.viewer, null, 2));
