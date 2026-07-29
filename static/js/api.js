// ============================================================
// Auth token (per-pelada session)
// ============================================================

let currentToken = localStorage.getItem("pelada-token") || null;

function setToken(token) {
  currentToken = token || null;
  if (currentToken) {
    localStorage.setItem("pelada-token", currentToken);
  } else {
    localStorage.removeItem("pelada-token");
  }
}

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (currentToken) {
    headers["Authorization"] = "Bearer " + currentToken;
  }
  return headers;
}

function handleSessionExpired() {
  setToken(null);
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
