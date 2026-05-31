export const REFRESHABLE_CODES = new Set([
  "ACCESS_TOKEN_EXPIRED",
  "TOKEN_EXPIRED",
  "ACCESS_EXPIRED",
]);

export const NON_REFRESHABLE_CODES = new Set([
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_REVOKED",
  "SESSION_REVOKED",
  "FULL_REAUTH_REQUIRED",
  "INACTIVITY_EXPIRED",
]);

export const USER_KEYS = ["userData", "user", "currentUserData"];
export const TOKEN_KEYS = ["authToken", "auth_token"];
export const AUTH_REDIRECT_NOTICE_STORAGE_KEY = "authRedirectNotice";

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

export function parseJson(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function readAuthRedirectNotice(
  sessionStorageRef = globalThis.sessionStorage,
) {
  if (!sessionStorageRef) {
    return null;
  }

  const storedNotice = sessionStorageRef.getItem(
    AUTH_REDIRECT_NOTICE_STORAGE_KEY,
  );
  const parsedNotice = parseJson(storedNotice);

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

export function classifyAuthFailure(error) {
  if (error?.request && !error?.response) {
    return { kind: "transport", reason: "network_error" };
  }

  const status = error?.response?.status ?? error?.status;
  const data = error?.response?.data ?? error?.data ?? {};
  const code = String(data?.code ?? "").toUpperCase();
  const message = String(data?.message ?? error?.message ?? "");
  const refreshInvalidMessage =
    /(?:refresh[\s-]?token|session).*(?:expired|invalid|revoked)|(?:expired|invalid|revoked).*(?:refresh[\s-]?token|session)/i.test(
      message,
    );
  const accessTokenExpiredMessage =
    /(?:access[\s-]?token.*expired|expired.*access[\s-]?token)/i.test(message);

  if (
    status === 401 &&
    (NON_REFRESHABLE_CODES.has(code) || refreshInvalidMessage)
  ) {
    return {
      kind: "non_refreshable",
      reason:
        code === "INACTIVITY_EXPIRED"
          ? "inactivity_expired"
          : "refresh_invalid",
    };
  }

  if (
    status === 401 &&
    (REFRESHABLE_CODES.has(code) || accessTokenExpiredMessage)
  ) {
    return { kind: "refreshable", reason: "access_token_expired" };
  }

  if (status === 401) {
    return { kind: "non_refreshable", reason: "unauthorized" };
  }

  return { kind: "other", reason: "unclassified" };
}

export function createProtectedRequestExecutor({
  classifyFailure,
  onForcedReauth,
}) {
  return async function runProtectedRequest(executeRequest) {
    try {
      return await executeRequest({ replayed: false });
    } catch (requestError) {
      const requestFailure = classifyFailure(requestError);

      if (
        requestFailure.kind === "refreshable" ||
        requestFailure.kind === "non_refreshable"
      ) {
        await onForcedReauth(requestError);
      }

      throw requestError;
    }
  };
}

export function readStoredSessionSnapshot(
  localStorageRef = globalThis.localStorage,
) {
  if (!localStorageRef) {
    return null;
  }

  const canonicalUser = parseJson(localStorageRef.getItem("userData"));
  const legacyUser = parseJson(localStorageRef.getItem("user"));
  const currentUserData = parseJson(localStorageRef.getItem("currentUserData"));
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
  const preserveRedirectAfterLogin = options?.preserveRedirectAfterLogin;
  const redirectToPreserve =
    typeof preserveRedirectAfterLogin === "string" &&
    preserveRedirectAfterLogin.length > 0
      ? preserveRedirectAfterLogin
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

      if (failure.kind === "transport") {
        return { state: "verification_failed", user: null, error };
      }

      return { state: "non_refreshable", user: null, error };
    }
  };
}
