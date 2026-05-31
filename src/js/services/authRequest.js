import axios from "axios";
import {
  createProtectedRequestExecutor,
  classifyAuthFailure,
} from "./authSessionRuntime.js";
import { buildAuthRequestHeaders, forceReauthenticate } from "./authService.js";

const SESSION_EXPIRED_NOTICE = {
  type: "warning",
  title: "Sesi Berakhir",
  message: "Sesi telah berakhir. Silakan login kembali.",
};

const runProtectedRequest = createProtectedRequestExecutor({
  classifyFailure: classifyAuthFailure,
  onForcedReauth: () =>
    forceReauthenticate({
      preserveRedirectAfterLogin: globalThis.location?.href ?? undefined,
      redirectNotice: SESSION_EXPIRED_NOTICE,
    }),
});

export function buildAuthRequestConfig(
  config = {},
  resolveAuthHeaders = buildAuthRequestHeaders,
) {
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
