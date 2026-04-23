import axios from "axios";
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
  onForcedReauth: forceReauthenticate,
});

export function buildAuthRequestConfig(config = {}, resolveAuthHeaders = buildAuthRequestHeaders) {
  const callerHeaders = config?.headers || {};
  const canonicalAuthHeaders = resolveAuthHeaders() || {};

  return {
    ...config,
    withCredentials: true,
    headers: {
      ...callerHeaders,
      "X-Client-Type": "web-fe",
      ...canonicalAuthHeaders,
    },
  };
}

export function authRequest(config) {
  return runProtectedRequest(async () => axios(buildAuthRequestConfig(config)));
}
