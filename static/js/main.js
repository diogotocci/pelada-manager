// ============================================================
// State
// ============================================================

let players = [];
let currentEditingId = null;
let deleteTargetId = null;
let lastTeamSize = 5;
let lastDrawnTeams = [];
let isAdminMode = false;
let checkinState = {};
let currentPeladaId = null;
let currentPeladaName = "";

const ADMIN_SECRET = window.ADMIN_SECRET || "";
const DEPLOY_ENDPOINT_BASE_URL = "https://peladamanager.bandeira.dev/deploy";

// ============================================================
// DOM references — main app
// ============================================================

const playersListEl = document.getElementById("players-list");
const playerCountEl = document.getElementById("player-count");
const teamsSectionEl = document.getElementById("teams-section");
const teamsResultEl = document.getElementById("teams-result");
const appHeaderTitleEl = document.getElementById("app-header-title");
const appHeaderSubEl = document.getElementById("app-header-sub");
const backToPeladasBtn = document.getElementById("back-to-peladas-btn");

const playerModalEl = document.getElementById("player-modal");
const confirmModalEl = document.getElementById("confirm-modal");
const drawModalEl = document.getElementById("draw-modal");
const compareModalEl = document.getElementById("compare-modal");
const auditModalEl = document.getElementById("audit-modal");
const deployModalEl = document.getElementById("deploy-modal");
const checkinModalEl = document.getElementById("checkin-modal");

const playerModalTitleEl = document.getElementById("player-modal-title");
const playerFormEl = document.getElementById("player-form");
const playerIdInput = document.getElementById("player-id");
const playerNameInput = document.getElementById("player-name");
const playerRatingInput = document.getElementById("player-rating");
const playerMarkingInput = document.getElementById("player-marking");
const playerStaminaInput = document.getElementById("player-stamina");
const playerScoringInput = document.getElementById("player-scoring");
const starWidgetEl = document.getElementById("star-widget");
const cancelPlayerBtn = document.getElementById("cancel-player-btn");
const advancedAttributesSectionEl = document.getElementById("advanced-attributes-section");

const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

const teamSizeInput = document.getElementById("team-size-input");
const cancelDrawBtn = document.getElementById("cancel-draw-btn");
const confirmDrawBtn = document.getElementById("confirm-draw-btn");

const fabAddPlayerBtn = document.getElementById("fab-add-player");
const toggleThemeBtn = document.getElementById("toggle-theme-btn");
const adminModeBtn = document.getElementById("admin-mode-btn");
const deployBtn = document.getElementById("deploy-btn");
const drawTeamsBtn = document.getElementById("draw-teams-btn");
const redrawBtn = document.getElementById("redraw-btn");
const compareBtn = document.getElementById("compare-btn");
const clearAllBtn = document.getElementById("clear-all-btn");
const exportJsonBtn = document.getElementById("export-json-btn");

const compareContentEl = document.getElementById("compare-content");
const closeCompareBtn = document.getElementById("close-compare-btn");

const auditContentEl = document.getElementById("audit-content");
const closeAuditBtn = document.getElementById("close-audit-btn");

const deployMainRadio = document.getElementById("deploy-main-radio");
const deployCustomRadio = document.getElementById("deploy-custom-radio");
const deployCustomBranchInput = document.getElementById("deploy-custom-branch-input");
const cancelDeployBtn = document.getElementById("cancel-deploy-btn");
const confirmDeployBtn = document.getElementById("confirm-deploy-btn");
const deployErrorEl = document.getElementById("deploy-error");

const checkinSessionDateEl = document.getElementById("checkin-session-date");
const checkinTotalLabelEl = document.getElementById("checkin-total-label");
const checkinPresentBadgeEl = document.getElementById("checkin-present-badge");
const checkinPlayersListEl = document.getElementById("checkin-players-list");
const cancelCheckinBtn = document.getElementById("cancel-checkin-btn");
const confirmCheckinBtn = document.getElementById("confirm-checkin-btn");
const confirmCheckinLabelEl = document.getElementById("confirm-checkin-label");

// ============================================================
// DOM references — pelada screens
// ============================================================

const peladaScreenEl = document.getElementById("pelada-screen");
const appContainerEl = document.getElementById("app-container");
const peladaListEl = document.getElementById("pelada-list");
const peladaLoadingEl = document.getElementById("pelada-loading");
const peladaEmptyEl = document.getElementById("pelada-empty");

const authModalEl = document.getElementById("auth-modal");
const authPeladaNameEl = document.getElementById("auth-pelada-name");
const authPasswordInput = document.getElementById("auth-password-input");
const authErrorEl = document.getElementById("auth-error");
const cancelAuthBtn = document.getElementById("cancel-auth-btn");
const confirmAuthBtn = document.getElementById("confirm-auth-btn");

const createModalEl = document.getElementById("create-pelada-modal");
const createStep1El = document.getElementById("create-step-1");
const createStep2El = document.getElementById("create-step-2");
const createNameInput = document.getElementById("create-pelada-name");
const createPassInput = document.getElementById("create-pelada-pass");
const createPass2Input = document.getElementById("create-pelada-pass2");
const createPassErrorEl = document.getElementById("create-pass-error");
const cancelCreateBtn = document.getElementById("cancel-create-btn");
const nextCreateBtn = document.getElementById("next-create-btn");
const backCreateBtn = document.getElementById("back-create-btn");
const confirmCreateBtn = document.getElementById("confirm-create-btn");
const createWizardPlayerNameInput = document.getElementById("wizard-player-name");
const createWizardStarWidgetEl = document.getElementById("wizard-star-widget");
const createWizardPlayerRatingInput = document.getElementById("wizard-player-rating");
const addWizardPlayerBtn = document.getElementById("add-wizard-player-btn");
const wizardPlayersListEl = document.getElementById("wizard-players-list");
const wizardPlayerCountEl = document.getElementById("wizard-player-count");
const newPeladaBtn = document.getElementById("new-pelada-btn");

// ============================================================
// Pelada screen state
// ============================================================

let authTargetPeladaId = null;
let authTargetPeladaName = "";
let wizardPlayers = [];
let wizardPlayerRating = 3;
let newPeladaId = null;

// ============================================================
// Theme
// ============================================================

function loadTheme() {
  const saved = localStorage.getItem("pelada-theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
  if (!toggleThemeBtn) return;
  const icon = toggleThemeBtn.querySelector("i");
  if (!icon) return;
  if (theme === "light") {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  } else {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
  }
}

// ============================================================
// Admin mode
// ============================================================

function loadAdminMode() {
  isAdminMode = localStorage.getItem("pelada-admin-mode") === "true";
  updateAdminModeUI();
}

function updateAdminModeUI() {
  if (adminModeBtn) {
    adminModeBtn.classList.toggle("admin-active", isAdminMode);
  }
  if (deployBtn) {
    deployBtn.classList.toggle("hidden", !isAdminMode);
  }
  if (advancedAttributesSectionEl) {
    advancedAttributesSectionEl.classList.toggle("hidden", !isAdminMode);
  }
  if (players.length > 0) {
    renderPlayers();
  }
  if (lastDrawnTeams.length > 0) {
    renderTeams(lastDrawnTeams);
  }
}

function handleAdminModeClick() {
  if (isAdminMode) {
    const shouldDisable = confirm("Deseja sair do modo admin?");
    if (!shouldDisable) return;
    isAdminMode = false;
    localStorage.removeItem("pelada-admin-mode");
    updateAdminModeUI();
    return;
  }

  const secret = prompt("Digite a chave admin:");
  if (secret !== ADMIN_SECRET) {
    alert("Chave admin invalida.");
    return;
  }

  isAdminMode = true;
  localStorage.setItem("pelada-admin-mode", "true");
  updateAdminModeUI();
  alert("Modo admin ativado.");
}

// ============================================================
// Modal helpers
// ============================================================

function openModal(el) {
  if (!el) return;
  el.classList.remove("hidden");
}

function closeModal(el) {
  if (!el) return;
  el.classList.add("hidden");
}

// ============================================================
// Fetch helper — always sends X-Pelada-Id when available
// ============================================================

async function fetchJSON(url, options = {}) {
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

async function fetchJSONRaw(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res;
}

// ============================================================
// Stars
// ============================================================

function buildStarsHTML(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      html += '<i class="fa-solid fa-star"></i>';
    } else if (rating >= i - 0.5) {
      html += '<i class="fa-regular fa-star-half-stroke"></i>';
    } else {
      html += '<i class="fa-regular fa-star"></i>';
    }
  }
  return html;
}

function renderStarWidget(element, rating, ratingInput) {
  if (!element) return;
  element.innerHTML = "";
  const currentRating = rating ?? 0;
  element.dataset.rating = currentRating.toString();

  for (let i = 1; i <= 5; i++) {
    const starEl = document.createElement("span");
    starEl.classList.add("star");
    starEl.dataset.index = i.toString();

    const icon = document.createElement("i");
    if (currentRating >= i) {
      icon.className = "fa-solid fa-star";
    } else if (currentRating >= i - 0.5) {
      icon.className = "fa-regular fa-star-half-stroke";
    } else {
      icon.className = "fa-regular fa-star";
    }

    starEl.appendChild(icon);
    element.appendChild(starEl);
  }
}

function updateStarWidgetFromClick(element, clickedIndex, ratingInput) {
  if (!element) return;
  const current = parseFloat(element.dataset.rating || "0");
  const i = clickedIndex;
  let newRating;

  if (current < i - 0.5) {
    newRating = i - 0.5;
  } else if (current < i) {
    newRating = i;
  } else {
    newRating = i - 0.5;
  }

  if (newRating < 0) newRating = 0;
  if (newRating > 5) newRating = 5;

  element.dataset.rating = newRating.toString();
  renderStarWidget(element, newRating, ratingInput);
  if (ratingInput) ratingInput.value = newRating.toString();
}

function getAttributeValue(player, attributeName) {
  return Number(player[attributeName] ?? 2);
}

// ============================================================
// Pelada screen
// ============================================================

function showPeladaScreen() {
  peladaScreenEl.classList.remove("hidden");
  appContainerEl.classList.add("hidden");
  loadPeladas();
}

function showAppScreen(peladaId, peladaName) {
  currentPeladaId = peladaId;
  currentPeladaName = peladaName;

  // Hide pelada screen and show app screen before loading players
  peladaScreenEl.classList.add("hidden");
  appContainerEl.classList.remove("hidden");

  if (appHeaderTitleEl) appHeaderTitleEl.textContent = peladaName;
  if (appHeaderSubEl) appHeaderSubEl.textContent = "Sorteio de times equilibrados";

  localStorage.setItem("pelada-current-id", String(peladaId));
  localStorage.setItem("pelada-current-name", peladaName);

  players = [];
  lastDrawnTeams = [];
  teamsSectionEl.classList.add("hidden");
  playersListEl.innerHTML = "";
  playerCountEl.textContent = "Carregando...";

  loadPlayers();
}

async function loadPeladas() {
  peladaLoadingEl.classList.remove("hidden");
  peladaEmptyEl.classList.add("hidden");
  peladaListEl.innerHTML = "";

  try {
    const res = await fetch("/api/peladas");
    const peladas = await res.json();

    peladaLoadingEl.classList.add("hidden");

    if (peladas.length === 0) {
      peladaEmptyEl.classList.remove("hidden");
      return;
    }

    peladas.forEach(function (p) {
      const card = document.createElement("div");
      card.className = "pelada-card";

      const initials = p.name.trim().split(/\s+/).map(function (w) { return w[0]; }).join("").substring(0, 2).toUpperCase();

      card.innerHTML =
        '<div class="pelada-card-avatar">' + initials + '</div>' +
        '<div class="pelada-card-info">' +
          '<div class="pelada-card-name">' + p.name + '</div>' +
          '<div class="pelada-card-meta">' + p.player_count + ' jogador(es)</div>' +
        '</div>' +
        '<i class="fa-solid fa-lock pelada-card-lock" aria-hidden="true"></i>';

      card.addEventListener("click", function () {
        openAuthModal(p.id, p.name);
      });

      peladaListEl.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load peladas:", err);
    peladaLoadingEl.classList.add("hidden");
  }
}

function openAuthModal(peladaId, peladaName) {
  authTargetPeladaId = peladaId;
  authTargetPeladaName = peladaName;
  authPeladaNameEl.textContent = peladaName;
  authPasswordInput.value = "";
  authErrorEl.classList.add("hidden");
  openModal(authModalEl);
  setTimeout(function () { authPasswordInput.focus(); }, 100);
}

async function confirmAuth() {
  const password = authPasswordInput.value.trim();
  if (!password) {
    authErrorEl.textContent = "Digite a palavra-passe.";
    authErrorEl.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetchJSONRaw("/api/peladas/" + authTargetPeladaId + "/auth", {
      method: "POST",
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      authErrorEl.textContent = "Palavra-passe incorreta.";
      authErrorEl.classList.remove("hidden");
      authPasswordInput.value = "";
      authPasswordInput.focus();
      return;
    }

    if (data.is_admin) {
      isAdminMode = true;
      localStorage.setItem("pelada-admin-mode", "true");
    }

    closeModal(authModalEl);
    showAppScreen(authTargetPeladaId, authTargetPeladaName);
  } catch (err) {
    console.error(err);
    authErrorEl.textContent = "Erro ao autenticar.";
    authErrorEl.classList.remove("hidden");
  }
}

// ============================================================
// Create pelada wizard
// ============================================================

function openCreateModal() {
  createNameInput.value = "";
  createPassInput.value = "";
  createPass2Input.value = "";
  createPassErrorEl.classList.add("hidden");
  wizardPlayers = [];
  wizardPlayerRating = 3;
  renderWizardPlayerList();
  renderStarWidget(createWizardStarWidgetEl, 3, createWizardPlayerRatingInput);
  if (createWizardPlayerRatingInput) createWizardPlayerRatingInput.value = "3";
  showCreateStep(1);
  openModal(createModalEl);
}

function showCreateStep(step) {
  createStep1El.classList.toggle("hidden", step !== 1);
  createStep2El.classList.toggle("hidden", step !== 2);
}

function validateCreateStep1() {
  const name = createNameInput.value.trim();
  const pass = createPassInput.value.trim();
  const pass2 = createPass2Input.value.trim();

  if (!name) {
    createPassErrorEl.textContent = "Informe o nome da pelada.";
    createPassErrorEl.classList.remove("hidden");
    return false;
  }

  if (!pass) {
    createPassErrorEl.textContent = "Informe a palavra-passe.";
    createPassErrorEl.classList.remove("hidden");
    return false;
  }

  if (pass !== pass2) {
    createPassErrorEl.textContent = "As palavras-passe nao coincidem.";
    createPassErrorEl.classList.remove("hidden");
    return false;
  }

  createPassErrorEl.classList.add("hidden");
  return true;
}

function buildPlayerInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderWizardPlayerList() {
  wizardPlayersListEl.innerHTML = "";
  wizardPlayers.forEach(function (p, idx) {
    const row = document.createElement("div");
    row.className = "wizard-player-row";

    const avatar = document.createElement("div");
    avatar.className = "wizard-player-avatar";
    avatar.textContent = buildPlayerInitials(p.name);

    const nameEl = document.createElement("span");
    nameEl.className = "wizard-player-name";
    nameEl.textContent = p.name;

    const starsEl = document.createElement("span");
    starsEl.className = "wizard-player-stars";
    starsEl.innerHTML = buildStarsHTML(p.rating);

    const removeBtn = document.createElement("button");
    removeBtn.className = "wizard-player-remove";
    removeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    removeBtn.setAttribute("aria-label", "Remover jogador");
    removeBtn.addEventListener("click", function () {
      wizardPlayers.splice(idx, 1);
      renderWizardPlayerList();
    });

    row.appendChild(avatar);
    row.appendChild(nameEl);
    row.appendChild(starsEl);
    row.appendChild(removeBtn);
    wizardPlayersListEl.appendChild(row);
  });

  wizardPlayerCountEl.textContent = wizardPlayers.length + " jogador(es) adicionado(s)";
}

function addWizardPlayer() {
  const name = createWizardPlayerNameInput.value.trim();
  if (!name) return;

  const rating = parseFloat(createWizardPlayerRatingInput.value || "3");
  wizardPlayers.push({ name, rating });
  createWizardPlayerNameInput.value = "";
  wizardPlayerRating = 3;
  renderStarWidget(createWizardStarWidgetEl, 3, createWizardPlayerRatingInput);
  if (createWizardPlayerRatingInput) createWizardPlayerRatingInput.value = "3";
  renderWizardPlayerList();
  createWizardPlayerNameInput.focus();
}

async function confirmCreate() {
  const name = createNameInput.value.trim();
  const password = createPassInput.value.trim();

  try {
    const res = await fetchJSONRaw("/api/peladas", {
      method: "POST",
      body: JSON.stringify({ name, password }),
    });

    const pelada = await res.json();

    if (!res.ok) {
      alert("Erro ao criar pelada.");
      return;
    }

    newPeladaId = pelada.id;

    for (const p of wizardPlayers) {
      await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pelada-Id": String(newPeladaId),
        },
        body: JSON.stringify({ name: p.name, rating: p.rating }),
      });
    }

    closeModal(createModalEl);
    isAdminMode = true;
    localStorage.setItem("pelada-admin-mode", "true");
    showAppScreen(newPeladaId, name);
  } catch (err) {
    console.error(err);
    alert("Erro ao criar pelada.");
  }
}

// ============================================================
// Players
// ============================================================

async function loadPlayers() {
  try {
    players = await fetchJSON("/api/players");
    renderPlayers();
    // Delay ensures the app screen is fully painted before the modal appears.
    // Required for Safari/iOS WebKit which may block DOM updates mid-async chain.
    setTimeout(function () {
      openCheckinModal();
    }, 300);
  } catch (err) {
    console.error("Failed to load players:", err);
    playerCountEl.textContent = "Erro ao carregar jogadores.";
  }
}

function renderPlayers() {
  playersListEl.innerHTML = "";

  const total = players.length;
  const activeCount = players.filter(function (p) { return p.active; }).length;

  if (total === 0) {
    playerCountEl.textContent = "Nenhum jogador cadastrado ainda.";
    return;
  }

  playerCountEl.textContent = total + " jogador(es) \u00b7 " + activeCount + " selecionado(s)";

  const sortedPlayers = [...players].sort(function (a, b) {
    return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
  });

  sortedPlayers.forEach(function (p) {
    const row = document.createElement("div");
    row.className = "player-row";
    row.dataset.id = p.id;

    const avatar = document.createElement("div");
    avatar.className = "player-avatar" + (p.active ? " player-avatar-active" : "");
    avatar.textContent = buildPlayerInitials(p.name);

    const info = document.createElement("div");
    info.className = "player-info" + (isAdminMode ? "" : " player-info-centered");

    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    nameSpan.textContent = p.name;

    info.appendChild(nameSpan);

    if (isAdminMode) {
      const starsRow = document.createElement("div");
      starsRow.className = "player-stars-row";

      const starsSpan = document.createElement("span");
      starsSpan.className = "player-stars";
      starsSpan.innerHTML = buildStarsHTML(p.rating);

      const ratingText = document.createElement("span");
      ratingText.className = "player-rating-text";
      ratingText.textContent = p.rating.toFixed(1);

      starsRow.appendChild(starsSpan);
      starsRow.appendChild(ratingText);
      info.appendChild(starsRow);
    }

    const actions = document.createElement("div");
    actions.className = "player-actions";

    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";

    const switchInput = document.createElement("input");
    switchInput.type = "checkbox";
    switchInput.className = "toggle-active";
    switchInput.checked = p.active;

    const slider = document.createElement("span");
    slider.className = "slider";

    switchLabel.appendChild(switchInput);
    switchLabel.appendChild(slider);
    actions.appendChild(switchLabel);

    if (isAdminMode) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon edit-player";
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-icon delete-player";
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
    }

    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(actions);
    playersListEl.appendChild(row);
  });
}

function resetAdvancedAttributes() {
  playerMarkingInput.value = "2";
  playerStaminaInput.value = "2";
  playerScoringInput.value = "2";
}

function openNewPlayerModal() {
  currentEditingId = null;
  playerModalTitleEl.textContent = "Novo jogador";
  playerIdInput.value = "";
  playerNameInput.value = "";
  playerRatingInput.value = "0";
  resetAdvancedAttributes();
  renderStarWidget(starWidgetEl, 0, playerRatingInput);
  updateAdminModeUI();
  openModal(playerModalEl);
  playerNameInput.focus();
}

function openEditPlayerModal(player) {
  currentEditingId = player.id;
  playerModalTitleEl.textContent = "Editar jogador";
  playerIdInput.value = player.id;
  playerNameInput.value = player.name;
  playerRatingInput.value = player.rating.toString();
  playerMarkingInput.value = getAttributeValue(player, "marking").toString();
  playerStaminaInput.value = getAttributeValue(player, "stamina").toString();
  playerScoringInput.value = getAttributeValue(player, "scoring").toString();
  renderStarWidget(starWidgetEl, player.rating, playerRatingInput);
  updateAdminModeUI();
  openModal(playerModalEl);
  playerNameInput.focus();
}

async function handlePlayerSubmit(e) {
  e.preventDefault();

  const name = playerNameInput.value.trim();
  const rating = parseFloat(playerRatingInput.value || "0");

  if (!name) {
    alert("Nome nao pode ser vazio.");
    return;
  }

  const payload = { name, rating };

  if (isAdminMode) {
    payload.marking = parseInt(playerMarkingInput.value || "2", 10);
    payload.stamina = parseInt(playerStaminaInput.value || "2", 10);
    payload.scoring = parseInt(playerScoringInput.value || "2", 10);
  }

  try {
    if (currentEditingId == null) {
      const newPlayer = await fetchJSON("/api/players", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      players.push(newPlayer);
      renderPlayers();
      closeModal(playerModalEl);
      return;
    }

    const updatedPlayer = await fetchJSON("/api/players/" + currentEditingId, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    players = players.map(function (p) { return p.id === updatedPlayer.id ? updatedPlayer : p; });
    renderPlayers();
    closeModal(playerModalEl);
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar jogador.");
  }
}

async function handlePlayerListClick(e) {
  const target = e.target;
  const row = target.closest(".player-row");
  if (!row) return;

  const id = parseInt(row.dataset.id, 10);

  if (target.classList.contains("toggle-active")) {
    try {
      const updated = await fetchJSON("/api/players/" + id + "/toggle-active", { method: "PATCH" });
      players = players.map(function (p) { return p.id === updated.id ? updated : p; });
      renderPlayers();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar jogador.");
    }
    return;
  }

  if (target.closest(".edit-player")) {
    const player = players.find(function (p) { return p.id === id; });
    if (player) openEditPlayerModal(player);
    return;
  }

  if (target.closest(".delete-player")) {
    deleteTargetId = id;
    openModal(confirmModalEl);
  }
}

async function deletePlayer() {
  if (deleteTargetId == null) return;

  try {
    await fetchJSON("/api/players/" + deleteTargetId, { method: "DELETE" });
    players = players.filter(function (p) { return p.id !== deleteTargetId; });
    renderPlayers();
  } catch (err) {
    console.error(err);
    alert("Erro ao remover jogador.");
  } finally {
    deleteTargetId = null;
    closeModal(confirmModalEl);
  }
}

async function clearAllPlayers() {
  if (!players.some(function (p) { return p.active; })) {
    alert("Nenhum jogador esta selecionado.");
    return;
  }

  const confirmed = confirm("Deseja desmarcar todos os jogadores?");
  if (!confirmed) return;

  try {
    await fetchJSON("/api/players/deactivate-all", { method: "PATCH" });
    players = players.map(function (p) { return Object.assign({}, p, { active: false }); });
    renderPlayers();
  } catch (err) {
    console.error(err);
    alert("Erro ao desmarcar jogadores.");
  }
}

// ============================================================
// Check-in modal
// ============================================================

function buildCheckinSessionDateText() {
  const now = new Date();
  const days = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
  const months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return days[now.getDay()] + ", " + now.getDate() + " de " + months[now.getMonth()] + " - marque quem esta presente";
}

function buildCheckinAvatarInitials(name) {
  return buildPlayerInitials(name);
}

function getCheckinPresentCount() {
  return Object.values(checkinState).filter(Boolean).length;
}

function updateCheckinMeta() {
  const total = players.length;
  const present = getCheckinPresentCount();
  checkinTotalLabelEl.textContent = total + " cadastrado(s)";
  checkinPresentBadgeEl.textContent = present + " presente(s)";
  confirmCheckinLabelEl.textContent = present > 0 ? "Sortear times (" + present + ")" : "Sortear times";
  confirmCheckinBtn.disabled = present < 2;
}

function renderCheckinList() {
  checkinPlayersListEl.innerHTML = "";

  const sorted = [...players].sort(function (a, b) {
    return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
  });

  sorted.forEach(function (p) {
    const isPresent = !!checkinState[p.id];

    const row = document.createElement("div");
    row.className = "checkin-row" + (isPresent ? " checkin-active" : "");

    const avatar = document.createElement("div");
    avatar.className = "checkin-avatar";
    avatar.textContent = buildCheckinAvatarInitials(p.name);

    const info = document.createElement("div");
    info.className = "checkin-info";

    const nameEl = document.createElement("p");
    nameEl.className = "checkin-name";
    nameEl.textContent = p.name;

    info.appendChild(nameEl);

    const check = document.createElement("div");
    check.className = "checkin-check" + (isPresent ? " checkin-checked" : "");
    if (isPresent) {
      check.innerHTML = '<i class="fa-solid fa-check"></i>';
    }

    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(check);

    row.addEventListener("click", function () {
      checkinState[p.id] = !checkinState[p.id];
      renderCheckinList();
      updateCheckinMeta();
    });

    checkinPlayersListEl.appendChild(row);
  });
}

function openCheckinModal() {
  if (players.length === 0) return;

  checkinState = {};
  players.forEach(function (p) { checkinState[p.id] = false; });

  checkinSessionDateEl.textContent = buildCheckinSessionDateText();
  renderCheckinList();
  updateCheckinMeta();
  openModal(checkinModalEl);
}

async function confirmCheckin() {
  const presentIds = Object.entries(checkinState)
    .filter(function (entry) { return entry[1]; })
    .map(function (entry) { return parseInt(entry[0], 10); });

  if (presentIds.length < 2) {
    alert("Selecione pelo menos 2 jogadores para sortear.");
    return;
  }

  try {
    const updatedList = await fetchJSON("/api/players/set-active-batch", {
      method: "PATCH",
      body: JSON.stringify({ active_ids: presentIds }),
    });

    players = updatedList;
    renderPlayers();
    closeModal(checkinModalEl);
    teamSizeInput.value = lastTeamSize.toString();
    openModal(drawModalEl);
  } catch (err) {
    console.error(err);
    alert("Erro ao confirmar presencas.");
  }
}

// ============================================================
// Draw
// ============================================================

function openDrawModal() {
  if (!players.some(function (p) { return p.active; })) {
    alert("Nenhum jogador ativo para sortear.");
    return;
  }
  teamSizeInput.value = lastTeamSize.toString();
  openModal(drawModalEl);
}

async function performDraw(teamSize) {
  try {
    const data = await fetchJSON("/api/draw-teams", {
      method: "POST",
      body: JSON.stringify({ team_size: teamSize }),
    });

    lastTeamSize = teamSize;
    lastDrawnTeams = data.teams;

    renderTeams(lastDrawnTeams);
    teamsSectionEl.classList.remove("hidden");

    setTimeout(function () {
      teamsSectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  } catch (err) {
    console.error(err);
    alert("Erro ao sortear times: " + err.message);
  }
}

function getTeamLabel(teamIndex) {
  if (teamIndex === 1) return "Azul";
  if (teamIndex === 2) return "Amarelo";
  return "de fora";
}

function getTeamBibClass(teamIndex) {
  if (teamIndex === 1) return "bib-blue";
  if (teamIndex === 2) return "bib-yellow";
  return "";
}

function renderTeams(teams) {
  teamsResultEl.innerHTML = "";

  teams.forEach(function (team, index) {
    const teamNumber = index + 1;
    const label = getTeamLabel(teamNumber);
    const bibClass = getTeamBibClass(teamNumber);

    const card = document.createElement("div");
    card.className = "team-card";

    const header = document.createElement("div");
    header.className = "team-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "team-title-wrap";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = team.name + " - " + label;
    titleWrap.appendChild(nameSpan);

    if (bibClass) {
      const bibIcon = document.createElement("span");
      bibIcon.className = "bib-icon " + bibClass;
      bibIcon.setAttribute("aria-hidden", "true");
      titleWrap.appendChild(bibIcon);
    }

    if (isAdminMode) {
      const auditButton = document.createElement("button");
      auditButton.className = "audit-icon-button";
      auditButton.title = "Ver auditoria do sorteio";
      auditButton.setAttribute("aria-label", "Ver auditoria do sorteio");
      auditButton.innerHTML = '<i class="fa-solid fa-chart-simple"></i>';
      auditButton.addEventListener("click", function () { openAuditModal(); });
      titleWrap.appendChild(auditButton);
    }

    const ratingSpan = document.createElement("span");
    ratingSpan.className = "team-rating";
    ratingSpan.textContent = "Total: " + team.total_rating.toFixed(1) + " \u2605";

    header.appendChild(titleWrap);
    header.appendChild(ratingSpan);

    const table = document.createElement("table");
    table.className = "team-table";

    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Jogador</th></tr>";
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const sortedPlayers = [...team.players].sort(function (a, b) {
      return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
    });

    sortedPlayers.forEach(function (p) {
      const tr = document.createElement("tr");
      const nameTd = document.createElement("td");
      nameTd.textContent = p.name;
      tr.appendChild(nameTd);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    card.appendChild(header);
    card.appendChild(table);
    teamsResultEl.appendChild(card);
  });
}

// ============================================================
// Audit
// ============================================================

function getTeamAuditStats(team) {
  const teamPlayers = team.players || [];
  const playerCount = teamPlayers.length || 1;
  const totalRating = teamPlayers.reduce(function (sum, p) { return sum + Number(p.rating || 0); }, 0);
  const totalMarking = teamPlayers.reduce(function (sum, p) { return sum + getAttributeValue(p, "marking"); }, 0);
  const totalStamina = teamPlayers.reduce(function (sum, p) { return sum + getAttributeValue(p, "stamina"); }, 0);
  const totalScoring = teamPlayers.reduce(function (sum, p) { return sum + getAttributeValue(p, "scoring"); }, 0);
  return {
    totalRating, totalMarking, totalStamina, totalScoring,
    averageRating: totalRating / playerCount,
    averageMarking: totalMarking / playerCount,
    averageStamina: totalStamina / playerCount,
    averageScoring: totalScoring / playerCount,
  };
}

function formatDecimal(value) { return Number(value).toFixed(1); }

function renderAuditView() {
  auditContentEl.innerHTML = "";

  if (!lastDrawnTeams.length) {
    auditContentEl.innerHTML = '<p class="muted-text">Nenhum sorteio disponivel para auditar.</p>';
    return;
  }

  const summary = document.createElement("div");
  summary.className = "audit-summary-grid";

  lastDrawnTeams.forEach(function (team, index) {
    const teamNumber = index + 1;
    const label = getTeamLabel(teamNumber);
    const stats = getTeamAuditStats(team);
    const summaryCard = document.createElement("div");
    summaryCard.className = "audit-summary-card";
    summaryCard.innerHTML =
      "<strong>" + team.name + " - " + label + "</strong>" +
      "<span>Rating: " + formatDecimal(stats.totalRating) + " total \u00b7 " + formatDecimal(stats.averageRating) + " media</span>" +
      "<span>Marca: " + stats.totalMarking + " total \u00b7 " + formatDecimal(stats.averageMarking) + " media</span>" +
      "<span>Gol: " + stats.totalScoring + " total \u00b7 " + formatDecimal(stats.averageScoring) + " media</span>" +
      "<span>Corre: " + stats.totalStamina + " total \u00b7 " + formatDecimal(stats.averageStamina) + " media</span>";
    summary.appendChild(summaryCard);
  });

  auditContentEl.appendChild(summary);

  lastDrawnTeams.forEach(function (team, index) {
    const teamNumber = index + 1;
    const label = getTeamLabel(teamNumber);
    const stats = getTeamAuditStats(team);
    const teamCard = document.createElement("div");
    teamCard.className = "audit-team-card";

    const sortedPlayers = [...team.players].sort(function (a, b) {
      return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
    });

    teamCard.innerHTML =
      '<div class="audit-team-header"><strong>' + team.name + " - " + label + "</strong><span>Total: " + formatDecimal(stats.totalRating) + " \u2605</span></div>" +
      '<div class="audit-metrics"><span>Marca ' + stats.totalMarking + "</span><span>Gol " + stats.totalScoring + "</span><span>Corre " + stats.totalStamina + "</span></div>" +
      '<table class="audit-table"><thead><tr><th>Jogador</th><th>Rating</th><th>Marca</th><th>Gol</th><th>Corre</th></tr></thead><tbody>' +
      sortedPlayers.map(function (p) {
        return "<tr><td>" + p.name + "</td><td>" + formatDecimal(p.rating) + "</td><td>" + getAttributeValue(p, "marking") + "</td><td>" + getAttributeValue(p, "scoring") + "</td><td>" + getAttributeValue(p, "stamina") + "</td></tr>";
      }).join("") +
      "</tbody></table>";

    auditContentEl.appendChild(teamCard);
  });
}

function openAuditModal() {
  if (!isAdminMode) { alert("Ative o modo admin para ver a auditoria."); return; }
  renderAuditView();
  openModal(auditModalEl);
}

// ============================================================
// Compare
// ============================================================

function renderCompareTable() {
  compareContentEl.innerHTML = "";
  if (players.length === 0) {
    compareContentEl.innerHTML = '<p class="muted-text">Nenhum jogador cadastrado.</p>';
    return;
  }

  const groups = {};
  players.forEach(function (p) {
    const key = p.rating.toFixed(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const sortedRatings = Object.keys(groups).map(function (r) { return parseFloat(r); }).sort(function (a, b) { return b - a; });

  const table = document.createElement("table");
  table.className = "team-table";
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Estrelas</th><th>Jogadores</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  sortedRatings.forEach(function (rating) {
    const key = rating.toFixed(1);
    const names = groups[key].map(function (p) { return p.name; }).sort(function (a, b) {
      return a.trim().localeCompare(b.trim(), "pt-BR", { sensitivity: "base" });
    });
    const tr = document.createElement("tr");
    const ratingTd = document.createElement("td");
    const playersTd = document.createElement("td");
    ratingTd.textContent = key + " \u2605";
    playersTd.textContent = names.join(", ");
    tr.appendChild(ratingTd);
    tr.appendChild(playersTd);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  compareContentEl.appendChild(table);
}

// ============================================================
// Deploy
// ============================================================

function openDeployModal() {
  if (!isAdminMode) { alert("Ative o modo admin para solicitar deploy."); return; }
  deployMainRadio.checked = true;
  deployCustomRadio.checked = false;
  deployCustomBranchInput.value = "";
  deployErrorEl.textContent = "";
  deployErrorEl.classList.add("hidden-text");
  openModal(deployModalEl);
}

function getSelectedDeployBranch() {
  if (deployMainRadio.checked) return "main";
  return deployCustomBranchInput.value.trim();
}

function isValidBranchName(branchName) {
  if (!branchName) return false;
  if (branchName.includes(" ")) return false;
  if (branchName.includes("..")) return false;
  if (branchName.startsWith("/")) return false;
  if (branchName.endsWith("/")) return false;
  return /^[A-Za-z0-9._/-]+$/.test(branchName);
}

function showDeployError(message) {
  deployErrorEl.textContent = message;
  deployErrorEl.classList.remove("hidden-text");
}

function requestDeploy() {
  const branchName = getSelectedDeployBranch();
  if (!isValidBranchName(branchName)) { showDeployError("Informe uma branch valida."); return; }
  const deployUrl = DEPLOY_ENDPOINT_BASE_URL + "?reference=" + encodeURIComponent(branchName);
  closeModal(deployModalEl);
  alert("Deploy solicitado para a branch " + branchName + ".");
  fetch(deployUrl, { method: "GET", mode: "no-cors", cache: "no-store", keepalive: true }).catch(function (err) {
    console.warn("Deploy request was sent, but the browser could not confirm the response.", err);
  });
}

// ============================================================
// Export
// ============================================================

function getBackupFileName() {
  const now = new Date();
  const pad = function (v) { return v.toString().padStart(2, "0"); };
  return "players-" + now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "-" + pad(now.getHours()) + pad(now.getMinutes()) + ".json";
}

async function exportPlayersJson() {
  alert("Export JSON nao disponivel nesta versao.");
}

// ============================================================
// Event listeners
// ============================================================

if (toggleThemeBtn) {
  toggleThemeBtn.addEventListener("click", function () {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pelada-theme", next);
    updateThemeIcon(next);
  });
}

if (adminModeBtn) { adminModeBtn.addEventListener("click", handleAdminModeClick); }
if (deployBtn) { deployBtn.addEventListener("click", openDeployModal); }

if (deployCustomBranchInput) {
  deployCustomBranchInput.addEventListener("focus", function () { deployCustomRadio.checked = true; deployMainRadio.checked = false; });
  deployCustomBranchInput.addEventListener("input", function () { deployCustomRadio.checked = true; deployMainRadio.checked = false; deployErrorEl.classList.add("hidden-text"); });
}

if (deployMainRadio) { deployMainRadio.addEventListener("change", function () { deployErrorEl.classList.add("hidden-text"); }); }
if (deployCustomRadio) { deployCustomRadio.addEventListener("change", function () { deployCustomBranchInput.focus(); deployErrorEl.classList.add("hidden-text"); }); }
if (cancelDeployBtn) { cancelDeployBtn.addEventListener("click", function () { closeModal(deployModalEl); }); }
if (confirmDeployBtn) { confirmDeployBtn.addEventListener("click", requestDeploy); }

if (starWidgetEl) {
  starWidgetEl.addEventListener("click", function (e) {
    const target = e.target;
    const starEl = target.classList.contains("star") ? target : target.parentElement;
    if (!starEl || !starEl.dataset.index) return;
    const index = parseInt(starEl.dataset.index, 10);
    updateStarWidgetFromClick(starWidgetEl, index, playerRatingInput);
  });
}

if (createWizardStarWidgetEl) {
  createWizardStarWidgetEl.addEventListener("click", function (e) {
    const target = e.target;
    const starEl = target.classList.contains("star") ? target : target.parentElement;
    if (!starEl || !starEl.dataset.index) return;
    const index = parseInt(starEl.dataset.index, 10);
    updateStarWidgetFromClick(createWizardStarWidgetEl, index, createWizardPlayerRatingInput);
  });
}

if (playerFormEl) { playerFormEl.addEventListener("submit", handlePlayerSubmit); }
if (cancelPlayerBtn) { cancelPlayerBtn.addEventListener("click", function () { closeModal(playerModalEl); }); }
if (playersListEl) { playersListEl.addEventListener("click", handlePlayerListClick); }
if (cancelDeleteBtn) { cancelDeleteBtn.addEventListener("click", function () { deleteTargetId = null; closeModal(confirmModalEl); }); }
if (confirmDeleteBtn) { confirmDeleteBtn.addEventListener("click", deletePlayer); }

if (drawTeamsBtn) { drawTeamsBtn.addEventListener("click", openDrawModal); }

if (redrawBtn) {
  redrawBtn.addEventListener("click", function () {
    if (!players.some(function (p) { return p.active; })) { alert("Nenhum jogador ativo para sortear."); return; }
    performDraw(lastTeamSize);
  });
}

if (cancelDrawBtn) { cancelDrawBtn.addEventListener("click", function () { closeModal(drawModalEl); }); }

if (confirmDrawBtn) {
  confirmDrawBtn.addEventListener("click", function () {
    const size = parseInt(teamSizeInput.value || "0", 10);
    if (!size || size <= 0) { alert("Informe um numero valido de jogadores por time."); return; }
    closeModal(drawModalEl);
    performDraw(size);
  });
}

if (compareBtn) {
  compareBtn.addEventListener("click", function () {
    if (players.length === 0) { alert("Nenhum jogador cadastrado para comparar."); return; }
    renderCompareTable();
    openModal(compareModalEl);
  });
}

if (closeCompareBtn) { closeCompareBtn.addEventListener("click", function () { closeModal(compareModalEl); }); }
if (clearAllBtn) { clearAllBtn.addEventListener("click", clearAllPlayers); }
if (exportJsonBtn) { exportJsonBtn.addEventListener("click", exportPlayersJson); }
if (fabAddPlayerBtn) { fabAddPlayerBtn.addEventListener("click", openNewPlayerModal); }
if (closeAuditBtn) { closeAuditBtn.addEventListener("click", function () { closeModal(auditModalEl); }); }
if (cancelCheckinBtn) { cancelCheckinBtn.addEventListener("click", function () { closeModal(checkinModalEl); }); }
if (confirmCheckinBtn) { confirmCheckinBtn.addEventListener("click", confirmCheckin); }

if (backToPeladasBtn) {
  backToPeladasBtn.addEventListener("click", function () {
    currentPeladaId = null;
    currentPeladaName = "";
    isAdminMode = false;
    localStorage.removeItem("pelada-admin-mode");
    localStorage.removeItem("pelada-current-id");
    localStorage.removeItem("pelada-current-name");
    showPeladaScreen();
  });
}

if (cancelAuthBtn) { cancelAuthBtn.addEventListener("click", function () { closeModal(authModalEl); }); }
if (confirmAuthBtn) { confirmAuthBtn.addEventListener("click", confirmAuth); }

if (authPasswordInput) {
  authPasswordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); confirmAuth(); }
  });
}

if (newPeladaBtn) { newPeladaBtn.addEventListener("click", openCreateModal); }
if (cancelCreateBtn) { cancelCreateBtn.addEventListener("click", function () { closeModal(createModalEl); }); }

if (nextCreateBtn) {
  nextCreateBtn.addEventListener("click", function () {
    if (validateCreateStep1()) showCreateStep(2);
  });
}

if (backCreateBtn) { backCreateBtn.addEventListener("click", function () { showCreateStep(1); }); }
if (confirmCreateBtn) { confirmCreateBtn.addEventListener("click", confirmCreate); }
if (addWizardPlayerBtn) { addWizardPlayerBtn.addEventListener("click", addWizardPlayer); }

if (createWizardPlayerNameInput) {
  createWizardPlayerNameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); addWizardPlayer(); }
  });
}

// ============================================================
// Init
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  loadTheme();
  loadAdminMode();
  renderStarWidget(starWidgetEl, 0, playerRatingInput);
  showPeladaScreen();
});