// ============================================================
// Home — lista de peladas
// ============================================================

let authTargetPelada = null;
let deleteTargetPelada = null;
let adminKeyMode = "admin"; // "admin" | "delete-pelada"
let confirmAction = null;

function goHome() {
  closeSheets();
  currentPeladaId = null;
  currentPeladaName = "";
  players = [];
  checkinState = {};
  lastDrawnTeams = [];
  localStorage.removeItem("pelada-current-id");
  localStorage.removeItem("pelada-current-name");
  showScreen("s-home");
  loadPeladas();
}

async function loadPeladas() {
  const loadingEl = $("pelada-loading");
  const emptyEl = $("pelada-empty");
  const listEl = $("pelada-list");

  loadingEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");
  listEl.innerHTML = "";

  try {
    const res = await fetch("/api/peladas");
    const peladas = await res.json();

    loadingEl.classList.add("hidden");

    if (peladas.length === 0) {
      emptyEl.classList.remove("hidden");
      return;
    }

    peladas.forEach(function (p) {
      const row = document.createElement("div");
      row.className = "row";
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.setAttribute("aria-label", "Entrar na pelada " + p.name);

      const avatar = document.createElement("div");
      avatar.className = "avatar hl";
      avatar.textContent = buildPlayerInitials(p.name);

      const main = document.createElement("div");
      main.className = "r-main";
      main.innerHTML =
        '<span class="r-name">' + escapeHTML(p.name) + "</span>" +
        '<span class="r-meta">' + p.player_count + " jogador" + (p.player_count === 1 ? "" : "es") + "</span>";

      const meta = main.querySelector(".r-meta");
      meta.appendChild(buildBibEl(p.team1_color, true));
      meta.appendChild(buildBibEl(p.team2_color, true));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "row-action";
      deleteBtn.setAttribute("aria-label", "Excluir pelada");
      deleteBtn.title = "Excluir pelada";
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>';
      deleteBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        startDeletePelada(p);
      });

      const chev = document.createElement("span");
      chev.className = "chev";
      chev.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';

      row.appendChild(avatar);
      row.appendChild(main);
      row.appendChild(deleteBtn);
      row.appendChild(chev);

      row.addEventListener("click", function () { openAuthSheet(p); });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openAuthSheet(p);
        }
      });
      listEl.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load peladas:", err);
    loadingEl.classList.add("hidden");
    showToast("Erro ao carregar peladas.");
  }
}

// ============================================================
// Auth
// ============================================================

function openAuthSheet(pelada) {
  authTargetPelada = pelada;
  $("au-name").textContent = pelada.name;
  $("au-pass").value = "";
  $("au-err").classList.remove("on");
  openSheet("auth");
  setTimeout(function () { $("au-pass").focus(); }, 100);
}

async function confirmAuth() {
  const pelada = authTargetPelada;
  if (!pelada) return;

  const password = $("au-pass").value.trim();
  const errEl = $("au-err");

  if (!password) {
    errEl.textContent = "Digite a palavra-passe.";
    errEl.classList.add("on");
    return;
  }

  try {
    const res = await fetchJSONRaw("/api/peladas/" + pelada.id + "/auth", {
      method: "POST",
      body: JSON.stringify({ password: password }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      errEl.textContent = "Palavra-passe incorreta.";
      errEl.classList.add("on");
      $("au-pass").value = "";
      $("au-pass").focus();
      return;
    }

    if (data.is_admin) {
      setAdminMode(true);
    }

    closeSheets();
    enterPelada(pelada);
  } catch (err) {
    console.error(err);
    errEl.textContent = "Erro ao autenticar.";
    errEl.classList.add("on");
  }
}

// ============================================================
// Entrar / sair da pelada
// ============================================================

function enterPelada(pelada) {
  currentPeladaId = pelada.id;
  currentPeladaName = pelada.name;
  currentTeam1Color = pelada.team1_color || "blue";
  currentTeam2Color = pelada.team2_color || "yellow";

  localStorage.setItem("pelada-current-id", String(pelada.id));
  localStorage.setItem("pelada-current-name", pelada.name);

  players = [];
  checkinState = {};
  lastDrawnTeams = [];

  $("ci-title").textContent = pelada.name;
  $("sq-title").textContent = pelada.name;
  $("ci-date").textContent = todayLabel();

  showScreen("s-checkin");
  renderCheckin();
  loadPlayers();
}

async function loadPlayers() {
  try {
    players = await fetchJSON("/api/players");
    checkinState = {};
    players.forEach(function (p) { checkinState[p.id] = false; });
    renderCheckin();
    renderSquad();
  } catch (err) {
    console.error("Failed to load players:", err);
    showToast("Erro ao carregar jogadores.");
  }
}

// ============================================================
// Tabs
// ============================================================

function setTab(tab) {
  closeSheets();
  if (tab === "hoje") {
    showScreen("s-checkin");
    renderCheckin();
  } else {
    showScreen("s-squad");
    renderSquad();
  }
}

// ============================================================
// Check-in
// ============================================================

function getPresentIds() {
  return Object.keys(checkinState)
    .filter(function (id) { return checkinState[id]; })
    .map(function (id) { return parseInt(id, 10); });
}

function renderCheckin() {
  const listEl = $("ci-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const presentCount = getPresentIds().length;
  const total = players.length;

  $("ci-empty").classList.toggle("hidden", total > 0);

  const sorted = players.slice().sort(function (a, b) {
    return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
  });

  sorted.forEach(function (p) {
    const isPresent = !!checkinState[p.id];

    const row = document.createElement("button");
    row.type = "button";
    row.className = "row " + (isPresent ? "checked" : "unchecked-dim");
    row.setAttribute("aria-pressed", String(isPresent));

    const avatar = document.createElement("div");
    avatar.className = "avatar" + (isPresent ? " hl" : "");
    avatar.textContent = buildPlayerInitials(p.name);

    const main = document.createElement("div");
    main.className = "r-main";
    main.innerHTML = '<span class="r-name">' + escapeHTML(p.name) + "</span>";

    const check = document.createElement("span");
    check.className = "check";
    check.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';

    row.appendChild(avatar);
    row.appendChild(main);
    row.appendChild(check);

    row.addEventListener("click", function () {
      checkinState[p.id] = !checkinState[p.id];
      renderCheckin();
    });

    listEl.appendChild(row);
  });

  $("ci-count").textContent = presentCount;
  $("ci-count-lbl").textContent =
    "presente" + (presentCount === 1 ? "" : "s") + " · de " + total;
  $("ci-cta").disabled = presentCount < 2;
  $("ci-cta-lbl").textContent =
    presentCount > 1 ? "Sortear times (" + presentCount + ")" : "Sortear times";
}

function checkAll(value) {
  players.forEach(function (p) { checkinState[p.id] = value; });
  renderCheckin();
}

// ============================================================
// Elenco
// ============================================================

function renderSquad() {
  const listEl = $("sq-list");
  if (!listEl || currentPeladaId == null) return;
  listEl.innerHTML = "";

  $("sq-count").textContent =
    players.length + " jogador" + (players.length === 1 ? "" : "es") + " cadastrado" + (players.length === 1 ? "" : "s");
  $("sq-empty").classList.toggle("hidden", players.length > 0);
  $("sq-admin-actions").classList.toggle("hidden", !isAdminMode);

  const sorted = players.slice().sort(function (a, b) {
    return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
  });

  sorted.forEach(function (p) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "row";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = buildPlayerInitials(p.name);

    const main = document.createElement("div");
    main.className = "r-main";
    let mainHTML = '<span class="r-name">' + escapeHTML(p.name) + "</span>";
    if (isAdminMode) {
      mainHTML +=
        '<span class="r-meta">' + buildStarsHTML(p.rating) +
        '<span class="rating-num">' + formatDecimal(p.rating) + "</span></span>";
    }
    main.innerHTML = mainHTML;

    row.appendChild(avatar);
    row.appendChild(main);

    if (isAdminMode) {
      const chev = document.createElement("span");
      chev.className = "chev";
      chev.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>';
      row.appendChild(chev);
      row.addEventListener("click", function () { openPlayerSheet(p); });
    }

    listEl.appendChild(row);
  });
}

// ============================================================
// Novo / editar jogador
// ============================================================

let editingPlayer = null;
let pfRating = 3;
let pfAttrs = { marking: 2, stamina: 2, scoring: 2 };

function refreshPlayerSheet() {
  renderStarInput($("pf-stars"), pfRating, function (value) {
    pfRating = value;
    refreshPlayerSheet();
  });
  $("pf-adv").classList.toggle("hidden", !isAdminMode);
  renderSeg($("pf-marking"), pfAttrs.marking, function (v) { pfAttrs.marking = v; refreshPlayerSheet(); });
  renderSeg($("pf-stamina"), pfAttrs.stamina, function (v) { pfAttrs.stamina = v; refreshPlayerSheet(); });
  renderSeg($("pf-scoring"), pfAttrs.scoring, function (v) { pfAttrs.scoring = v; refreshPlayerSheet(); });
}

function openPlayerSheet(player) {
  editingPlayer = player || null;

  $("pf-title").textContent = player ? "Editar jogador" : "Novo jogador";
  $("pf-sub").textContent = player ? player.name : "Nome e nível geral";
  $("pf-name").value = player ? player.name : "";
  $("pf-err").classList.remove("on");
  $("pf-delete").classList.toggle("hidden", !player || !isAdminMode);

  pfRating = player ? player.rating : 3;
  pfAttrs = player
    ? {
        marking: getAttributeValue(player, "marking"),
        stamina: getAttributeValue(player, "stamina"),
        scoring: getAttributeValue(player, "scoring"),
      }
    : { marking: 2, stamina: 2, scoring: 2 };

  refreshPlayerSheet();
  openSheet("player");
  if (!player) {
    setTimeout(function () { $("pf-name").focus(); }, 100);
  }
}

async function savePlayer() {
  const name = $("pf-name").value.trim();
  const errEl = $("pf-err");

  if (!name) {
    errEl.textContent = "Dê um nome ao jogador.";
    errEl.classList.add("on");
    return;
  }

  const payload = { name: name, rating: pfRating };
  if (isAdminMode) {
    payload.marking = pfAttrs.marking;
    payload.stamina = pfAttrs.stamina;
    payload.scoring = pfAttrs.scoring;
  }

  try {
    if (editingPlayer == null) {
      const newPlayer = await fetchJSON("/api/players", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      players.push(newPlayer);
      checkinState[newPlayer.id] = false;
      showToast(name + " entrou no elenco");
    } else {
      const updated = await fetchJSON("/api/players/" + editingPlayer.id, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      players = players.map(function (p) { return p.id === updated.id ? updated : p; });
      showToast("Jogador atualizado");
    }

    closeSheets();
    renderSquad();
    renderCheckin();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar jogador.");
  }
}

function askDeletePlayer() {
  if (!editingPlayer) return;
  const player = editingPlayer;
  openConfirmSheet(
    "Remover jogador",
    "Tem certeza que deseja remover " + player.name + "?",
    "Remover",
    async function () {
      try {
        await fetchJSON("/api/players/" + player.id, { method: "DELETE" });
        players = players.filter(function (p) { return p.id !== player.id; });
        delete checkinState[player.id];
        closeSheets();
        renderSquad();
        renderCheckin();
        showToast("Jogador removido");
      } catch (err) {
        console.error(err);
        showToast("Erro ao remover jogador.");
      }
    }
  );
}

// ============================================================
// Confirmação genérica
// ============================================================

function openConfirmSheet(title, message, actionLabel, onConfirm) {
  $("cf-title").textContent = title;
  $("cf-msg").textContent = message;
  $("cf-confirm").textContent = actionLabel;
  confirmAction = onConfirm;
  openSheet("confirm");
}

// ============================================================
// Chave admin (ativar modo admin / excluir pelada)
// ============================================================

function openAdminKeySheet(mode) {
  adminKeyMode = mode;
  $("ak-title").textContent = mode === "admin" ? "Ativar modo admin" : "Excluir pelada";
  $("ak-sub").textContent = "Digite a chave de administrador";
  $("ak-pass").value = "";
  $("ak-err").classList.remove("on");
  openSheet("adminkey");
  setTimeout(function () { $("ak-pass").focus(); }, 100);
}

function confirmAdminKey() {
  const key = $("ak-pass").value.trim();
  const errEl = $("ak-err");

  if (!key) {
    errEl.textContent = "Digite a chave admin.";
    errEl.classList.add("on");
    return;
  }

  if (key !== ADMIN_SECRET) {
    errEl.textContent = "Chave admin inválida.";
    errEl.classList.add("on");
    $("ak-pass").value = "";
    $("ak-pass").focus();
    return;
  }

  if (adminKeyMode === "admin") {
    setAdminMode(true);
    openSheet("menu");
    renderMenuSheet();
    showToast("Modo admin ativado");
    return;
  }

  // delete-pelada
  const pelada = deleteTargetPelada;
  if (!pelada) { closeSheets(); return; }
  openConfirmSheet(
    "Excluir pelada",
    "Excluir " + pelada.name + "? Essa ação é irreversível e remove todos os jogadores.",
    "Excluir",
    async function () {
      try {
        const res = await fetchJSONRaw("/api/peladas/" + pelada.id, {
          method: "DELETE",
          body: JSON.stringify({ admin_secret: ADMIN_SECRET }),
        });
        if (!res.ok) {
          showToast("Erro ao excluir pelada.");
          return;
        }
        closeSheets();
        showToast("Pelada excluída");
        loadPeladas();
      } catch (err) {
        console.error(err);
        showToast("Erro ao excluir pelada.");
      } finally {
        deleteTargetPelada = null;
      }
    }
  );
}

function startDeletePelada(pelada) {
  deleteTargetPelada = pelada;
  openAdminKeySheet("delete-pelada");
}

// ============================================================
// Ajustes (menu)
// ============================================================

function renderMenuSheet() {
  $("mn-name").textContent = currentPeladaName || "Ajustes";
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  $("mn-theme").classList.toggle("on", theme === "dark");
  refreshAdminUI();

  if (isAdminMode && currentPeladaId != null) {
    renderSwatches($("mn-c1"), currentTeam1Color, function (key) { saveColors(key, currentTeam2Color); });
    renderSwatches($("mn-c2"), currentTeam2Color, function (key) { saveColors(currentTeam1Color, key); });
    $("mn-same").classList.toggle("on", currentTeam1Color === currentTeam2Color);
  }
}

async function saveColors(team1Color, team2Color) {
  try {
    const res = await fetchJSONRaw("/api/peladas/" + currentPeladaId + "/colors", {
      method: "PATCH",
      body: JSON.stringify({
        admin_secret: ADMIN_SECRET,
        team1_color: team1Color,
        team2_color: team2Color,
      }),
    });

    if (!res.ok) {
      showToast("Erro ao salvar cores.");
      return;
    }

    currentTeam1Color = team1Color;
    currentTeam2Color = team2Color;
    renderMenuSheet();
    if (lastDrawnTeams.length > 0) renderTeams(lastDrawnTeams);
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar cores.");
  }
}

function toggleAdmin() {
  if (!isAdminMode) {
    openAdminKeySheet("admin");
    return;
  }
  setAdminMode(false);
  renderMenuSheet();
  showToast("Modo admin desativado");
}

// ============================================================
// Nova pelada (wizard)
// ============================================================

let wizard = { c1: "blue", c2: "yellow", rating: 3, players: [] };

function openWizard() {
  wizard = { c1: "blue", c2: "yellow", rating: 3, players: [] };
  $("wz-name").value = "";
  $("wz-pass").value = "";
  $("wz-pass2").value = "";
  $("wz-err").classList.remove("on");
  $("wz-player").value = "";
  renderWizardSwatches();
  renderWizardStars();
  renderWizardPlayers();
  showScreen("s-wiz1");
}

function renderWizardSwatches() {
  renderSwatches($("wz-c1"), wizard.c1, function (key) { wizard.c1 = key; renderWizardSwatches(); });
  renderSwatches($("wz-c2"), wizard.c2, function (key) { wizard.c2 = key; renderWizardSwatches(); });
}

function renderWizardStars() {
  renderStarInput($("wz-stars"), wizard.rating, function (value) {
    wizard.rating = value;
    renderWizardStars();
  });
}

function wizardNext() {
  const name = $("wz-name").value.trim();
  const pass = $("wz-pass").value;
  const pass2 = $("wz-pass2").value;
  const errEl = $("wz-err");

  if (!name) {
    errEl.textContent = "Dê um nome à pelada.";
    errEl.classList.add("on");
    return;
  }
  if (!pass.trim()) {
    errEl.textContent = "Defina uma palavra-passe.";
    errEl.classList.add("on");
    return;
  }
  if (pass !== pass2) {
    errEl.textContent = "As senhas não coincidem.";
    errEl.classList.add("on");
    return;
  }

  errEl.classList.remove("on");
  showScreen("s-wiz2");
  setTimeout(function () { $("wz-player").focus(); }, 100);
}

function renderWizardPlayers() {
  const listEl = $("wz-plist");
  listEl.innerHTML = "";

  wizard.players.forEach(function (p, index) {
    const row = document.createElement("div");
    row.className = "row";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = buildPlayerInitials(p.name);

    const main = document.createElement("div");
    main.className = "r-main";
    main.innerHTML =
      '<span class="r-name">' + escapeHTML(p.name) + "</span>" +
      '<span class="r-meta">' + buildStarsHTML(p.rating) + "</span>";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "row-action";
    removeBtn.setAttribute("aria-label", "Remover jogador");
    removeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    removeBtn.addEventListener("click", function () {
      wizard.players.splice(index, 1);
      renderWizardPlayers();
    });

    row.appendChild(avatar);
    row.appendChild(main);
    row.appendChild(removeBtn);
    listEl.appendChild(row);
  });

  $("wz-plist-lbl").textContent =
    wizard.players.length + " jogador" + (wizard.players.length === 1 ? "" : "es");
}

function wizardAddPlayer() {
  const input = $("wz-player");
  const name = input.value.trim();
  if (!name) return;

  wizard.players.push({ name: name, rating: wizard.rating });
  input.value = "";
  wizard.rating = 3;
  renderWizardStars();
  renderWizardPlayers();
  input.focus();
}

async function wizardCreate() {
  const name = $("wz-name").value.trim();
  const password = $("wz-pass").value.trim();

  try {
    const res = await fetchJSONRaw("/api/peladas", {
      method: "POST",
      body: JSON.stringify({
        name: name,
        password: password,
        team1_color: wizard.c1,
        team2_color: wizard.c2,
      }),
    });

    const pelada = await res.json();

    if (!res.ok) {
      showToast("Erro ao criar pelada.");
      return;
    }

    for (const p of wizard.players) {
      await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pelada-Id": String(pelada.id),
        },
        body: JSON.stringify({ name: p.name, rating: p.rating }),
      });
    }

    setAdminMode(true);
    showToast("Pelada criada");
    enterPelada({
      id: pelada.id,
      name: name,
      team1_color: wizard.c1,
      team2_color: wizard.c2,
    });
  } catch (err) {
    console.error(err);
    showToast("Erro ao criar pelada.");
  }
}

// ============================================================
// Event listeners
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  loadTheme();
  loadAdminMode();

  // Home
  document.querySelectorAll(".theme-btn").forEach(function (btn) {
    btn.addEventListener("click", toggleTheme);
  });
  $("new-pelada-btn").addEventListener("click", openWizard);

  // Auth
  $("au-cancel").addEventListener("click", function () { closeSheets(); });
  $("au-confirm").addEventListener("click", confirmAuth);
  $("au-pass").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); confirmAuth(); }
  });

  // Check-in
  $("ci-back").addEventListener("click", goHome);
  $("ci-menu-btn").addEventListener("click", function () { renderMenuSheet(); openSheet("menu"); });
  $("ci-mark-all").addEventListener("click", function () { checkAll(true); });
  $("ci-clear").addEventListener("click", function () { checkAll(false); });

  // Tabs
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setTab(tab.dataset.tab); });
  });

  // Elenco
  $("sq-back").addEventListener("click", goHome);
  $("sq-menu-btn").addEventListener("click", function () { renderMenuSheet(); openSheet("menu"); });
  $("sq-add-btn").addEventListener("click", function () { openPlayerSheet(null); });

  // Jogador
  $("pf-cancel").addEventListener("click", function () { closeSheets(); });
  $("pf-save").addEventListener("click", savePlayer);
  $("pf-delete").addEventListener("click", askDeletePlayer);

  // Confirmação
  $("cf-cancel").addEventListener("click", function () { closeSheets(); });
  $("cf-confirm").addEventListener("click", function () {
    if (confirmAction) confirmAction();
  });

  // Chave admin
  $("ak-cancel").addEventListener("click", function () {
    if (adminKeyMode === "admin") {
      renderMenuSheet();
      openSheet("menu");
    } else {
      deleteTargetPelada = null;
      closeSheets();
    }
  });
  $("ak-confirm").addEventListener("click", confirmAdminKey);
  $("ak-pass").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); confirmAdminKey(); }
  });

  // Ajustes
  $("mn-theme").addEventListener("click", toggleTheme);
  $("mn-admin").addEventListener("click", toggleAdmin);
  $("mn-leave").addEventListener("click", goHome);
  $("mn-done").addEventListener("click", function () { closeSheets(); });

  // Wizard
  $("wz-close").addEventListener("click", goHome);
  $("wz-back").addEventListener("click", function () { showScreen("s-wiz1"); });
  $("wz-next").addEventListener("click", wizardNext);
  $("wz-add").addEventListener("click", wizardAddPlayer);
  $("wz-create").addEventListener("click", wizardCreate);
  $("wz-player").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); wizardAddPlayer(); }
  });

  // Veil fecha sheets
  $("veil").addEventListener("click", function () { closeSheets(); });

  loadPeladas();
});
