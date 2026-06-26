// ============================================================
// Fetch helpers
// ============================================================

async function fetchJSON(url, options) {
  options = options || {};
  const headers = { "Content-Type": "application/json" };
  if (currentPeladaId) {
    headers["X-Pelada-Id"] = String(currentPeladaId);
  }

  const res = await fetch(url, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Unexpected error");
  }

  return res.json();
}

async function fetchJSONRaw(url, options) {
  options = options || {};
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res;
}
