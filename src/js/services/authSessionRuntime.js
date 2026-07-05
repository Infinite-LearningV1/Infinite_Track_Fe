export const REFRESHABLE_CODES = new Set([
  "AUTH_ACCESS_TOKEN_EXPIRED",
  "ACCESS_TOKEN_EXPIRED",
  "TOKEN_EXPIRED",
  "ACCESS_EXPIRED",
]);

export const NON_REFRESHABLE_CODES = new Set([
  "AUTH_REFRESH_TOKEN_INVALID",
  "AUTH_REFRESH_TOKEN_REVOKED",
  "AUTH_SESSION_INACTIVE",
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_EXPIRED",
  "REFRESH_TOKEN_REVOKED",
  "SESSION_REVOKED",
  "REFRESH_SESSION_INACTIVE",
  "SESSION_INACTIVE",
  "FULL_REAUTH_REQUIRED",
  "INACTIVITY_EXPIRED",
]);

export const USER_KEYS = ["userData", "user", "currentUserData"];
export const TOKEN_KEYS = ["authToken", "auth_token"];
export const AUTH_REDIRECT_NOTICE_STORAGE_KEY = "authRedirectNotice";
export const AUTH_SESSION_SYNC_CHANNEL = "auth-session";

export const AUXILIARY_KEYS = [
  "rememberMe",
  "rememberedEmail",
  "redirectAfterLogin",
];
export const SESSION_KEYS = [
  "redirectAfterLogin",
  "sessionVerificationState",
  AUTH_REDIRECT_NOTICE_STORAGE_KEY,
];

export function parseJson(value, key = "auth runtime JSON") {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`Invalid JSON in ${key}:`, error.message);
    return null;
  }
}

export function readAuthRedirectNotice(
  sessionStorageRef = globalThis.sessionStorage,
) {
  if (!sessionStorageRef) {
    return null;
  }

  const storedNotice = sessionStorageRef.getItem(AUTH_REDIRECT_NOTICE_STORAGE_KEY);
  const parsedNotice = parseJson(storedNotice, AUTH_REDIRECT_NOTICE_STORAGE_KEY);

  if (parsedNotice && typeof parsedNotice === "object") {
    return parsedNotice;
  }

  if (storedNotice) {
    sessionStorageRef.removeItem(AUTH_REDIRECT_NOTICE_STORAGE_KEY);
  }

  return null;
}

export function persistAuthRedirectNotice(
  notice,
  sessionStorageRef = globalThis.sessionStorage,
) {
  if (!sessionStorageRef || !notice || typeof notice !== "object") {
    return;
  }

  sessionStorageRef.setItem(
    AUTH_REDIRECT_NOTICE_STORAGE_KEY,
    JSON.stringify(notice),
  );
}

export function clearAuthRedirectNotice(
  sessionStorageRef = globalThis.sessionStorage,
) {
  sessionStorageRef?.removeItem(AUTH_REDIRECT_NOTICE_STORAGE_KEY);
}

export function buildForcedReauthRedirectNotice(reason) {
  if (reason === "inactivity_expired") {
    return {
      type: "warning",
      title: "Session berakhir",
      message: "Sesi tidak aktif lebih dari 48 jam. Silakan login lagi.",
      timeoutMs: 6000,
      reason,
    };
  }

  if (reason === "refresh_invalid") {
    return {
      type: "warning",
      title: "Session berakhir",
      message: "Sesi Anda tidak lagi valid. Silakan login lagi.",
      timeoutMs: 6000,
      reason,
    };
  }

  return null;
}

export function classifyAuthFailure(error) {
  if (error?.request && !error?.response) {
    const isOffline = globalThis.navigator?.onLine === false;
    return { kind: "transport", reason: isOffline ? "offline" : "network_error" };
  }

  const status = error?.response?.status ?? error?.status;
  const data = error?.response?.data ?? error?.data ?? {};
  const code = String(data?.code ?? data?.error ?? data?.reason ?? "").toUpperCase();
  const message = String(data?.message ?? error?.message ?? "");
  const refreshInvalidMessage =
    /(?:refresh[\s-]?token|session).*(?:expired|invalid|revoked)|(?:expired|invalid|revoked).*(?:refresh[\s-]?token|session)/i.test(
      message,
    );
  const inactiveMessage = /(?:inactive|inactivity|full\s+re-?auth|required.*re-?auth)/i.test(message);
  const sessionMissingMessage = /(?:tidak ada sesi aktif|no active session|unauthenticated|not authenticated|belum login)/i.test(message);
  const invalidTokenMessage = /(?:invalid|revoked|malformed|bad|missing|no)[\s-]*(?:bearer\s+)?(?:token|credential)|(?:token|credential)[\s-]*(?:invalid|revoked|malformed|missing|required|provided)/i.test(message);
  const accessTokenExpiredMessage =
    /(?:access[\s-]?token.*expired|expired.*access[\s-]?token)/i.test(message);
  const semanticAuthDenial = data?.success === false;

  if (status >= 500) {
    return { kind: "server", reason: "server_error" };
  }

  if (
    (status === 401 || semanticAuthDenial) &&
    (REFRESHABLE_CODES.has(code) || accessTokenExpiredMessage)
  ) {
    return { kind: "refreshable", reason: "access_token_expired" };
  }

  if (
    (status === 401 || status === 403 || semanticAuthDenial) &&
    (NON_REFRESHABLE_CODES.has(code) ||
      refreshInvalidMessage ||
      invalidTokenMessage ||
      inactiveMessage ||
      sessionMissingMessage)
  ) {
    const isInactive = code.includes("INACTIVE") || code.includes("INACTIVITY") || inactiveMessage;

    return {
      kind: "non_refreshable",
      reason: isInactive ? "inactivity_expired" : "refresh_invalid",
    };
  }

  return { kind: "other", reason: "unclassified" };
}

export function createSingleFlightRefresh(refreshFn) {
  let inFlightPromise;

  return function refresh() {
    if (!inFlightPromise) {
      inFlightPromise = Promise.resolve()
        .then(() => refreshFn())
        .finally(() => {
          inFlightPromise = undefined;
        });
    }

    return inFlightPromise;
  };
}

export function isAuthClearStorageEvent(event) {
  return (
    [...USER_KEYS, ...TOKEN_KEYS].includes(event?.key) &&
    event.oldValue !== null &&
    event.newValue === null
  );
}

export function broadcastAuthSessionClear(windowRef = globalThis.window) {
  if (!windowRef?.BroadcastChannel) {
    return;
  }

  const channel = new windowRef.BroadcastChannel(AUTH_SESSION_SYNC_CHANNEL);
  channel.postMessage({ type: "auth-cleared" });
  channel.close?.();
}

export function createAuthSessionSyncController({
  windowRef = globalThis.window,
  isProtectedPage,
  reload = () => windowRef.location.reload(),
} = {}) {
  let channel;
  let started = false;

  const reloadProtectedPage = () => {
    if (isProtectedPage?.(windowRef.location.pathname)) {
      reload();
    }
  };

  const handleStorage = (event) => {
    if (isAuthClearStorageEvent(event)) {
      reloadProtectedPage();
    }
  };

  const handleMessage = (event) => {
    if (event?.data?.type === "auth-cleared") {
      reloadProtectedPage();
    }
  };

  return {
    start() {
      if (started || !windowRef?.addEventListener) {
        return;
      }

      started = true;
      windowRef.addEventListener("storage", handleStorage);

      if (windowRef.BroadcastChannel) {
        try {
          channel = new windowRef.BroadcastChannel(AUTH_SESSION_SYNC_CHANNEL);
          channel.addEventListener?.("message", handleMessage);
        } catch (error) {
          console.warn("Auth session BroadcastChannel unavailable:", error.message);
          channel = undefined;
        }
      }
    },
    stop() {
      if (!started || !windowRef?.removeEventListener) {
        return;
      }

      started = false;
      windowRef.removeEventListener("storage", handleStorage);
      channel?.removeEventListener?.("message", handleMessage);
      channel?.close?.();
      channel = undefined;
    },
  };
}

export function createProtectedRequestExecutor({
  executeRefresh,
  classifyFailure,
  onForcedReauth,
}) {
  const refresh = createSingleFlightRefresh(executeRefresh);

  return async function runProtectedRequest(executeRequest) {
    return executeWithRecovery({ executeRequest, classifyFailure, onForcedReauth, refresh });
  };
}

async function executeWithRecovery({
  executeRequest,
  classifyFailure,
  onForcedReauth,
  refresh,
}) {
  try {
    return await executeRequest({ replayed: false });
  } catch (requestError) {
    const requestFailure = classifyFailure(requestError);

    if (requestFailure.kind === "non_refreshable") {
      await onForcedReauth(requestError, {
        redirectNotice: buildForcedReauthRedirectNotice(requestFailure.reason),
      });
      throw requestError;
    }

    if (requestFailure.kind !== "refreshable") {
      throw requestError;
    }

    try {
      await refresh();
    } catch (refreshError) {
      const refreshFailure = classifyFailure(refreshError);

      if (refreshFailure.kind === "non_refreshable") {
        await onForcedReauth(refreshError, {
          redirectNotice: buildForcedReauthRedirectNotice(refreshFailure.reason),
        });
      }

      throw refreshError;
    }

    try {
      return await executeRequest({ replayed: true });
    } catch (replayError) {
      const replayFailure = classifyFailure(replayError);

      if (replayFailure.kind === "non_refreshable") {
        await onForcedReauth(replayError, {
          redirectNotice: buildForcedReauthRedirectNotice(replayFailure.reason),
        });
      }

      throw replayError;
    }
  }
}

export function readStoredSessionSnapshot(localStorageRef = globalThis.localStorage) {
  if (!localStorageRef) {
    return null;
  }

  const canonicalUser = parseJson(localStorageRef.getItem("userData"), "userData");
  const legacyUser = parseJson(localStorageRef.getItem("user"), "user");
  const currentUserData = parseJson(localStorageRef.getItem("currentUserData"), "currentUserData");
  const user = canonicalUser ?? legacyUser ?? currentUserData;

  const canonicalToken = localStorageRef.getItem("authToken");
  const legacyToken = localStorageRef.getItem("auth_token");
  const tokenFromUser = user?.token ?? null;
  const token = canonicalToken || legacyToken || tokenFromUser || null;

  if (!user && !token) {
    return null;
  }

  return {
    user: user || null,
    token,
  };
}

export function clearAuthArtifacts(
  localStorageRef = globalThis.localStorage,
  sessionStorageRef = globalThis.sessionStorage,
  options = {},
) {
  const redirectToPreserve =
    typeof options?.preserveRedirectAfterLogin === "string" &&
    options.preserveRedirectAfterLogin.length > 0
      ? options.preserveRedirectAfterLogin
      : null;

  if (localStorageRef) {
    [...USER_KEYS, ...TOKEN_KEYS, ...AUXILIARY_KEYS].forEach((key) => {
      if (key === "redirectAfterLogin" && redirectToPreserve) {
        return;
      }

      localStorageRef.removeItem(key);
    });

    if (redirectToPreserve) {
      localStorageRef.removeItem("redirectAfterLogin");
    }
  }

  if (sessionStorageRef) {
    SESSION_KEYS.forEach((key) => {
      if (key === "redirectAfterLogin" && redirectToPreserve) {
        return;
      }

      sessionStorageRef.removeItem(key);
    });

    if (redirectToPreserve) {
      sessionStorageRef.setItem("redirectAfterLogin", redirectToPreserve);
    }
  }
}

export function createBootstrapSessionResolver({
  hasSessionHint,
  fetchCurrentUser,
  refreshSession,
  classifyFailure,
}) {
  return async function resolveBootstrapSession() {
    if (!hasSessionHint()) {
      return { state: "unauthenticated", user: null };
    }

    try {
      const user = await fetchCurrentUser();
      return { state: "authenticated", user };
    } catch (error) {
      const failure = classifyFailure(error);

      if (failure.kind === "refreshable") {
        try {
          await refreshSession();
          const user = await fetchCurrentUser();
          return { state: "authenticated", user };
        } catch (refreshError) {
          const refreshFailure = classifyFailure(refreshError);

          if (refreshFailure.kind === "non_refreshable") {
            return { state: "non_refreshable", user: null, error: refreshError };
          }

          return { state: "verification_failed", user: null, error: refreshError };
        }
      }

      if (failure.kind === "non_refreshable") {
        return { state: "non_refreshable", user: null, error };
      }

      return { state: "verification_failed", user: null, error };
    }
  };
}
