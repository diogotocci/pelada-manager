// ============================================================
// Requests carry the user session token (from auth.js) and the current
// pelada id. The server authorizes by the caller's membership role.
// ============================================================

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (typeof userToken !== "undefined" && userToken) {
    headers["Authorization"] = "Bearer " + userToken;
  }
  if (typeof currentPeladaId !== "undefined" && currentPeladaId != null) {
    headers["X-Pelada-Id"] = String(currentPeladaId);
  }
  return headers;
}

function handleSessionExpired() {
  if (typeof logoutUser === "function") logoutUser();
  if (typeof showToast === "function") showToast("Sessão expirada. Entre de novo.");
  if (typeof goHome === "function") goHome();
}

// ============================================================
// Fetch helpers
// ============================================================

async function fetchJSON(url, options) {
  options = options || {};
  const res = await fetch(url, {
    headers: authHeaders(),
    ...options,
  });

  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Sessão expirada");
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Unexpected error");
  }

  return res.json();
}

async function fetchJSONRaw(url, options) {
  options = options || {};
  const res = await fetch(url, {
    headers: authHeaders(),
    ...options,
  });
  return res;
}
