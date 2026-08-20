import axios from "axios";
import { AUTH_CONFIG } from "../config/env.js";
import {
  createProtectedRequestExecutor,
  classifyAuthFailure,
} from "./authSessionRuntime.js";
import {
  buildAuthRequestHeaders,
  forceReauthenticate,
  refreshSession,
} from "./authService.js";

const runProtectedRequest = createProtectedRequestExecutor({
  executeRefresh: refreshSession,
  classifyFailure: classifyAuthFailure,
  onForcedReauth: (_error, options) => forceReauthenticate(options),
});

function omitAuthorizationHeader(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([key]) => key.toLowerCase() !== "authorization",
    ),
  );
}

export function buildAuthRequestConfig(
  config = {},
  resolveAuthHeaders = buildAuthRequestHeaders,
) {
  const callerHeaders = omitAuthorizationHeader(config?.headers || {});
  const canonicalAuthHeaders = omitAuthorizationHeader(
    resolveAuthHeaders() || {},
  );

  return {
    ...config,
    withCredentials: true,
    headers: {
      ...callerHeaders,
      ...AUTH_CONFIG.CLIENT_HEADERS,
      ...canonicalAuthHeaders,
    },
  };
}

export function authRequest(config) {
  return runProtectedRequest(async () => axios(buildAuthRequestConfig(config)));
}
