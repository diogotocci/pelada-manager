// ============================================================
// Google login (phase 1) — authenticates the user in parallel with
// the current per-pelada password flow. The session token identifies
// the user; it is not yet used to authorize pelada access (phase 2).
// ============================================================

let userToken = localStorage.getItem("tj-user-token") || null;

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("tj-user") || "null");
  } catch (e) {
    return null;
  }
}

function setUserSession(token, user) {
  userToken = token;
  localStorage.setItem("tj-user-token", token);
  localStorage.setItem("tj-user", JSON.stringify(user));
}

function clearUserSession() {
  userToken = null;
  localStorage.removeItem("tj-user-token");
  localStorage.removeItem("tj-user");
}

async function handleGoogleCredential(response) {
  try {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.token) {
      console.error("Login failed:", res.status, data);
      showToast(res.status === 503 ? "Login indisponível." : "Não foi possível entrar.");
      return;
    }
    setUserSession(data.token, data.user);
    renderAccountBar();
    if (typeof onAuthChanged === "function") onAuthChanged();
    showToast("Bem-vindo, " + (data.user.name || data.user.email) + "!");
  } catch (err) {
    showToast("Não foi possível entrar.");
  }
}

function logoutUser() {
  clearUserSession();
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }
  renderAccountBar();
  if (typeof onAuthChanged === "function") onAuthChanged();
}

function renderAccountBar() {
  const bar = document.getElementById("account-bar");
  if (!bar) return;

  // Login not configured (no client id) — hide the whole bar.
  if (!window.GOOGLE_CLIENT_ID) {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");

  const user = getCurrentUser();
  const btnBox = document.getElementById("google-btn");
  const info = document.getElementById("account-info");

  if (user) {
    btnBox.classList.add("hidden");
    info.classList.remove("hidden");
    document.getElementById("account-name").textContent = user.name || user.email;
    const avatar = document.getElementById("account-avatar");
    if (user.picture) {
      avatar.style.backgroundImage = "url(" + user.picture + ")";
      avatar.textContent = "";
    } else {
      avatar.style.backgroundImage = "";
      avatar.textContent = (user.name || user.email || "?").trim().slice(0, 1).toUpperCase();
    }
    return;
  }

  info.classList.add("hidden");
  btnBox.classList.remove("hidden");
  btnBox.innerHTML = "";
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.renderButton(btnBox, {
      theme: "outline", size: "large", type: "standard",
      text: "signin_with", shape: "pill", locale: "pt-BR",
    });
  }
}

// Revalidate a stored session against the server; drop it if invalid.
async function refreshUserSession() {
  if (!userToken) return;
  try {
    const res = await fetch("/api/me", {
      headers: { "Authorization": "Bearer " + userToken },
    });
    if (res.ok) {
      const user = await res.json();
      localStorage.setItem("tj-user", JSON.stringify(user));
    } else if (res.status === 401) {
      clearUserSession();
    }
  } catch (err) { /* offline — keep the cached session */ }
  renderAccountBar();
  if (typeof onAuthChanged === "function") onAuthChanged();
}

function initGoogleLogin() {
  if (!window.GOOGLE_CLIENT_ID) {
    renderAccountBar();
    return;
  }
  // The GIS script loads async; wait until it is ready.
  if (!(window.google && google.accounts && google.accounts.id)) {
    setTimeout(initGoogleLogin, 150);
    return;
  }
  google.accounts.id.initialize({
    client_id: window.GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
  });
  renderAccountBar();
}

document.addEventListener("DOMContentLoaded", function () {
  const logoutBtn = document.getElementById("account-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
  initGoogleLogin();
  refreshUserSession();
});
