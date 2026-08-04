// ============================================================
// Invites (phase 3): accept a shared link (/entrar/<token>) and, for
// owners/admins, generate/share/revoke links and manage members.
// ============================================================

const INVITE_ROLE_OPTS = [
  { value: "member", label: "Membro" },
  { value: "admin", label: "Admin" },
];
const INVITE_TTL_OPTS = [
  { value: 1, label: "1 hora" },
  { value: 24, label: "24 horas" },
  { value: 168, label: "7 dias" },
];

let inviteRole = "member";
let inviteTtl = 168;

function getPendingInvite() {
  return sessionStorage.getItem("tj-invite-token");
}
function setPendingInvite(token) {
  if (token) sessionStorage.setItem("tj-invite-token", token);
  else sessionStorage.removeItem("tj-invite-token");
}

// ------------------------------------------------------------
// Accept flow
// ------------------------------------------------------------

function detectInviteFromUrl() {
  const m = location.pathname.match(/^\/entrar\/(.+)$/);
  if (!m) return false;
  const token = decodeURIComponent(m[1]);
  setPendingInvite(token);
  // Clean the URL so a refresh doesn't keep the raw token in the address bar.
  history.replaceState({ tj: true }, "", "/");
  showInviteScreen(token);
  return true;
}

async function showInviteScreen(token) {
  showScreen("s-invite");
  const body = $("inv-body");
  body.innerHTML = '<p class="empty">Carregando convite…</p>';

  let data;
  try {
    const res = await fetch("/api/invites/" + encodeURIComponent(token));
    data = await res.json().catch(function () { return {}; });
  } catch (err) {
    body.innerHTML = inviteErrorHTML("Não foi possível carregar o convite.");
    wireInviteExit();
    return;
  }

  if (!data.valid) {
    const msg = data.reason === "expired" || data.reason === "revoked"
      ? "Este convite expirou. Peça um novo ao organizador."
      : "Convite inválido.";
    body.innerHTML = inviteErrorHTML(msg);
    setPendingInvite(null);
    wireInviteExit();
    return;
  }

  const roleTxt = data.role === "admin" ? "Admin" : "Membro";
  body.innerHTML =
    '<div class="inv-emoji">⚽</div>' +
    '<p class="inv-lead">Você foi convidado para</p>' +
    '<h2 class="inv-pelada">' + escapeHTML(data.pelada_name) + "</h2>" +
    '<p class="inv-role">como <b>' + roleTxt + "</b></p>" +
    '<div id="inv-action" style="margin-top:18px"></div>';

  const action = $("inv-action");
  if (typeof userToken !== "undefined" && userToken) {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = "Entrar na pelada";
    btn.addEventListener("click", function () { acceptInvite(token); });
    action.appendChild(btn);
  } else {
    action.innerHTML = '<p class="hint" style="margin-bottom:10px">Entre com sua conta Google para aceitar.</p><div id="inv-gbtn"></div>';
    renderGoogleButtonInto($("inv-gbtn"));
  }
}

function inviteErrorHTML(message) {
  return '<div class="inv-emoji">⌛</div><p class="inv-lead" style="margin-bottom:18px">' +
    escapeHTML(message) + "</p><div id=\"inv-action\"></div>";
}

function wireInviteExit() {
  const action = $("inv-action");
  if (!action) return;
  const btn = document.createElement("button");
  btn.className = "btn btn-ghost";
  btn.textContent = "Ir para o app";
  btn.addEventListener("click", goHome);
  action.appendChild(btn);
}

function renderGoogleButtonInto(container) {
  if (!container) return;
  if (window.google && google.accounts && google.accounts.id) {
    container.innerHTML = "";
    google.accounts.id.renderButton(container, {
      theme: "outline", size: "large", type: "standard",
      text: "signin_with", shape: "pill", locale: "pt-BR",
    });
  } else {
    setTimeout(function () { renderGoogleButtonInto(container); }, 200);
  }
}

async function acceptInvite(token) {
  try {
    const res = await fetch("/api/invites/" + encodeURIComponent(token) + "/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + userToken },
    });
    const data = await res.json().catch(function () { return {}; });

    if (res.status === 410) {
      $("inv-body").innerHTML = inviteErrorHTML("Este convite expirou. Peça um novo ao organizador.");
      setPendingInvite(null);
      wireInviteExit();
      return;
    }
    if (!res.ok || !data.ok) {
      showToast("Não foi possível aceitar o convite.");
      return;
    }

    setPendingInvite(null);
    showToast("Você entrou na pelada!");
    goHome();
  } catch (err) {
    showToast("Não foi possível aceitar o convite.");
  }
}

// Called from onAuthChanged (players.js) after login. Returns true if it
// handled the invite (so the home reload is skipped).
function handleInviteAfterAuth() {
  const current = document.querySelector(".screen.on");
  const onInvite = current && current.id === "s-invite";
  const token = getPendingInvite();
  if (onInvite && token && userToken) {
    acceptInvite(token);
    return true;
  }
  return false;
}

// ------------------------------------------------------------
// Manage: generate / share / revoke + members
// ------------------------------------------------------------

function openMembers() {
  closeSheets();
  inviteRole = "member";
  inviteTtl = 168;
  $("mb-sub").textContent = currentPeladaName || "";
  $("mb-link-box").classList.add("hidden");
  renderChipSelect($("mb-role"), INVITE_ROLE_OPTS, inviteRole, function (v) { inviteRole = v; });
  renderChipSelect($("mb-ttl"), INVITE_TTL_OPTS, inviteTtl, function (v) { inviteTtl = v; });
  loadInvites();
  loadMembers();
  showScreen("s-members");
}

function renderChipSelect(container, options, selected, onPick) {
  container.innerHTML = "";
  options.forEach(function (opt) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-opt" + (opt.value === selected ? " on" : "");
    btn.textContent = opt.label;
    btn.addEventListener("click", function () {
      onPick(opt.value);
      container.querySelectorAll(".chip-opt").forEach(function (b) { b.classList.remove("on"); });
      btn.classList.add("on");
    });
    container.appendChild(btn);
  });
}

async function generateInvite() {
  try {
    const invite = await fetchJSON("/api/peladas/" + currentPeladaId + "/invites", {
      method: "POST",
      body: JSON.stringify({ role: inviteRole, ttl_hours: inviteTtl }),
    });
    const link = location.origin + "/entrar/" + invite.token;
    $("mb-link").value = link;
    $("mb-link-box").classList.remove("hidden");
    loadInvites();
  } catch (err) {
    showToast("Erro ao gerar o convite.");
  }
}

function copyInviteLink() {
  const link = $("mb-link").value;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(function () { showToast("Link copiado"); });
  } else {
    $("mb-link").select();
    document.execCommand("copy");
    showToast("Link copiado");
  }
}

function shareInviteWhatsApp() {
  const link = $("mb-link").value;
  const text = "Entra na nossa pelada no Time Justo: " + link;
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
}

async function loadInvites() {
  const listEl = $("mb-invites");
  const emptyEl = $("mb-invites-empty");
  try {
    const invites = await fetchJSON("/api/peladas/" + currentPeladaId + "/invites");
    listEl.innerHTML = "";
    emptyEl.classList.toggle("hidden", invites.length > 0);
    listEl.classList.toggle("hidden", invites.length === 0);
    invites.forEach(function (inv) {
      const row = document.createElement("div");
      row.className = "row";
      const main = document.createElement("div");
      main.className = "r-main";
      main.innerHTML =
        '<span class="r-name">' + (inv.role === "admin" ? "Admin" : "Membro") + "</span>" +
        '<span class="r-meta">expira ' + inviteExpiryLabel(inv.expires_at) +
        " · " + inv.accepted_count + " entrou" + (inv.accepted_count === 1 ? "" : "ram") + "</span>";
      const revoke = document.createElement("button");
      revoke.className = "row-action";
      revoke.setAttribute("aria-label", "Revogar convite");
      revoke.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>';
      revoke.addEventListener("click", function () { revokeInvite(inv.token); });
      row.appendChild(main);
      row.appendChild(revoke);
      listEl.appendChild(row);
    });
  } catch (err) { /* ignore */ }
}

function inviteExpiryLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  const h = Math.round((d - now) / 3600000);
  if (h <= 0) return "em breve";
  if (h < 24) return "em " + h + "h";
  return "em " + Math.round(h / 24) + "d";
}

async function revokeInvite(token) {
  try {
    const res = await fetch("/api/invites/" + encodeURIComponent(token) + "/revoke", {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) { showToast("Erro ao revogar."); return; }
    showToast("Convite revogado");
    loadInvites();
  } catch (err) {
    showToast("Erro ao revogar.");
  }
}

async function loadMembers() {
  const listEl = $("mb-members");
  try {
    const members = await fetchJSON("/api/peladas/" + currentPeladaId + "/members");
    listEl.innerHTML = "";
    members.forEach(function (mem) {
      const row = document.createElement("div");
      row.className = "row";
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      if (mem.picture) { avatar.style.backgroundImage = "url(" + mem.picture + ")"; avatar.style.backgroundSize = "cover"; }
      else avatar.textContent = (mem.name || mem.email || "?").trim().slice(0, 1).toUpperCase();
      const main = document.createElement("div");
      main.className = "r-main";
      main.innerHTML =
        '<span class="r-name">' + escapeHTML(mem.name || mem.email) + "</span>" +
        '<span class="r-meta">' + roleLabel(mem.role) + "</span>";
      row.appendChild(avatar);
      row.appendChild(main);
      // Owners can't be removed here.
      if (mem.role !== "owner") {
        const rm = document.createElement("button");
        rm.className = "row-action";
        rm.setAttribute("aria-label", "Remover membro");
        rm.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
        rm.addEventListener("click", function () { removeMember(mem); });
        row.appendChild(rm);
      }
      listEl.appendChild(row);
    });
  } catch (err) { /* ignore */ }
}

function removeMember(mem) {
  openConfirmSheet(
    "Remover membro",
    "Remover " + (mem.name || mem.email) + " desta pelada?",
    "Remover",
    async function () {
      try {
        const res = await fetch("/api/peladas/" + currentPeladaId + "/members/" + mem.id, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!res.ok) { showToast("Erro ao remover."); return; }
        closeSheets();
        showToast("Membro removido");
        loadMembers();
      } catch (err) {
        showToast("Erro ao remover.");
      }
    }
  );
}

// ------------------------------------------------------------
// Wiring
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
  $("inv-back").addEventListener("click", goHome);
  $("mb-back").addEventListener("click", function () { showScreen("s-checkin"); });
  $("mn-members").addEventListener("click", openMembers);
  $("mb-generate").addEventListener("click", generateInvite);
  $("mb-copy").addEventListener("click", copyInviteLink);
  $("mb-whatsapp").addEventListener("click", shareInviteWhatsApp);

  detectInviteFromUrl();
});
