// ============================================================
// Admin feedback inbox (/admin) — standalone from the main app.
// ============================================================

// Block pinch-zoom on iOS Safari (it ignores user-scalable=no); double-tap
// zoom is handled by CSS touch-action.
["gesturestart", "gesturechange", "gestureend"].forEach(function (evt) {
  document.addEventListener(evt, function (e) { e.preventDefault(); }, { passive: false });
});

// Reuse the app's Google session (same origin) — /admin is gated server-side
// to the SUPERADMIN_EMAIL account.
let token = localStorage.getItem("tj-user-token") || null;
let feedbackList = [];
let usefulList = [];
let currentDetail = null;

const CATEGORY = {
  bug: { label: "Bug", cls: "tag-bug" },
  suggestion: { label: "Sugestão", cls: "tag-suggestion" },
  other: { label: "Outro", cls: "tag-other" },
};

function $(id) { return document.getElementById(id); }

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("on"); });
  const el = $(id);
  if (el) el.classList.add("on");
}

let toastTimer = null;
function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove("on"); }, 2500);
}

function escapeHTML(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  const s = Math.floor((now - d) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return "há " + m + " min";
  const h = Math.floor(m / 60);
  if (h < 24) return "há " + h + " h";
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 7) return "há " + days + " dias";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function catTag(category) {
  const c = CATEGORY[category] || { label: category || "—", cls: "tag-other" };
  return '<span class="tag ' + c.cls + '">' + escapeHTML(c.label) + "</span>";
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

async function api(method, url, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(url, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    logout();
    throw new Error("unauthorized");
  }
  return res;
}

function logout() {
  token = null;
  localStorage.removeItem("tj-user-token");
  localStorage.removeItem("tj-user");
  showScreen("s-login");
  renderGoogleButton();
}

// ------------------------------------------------------------
// Login (Google, gated to SUPERADMIN_EMAIL)
// ------------------------------------------------------------

async function handleGoogleCredential(response) {
  $("lg-msg").textContent = "Entrando…";
  try {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.token) {
      $("lg-msg").textContent = "Não foi possível entrar.";
      return;
    }
    token = data.token;
    localStorage.setItem("tj-user-token", token);
    tryEnter();
  } catch (err) {
    $("lg-msg").textContent = "Erro ao entrar.";
  }
}

// Enter the inbox if the current session is the superadmin, else show why not.
async function tryEnter() {
  try {
    const res = await fetch("/api/admin/feedback", { headers: { "Authorization": "Bearer " + token } });
    if (res.status === 200) {
      const data = await res.json();
      feedbackList = data.feedback || [];
      renderList(data.unread || 0);
      showScreen("s-list");
      return;
    }
    if (res.status === 403) {
      $("lg-msg").textContent = "Esta conta não tem acesso à área de admin.";
    } else {
      $("lg-msg").textContent = "Entre com a conta autorizada para ver os feedbacks.";
    }
    showScreen("s-login");
    renderGoogleButton();
  } catch (err) {
    $("lg-msg").textContent = "Erro ao carregar.";
  }
}

function renderGoogleButton() {
  const box = $("lg-gbtn");
  if (!box || !window.GOOGLE_CLIENT_ID) return;
  if (window.google && google.accounts && google.accounts.id) {
    box.innerHTML = "";
    google.accounts.id.renderButton(box, {
      theme: "outline", size: "large", type: "standard",
      text: "signin_with", shape: "pill", locale: "pt-BR",
    });
  } else {
    setTimeout(renderGoogleButton, 200);
  }
}

function initGoogle() {
  if (!window.GOOGLE_CLIENT_ID) return;
  if (!(window.google && google.accounts && google.accounts.id)) {
    setTimeout(initGoogle, 150);
    return;
  }
  google.accounts.id.initialize({ client_id: window.GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
  renderGoogleButton();
}

// ------------------------------------------------------------
// Feedback list
// ------------------------------------------------------------

async function loadList() {
  try {
    const res = await api("GET", "/api/admin/feedback");
    const data = await res.json();
    feedbackList = data.feedback || [];
    renderList(data.unread || 0);
    showScreen("s-list");
  } catch (err) { /* logout already handled */ }
}

function renderList(unread) {
  $("ls-sub").textContent = unread + " não lido" + (unread === 1 ? "" : "s") + " · " + feedbackList.length + " no total";

  const listEl = $("ls-list");
  listEl.innerHTML = "";
  $("ls-empty").classList.toggle("hidden", feedbackList.length > 0);
  listEl.classList.toggle("hidden", feedbackList.length === 0);

  feedbackList.forEach(function (fb) {
    const row = document.createElement("div");
    row.className = "fb-row" + (fb.is_read ? " read" : "");

    const dot = document.createElement("span");
    dot.className = "fb-dot" + (fb.is_read ? " hidden" : "");

    const main = document.createElement("button");
    main.className = "fb-main";
    main.style.cssText = "background:none;border:none;text-align:left;padding:0;";
    main.innerHTML =
      '<div class="fb-subj">' + escapeHTML(fb.subject || fb.message) + "</div>" +
      '<div class="fb-meta">' + catTag(fb.category) + "<span>" + timeAgo(fb.created_at) + "</span></div>";
    main.addEventListener("click", function () { openDetail(fb.id); });

    const del = document.createElement("button");
    del.className = "fb-ico";
    del.setAttribute("aria-label", "Excluir");
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
    del.addEventListener("click", function () { deleteFeedback(fb.id); });

    row.appendChild(dot);
    row.appendChild(main);
    row.appendChild(del);
    listEl.appendChild(row);
  });
}

function openDetail(id) {
  const fb = feedbackList.find(function (f) { return f.id === id; });
  if (!fb) return;
  currentDetail = fb;

  $("dt-title").textContent = fb.subject || "Feedback";
  $("dt-msg").textContent = fb.message;

  let tags = catTag(fb.category);
  if (fb.app_version) tags += '<span class="tag tag-plain">v' + escapeHTML(fb.app_version) + "</span>";
  if (fb.pelada_id) tags += '<span class="tag tag-plain">Pelada #' + fb.pelada_id + "</span>";
  tags += '<span class="tag tag-plain">' + timeAgo(fb.created_at) + "</span>";
  $("dt-tags").innerHTML = tags;

  const hasContact = !!fb.contact;
  $("dt-contact").classList.toggle("hidden", !hasContact);
  if (hasContact) $("dt-contact-val").textContent = fb.contact;

  showScreen("s-detail");

  if (!fb.is_read) markRead(fb);
}

async function markRead(fb) {
  try {
    await api("POST", "/api/admin/feedback/" + fb.id + "/read");
    fb.is_read = true;
    const unread = feedbackList.filter(function (f) { return !f.is_read; }).length;
    renderList(unread);
  } catch (err) { /* ignore */ }
}

async function deleteFeedback(id) {
  if (!window.confirm("Excluir este feedback?")) return;
  try {
    await api("DELETE", "/api/admin/feedback/" + id);
    feedbackList = feedbackList.filter(function (f) { return f.id !== id; });
    const unread = feedbackList.filter(function (f) { return !f.is_read; }).length;
    renderList(unread);
    if (document.querySelector(".screen.on").id === "s-detail") showScreen("s-list");
    showToast("Feedback excluído");
  } catch (err) { /* ignore */ }
}

async function markUseful() {
  if (!currentDetail) return;
  try {
    await api("POST", "/api/admin/feedback/" + currentDetail.id + "/useful");
    showToast("Adicionado aos úteis");
  } catch (err) { /* ignore */ }
}

// ------------------------------------------------------------
// Useful (to-do) list
// ------------------------------------------------------------

async function loadUseful() {
  try {
    const res = await api("GET", "/api/admin/useful");
    const data = await res.json();
    usefulList = data.useful || [];
    renderUseful();
    showScreen("s-useful");
  } catch (err) { /* ignore */ }
}

function renderUseful() {
  const listEl = $("uf-list");
  listEl.innerHTML = "";
  $("uf-empty").classList.toggle("hidden", usefulList.length > 0);
  listEl.classList.toggle("hidden", usefulList.length === 0);

  usefulList.forEach(function (item) {
    const row = document.createElement("div");
    row.className = "fb-row u-row" + (item.done ? " done" : "");

    const check = document.createElement("button");
    check.className = "u-check" + (item.done ? " done" : "");
    check.setAttribute("aria-label", item.done ? "Marcar como não feito" : "Marcar como feito");
    check.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
    check.addEventListener("click", function () { toggleUseful(item); });

    const main = document.createElement("div");
    main.className = "fb-main";
    main.innerHTML =
      '<div class="fb-subj">' + escapeHTML(item.subject) + "</div>" +
      '<div class="fb-meta">' + catTag(item.category) +
      (item.done ? "<span>feito</span>" : "") + "</div>";

    const del = document.createElement("button");
    del.className = "fb-ico";
    del.setAttribute("aria-label", "Remover");
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
    del.addEventListener("click", function () { deleteUseful(item.id); });

    row.appendChild(check);
    row.appendChild(main);
    row.appendChild(del);
    listEl.appendChild(row);
  });
}

async function toggleUseful(item) {
  try {
    const res = await api("PATCH", "/api/admin/useful/" + item.id, { done: !item.done });
    const updated = await res.json();
    item.done = updated.done;
    // Re-sort: pending first (matches the server ordering).
    usefulList.sort(function (a, b) { return (a.done - b.done); });
    renderUseful();
  } catch (err) { /* ignore */ }
}

async function deleteUseful(id) {
  if (!window.confirm("Remover da lista de úteis?")) return;
  try {
    await api("DELETE", "/api/admin/useful/" + id);
    usefulList = usefulList.filter(function (u) { return u.id !== id; });
    renderUseful();
  } catch (err) { /* ignore */ }
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
  const savedTheme = localStorage.getItem("pelada-theme");
  document.documentElement.setAttribute("data-theme", savedTheme === "dark" ? "dark" : "light");

  initGoogle();

  $("ls-back").addEventListener("click", function () { window.location.href = "/"; });
  $("ls-useful").addEventListener("click", loadUseful);
  $("dt-back").addEventListener("click", function () { showScreen("s-list"); });
  $("dt-useful").addEventListener("click", markUseful);
  $("dt-delete").addEventListener("click", function () { if (currentDetail) deleteFeedback(currentDetail.id); });
  $("uf-back").addEventListener("click", function () { loadList(); });

  if (token) {
    tryEnter();
  } else {
    showScreen("s-login");
  }
});
