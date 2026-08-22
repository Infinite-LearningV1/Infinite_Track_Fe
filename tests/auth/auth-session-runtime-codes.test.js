import test from "node:test";
import assert from "node:assert/strict";

import { classifyAuthFailure } from "../../src/js/services/authSessionRuntime.js";

test("classifyAuthFailure treats AUTH_ACCESS_TOKEN_EXPIRED as refreshable", () => {
  const result = classifyAuthFailure({
    response: {
      status: 401,
      data: { code: "AUTH_ACCESS_TOKEN_EXPIRED" },
    },
  });

  assert.deepEqual(result, {
    kind: "refreshable",
    reason: "access_token_expired",
  });
});

test("classifyAuthFailure treats AUTH_REFRESH_TOKEN_INVALID as non-refreshable", () => {
  const result = classifyAuthFailure({
    response: {
      status: 401,
      data: { code: "AUTH_REFRESH_TOKEN_INVALID" },
    },
  });

  assert.deepEqual(result, {
    kind: "non_refreshable",
    reason: "refresh_invalid",
  });
});

test("classifyAuthFailure treats AUTH_REFRESH_TOKEN_REVOKED as non-refreshable refresh invalid", () => {
  const result = classifyAuthFailure({
    response: {
      status: 401,
      data: { code: "AUTH_REFRESH_TOKEN_REVOKED" },
    },
  });

  assert.deepEqual(result, {
    kind: "non_refreshable",
    reason: "refresh_invalid",
  });
});

test("classifyAuthFailure treats AUTH_SESSION_INACTIVE as inactivity-expired reauth", () => {
  const result = classifyAuthFailure({
    response: {
      status: 401,
      data: { code: "AUTH_SESSION_INACTIVE" },
    },
  });

  assert.deepEqual(result, {
    kind: "non_refreshable",
    reason: "inactivity_expired",
  });
});
