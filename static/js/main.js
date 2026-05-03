let players = [];
let pendingRequests = [];
let currentEditingId = null;
let deleteTargetId = null;
let lastTeamSize = 5;
let isAuthenticated = false;

const playersListEl = document.getElementById("players-list");
const playerCountEl = document.getElementById("player-count");
const teamsSectionEl = document.getElementById("teams-section");
const teamsResultEl = document.getElementById("teams-result");

const playerModalEl = document.getElementById("player-modal");
const confirmModalEl = document.getElementById("confirm-modal");
const drawModalEl = document.getElementById("draw-modal");
const compareModalEl = document.getElementById("compare-modal");
const approvalModalEl = document.getElementById("approval-modal");
const authModalEl = document.getElementById("auth-modal");

const playerModalTitleEl = document.getElementById("player-modal-title");
const playerFormEl = document.getElementById("player-form");
const playerIdInput = document.getElementById("player-id");
const playerNameInput = document.getElementById("player-name");
const playerRatingInput = document.getElementById("player-rating");
const starWidgetEl = document.getElementById("star-widget");
const cancelPlayerBtn = document.getElementById("cancel-player-btn");
const editApprovalNoteEl = document.getElementById("edit-approval-note");

const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

const teamSizeInput = document.getElementById("team-size-input");
const cancelDrawBtn = document.getElementById("cancel-draw-btn");
const confirmDrawBtn = document.getElementById("confirm-draw-btn");

const fabAddPlayerBtn = document.getElementById("fab-add-player");
const fabApprovalBtn = document.getElementById("fab-approval");
const toggleThemeBtn = document.getElementById("toggle-theme-btn");
const drawTeamsBtn = document.getElementById("draw-teams-btn");
const redrawBtn = document.getElementById("redraw-btn");
const compareBtn = document.getElementById("compare-btn");
const clearAllBtn = document.getElementById("clear-all-btn");
const exportJsonBtn = document.getElementById("export-json-btn");

const compareContentEl = document.getElementById("compare-content");
const closeCompareBtn = document.getElementById("close-compare-btn");

const approvalListEl = document.getElementById("approval-list");
const closeApprovalBtn = document.getElementById("close-approval-btn");

const authPasswordInput = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authErrorEl = document.getElementById("auth-error");

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

function openModal(el) {
  if (!el) return;
  el.classList.remove("hidden");
}

function closeModal(el) {
  if (!el) return;
  el.classList.add("hidden");
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Unexpected error");
  }

  return res.json();
}

function getBackupFileName() {
  const now = new Date();
  const pad = (value) => value.toString().padStart(2, "0");

  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());

  return `players-${year}-${month}-${day}-${hour}${minute}.json`;
}

async function exportPlayersJson() {
  try {
    const response = await fetch("/api/export-players", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to export players JSON");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getBackupFileName();
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);

    alert("Arquivo baixado com sucesso.");
  } catch (err) {
    console.error(err);
    alert("Erro ao baixar o JSON.");
  }
}

function renderStarWidget(element, rating) {
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

function updateStarWidgetFromClick(element, clickedIndex) {
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
  renderStarWidget(element, newRating);
  playerRatingInput.value = newRating.toString();
}

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

async function loadPlayers() {
  try {
    players = await fetchJSON("/api/players");
    renderPlayers();
  } catch (err) {
    console.error("Failed to load players:", err);
  }
}

async function loadPendingRequests() {
  try {
    pendingRequests = await fetchJSON("/api/pending-requests");
    updateApprovalBadge();
  } catch (err) {
    console.error("Failed to load pending requests:", err);
  }
}

function updateApprovalBadge() {
  if (!fabApprovalBtn) return;

  const existingBadge = fabApprovalBtn.querySelector(".fab-badge");
  if (existingBadge) existingBadge.remove();

  if (pendingRequests.length > 0) {
    const badge = document.createElement("span");
    badge.className = "fab-badge";
    badge.textContent = pendingRequests.length.toString();
    fabApprovalBtn.appendChild(badge);
  }
}

function renderPlayers() {
  playersListEl.innerHTML = "";

  const total = players.length;
  const activeCount = players.filter((p) => p.active).length;

  if (total === 0) {
    playerCountEl.textContent = "Nenhum jogador cadastrado ainda.";
    return;
  }

  playerCountEl.textContent = `${total} jogador(es) · ${activeCount} selecionado(s)`;

  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );

  sortedPlayers.forEach((p) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.dataset.id = p.id;

    const main = document.createElement("div");
    main.className = "player-main";

    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    nameSpan.textContent = p.name;

    const starsSpan = document.createElement("span");
    starsSpan.className = "player-stars";
    starsSpan.innerHTML = buildStarsHTML(p.rating);

    const ratingText = document.createElement("span");
    ratingText.className = "player-rating-text";
    ratingText.textContent = `${p.rating.toFixed(1)} ★`;

    main.appendChild(nameSpan);
    main.appendChild(starsSpan);
    main.appendChild(ratingText);

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

    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon edit-player";
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon delete-player";
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

    actions.appendChild(switchLabel);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(main);
    row.appendChild(actions);

    playersListEl.appendChild(row);
  });
}

function openNewPlayerModal() {
  currentEditingId = null;

  playerModalTitleEl.textContent = "Novo jogador";
  playerIdInput.value = "";
  playerNameInput.value = "";
  playerRatingInput.value = "0";
  editApprovalNoteEl.classList.add("hidden-text");

  renderStarWidget(starWidgetEl, 0);
  openModal(playerModalEl);
  playerNameInput.focus();
}

function openEditPlayerModal(player) {
  currentEditingId = player.id;

  playerModalTitleEl.textContent = "Editar jogador";
  playerIdInput.value = player.id;
  playerNameInput.value = player.name;
  playerRatingInput.value = player.rating.toString();
  editApprovalNoteEl.classList.remove("hidden-text");

  renderStarWidget(starWidgetEl, player.rating);
  openModal(playerModalEl);
  playerNameInput.focus();
}

async function handlePlayerSubmit(e) {
  e.preventDefault();

  const name = playerNameInput.value.trim();
  const rating = parseFloat(playerRatingInput.value || "0");

  if (!name) {
    alert("Nome não pode ser vazio.");
    return;
  }

  try {
    if (currentEditingId == null) {
      const newPlayer = await fetchJSON("/api/players", {
        method: "POST",
        body: JSON.stringify({ name, rating }),
      });

      players.push(newPlayer);
      renderPlayers();
      closeModal(playerModalEl);
      return;
    }

    const currentPlayer = players.find((p) => p.id === currentEditingId);
    if (!currentPlayer) {
      alert("Jogador não encontrado.");
      return;
    }

    await fetchJSON(`/api/players/${currentEditingId}/change-request`, {
      method: "POST",
      body: JSON.stringify({
        name,
        rating,
      }),
    });

    closeModal(playerModalEl);
    await loadPendingRequests();

    alert("Alteração enviada para aprovação.");
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
      const updated = await fetchJSON(`/api/players/${id}/toggle-active`, {
        method: "PATCH",
      });

      players = players.map((p) => (p.id === updated.id ? updated : p));
      renderPlayers();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar jogador.");
    }

    return;
  }

  if (target.closest(".edit-player")) {
    const player = players.find((p) => p.id === id);
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
    await fetchJSON(`/api/players/${deleteTargetId}`, {
      method: "DELETE",
    });

    players = players.filter((p) => p.id !== deleteTargetId);
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
  if (!players.some((p) => p.active)) {
    alert("Nenhum jogador está selecionado.");
    return;
  }

  const confirmed = confirm("Deseja desmarcar todos os jogadores?");
  if (!confirmed) return;

  try {
    await fetchJSON("/api/players/deactivate-all", {
      method: "PATCH",
    });

    players = players.map((p) => ({ ...p, active: false }));
    renderPlayers();
  } catch (err) {
    console.error(err);
    alert("Erro ao desmarcar jogadores.");
  }
}

function openDrawModal() {
  if (!players.some((p) => p.active)) {
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
    renderTeams(data.teams);
    teamsSectionEl.classList.remove("hidden");

    setTimeout(() => {
      teamsSectionEl.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
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

function renderTeams(teams) {
  teamsResultEl.innerHTML = "";

  teams.forEach((team, index) => {
    const teamNumber = index + 1;
    const label = getTeamLabel(teamNumber);

    const card = document.createElement("div");
    card.className = "team-card";

    const header = document.createElement("div");
    header.className = "team-header";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${team.name} - ${label}`;

    const ratingSpan = document.createElement("span");
    ratingSpan.className = "team-rating";
    ratingSpan.textContent = `Total: ${team.total_rating.toFixed(1)} ★`;

    header.appendChild(nameSpan);
    header.appendChild(ratingSpan);

    const table = document.createElement("table");
    table.className = "team-table";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Jogador</th>
      </tr>
    `;

    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const sortedPlayers = [...team.players].sort(
      (a, b) => b.rating - a.rating
    );

    sortedPlayers.forEach((p) => {
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

function renderCompareTable() {
  compareContentEl.innerHTML = "";

  if (players.length === 0) {
    compareContentEl.innerHTML =
      '<p class="muted-text">Nenhum jogador cadastrado.</p>';
    return;
  }

  const groups = {};

  players.forEach((p) => {
    const key = p.rating.toFixed(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const sortedRatings = Object.keys(groups)
    .map((r) => parseFloat(r))
    .sort((a, b) => b - a);

  const table = document.createElement("table");
  table.className = "team-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Estrelas</th>
      <th>Jogadores</th>
    </tr>
  `;

  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  sortedRatings.forEach((rating) => {
    const key = rating.toFixed(1);

    const names = groups[key]
      .map((p) => p.name)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    const tr = document.createElement("tr");
    const ratingTd = document.createElement("td");
    const playersTd = document.createElement("td");

    ratingTd.textContent = `${key} ★`;
    playersTd.textContent = names.join(", ");

    tr.appendChild(ratingTd);
    tr.appendChild(playersTd);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  compareContentEl.appendChild(table);
}

async function openApprovalModal() {
  await loadPendingRequests();
  approvalListEl.innerHTML = "";

  if (pendingRequests.length === 0) {
    approvalListEl.innerHTML =
      '<p class="muted-text">Nenhuma aprovação pendente.</p>';
    openModal(approvalModalEl);
    return;
  }

  pendingRequests.forEach((request) => {
    const card = document.createElement("div");
    card.className = "approval-card";

    const currentRating = Number(request.current_rating).toFixed(1);
    const requestedRating = Number(request.requested_rating).toFixed(1);

    card.innerHTML = `
      <div class="approval-main">
        <strong>${request.player_name}</strong>
        <span>Atual: ${currentRating} ★</span>
        <span>Proposto: ${requestedRating} ★</span>
      </div>

      <div class="approval-actions">
        <button class="primary-button approve-request" data-id="${request.id}">
          Aprovar
        </button>
        <button class="danger-button reject-request" data-id="${request.id}">
          Rejeitar
        </button>
      </div>
    `;

    approvalListEl.appendChild(card);
  });

  openModal(approvalModalEl);
}

async function handleApprovalClick(e) {
  const approveButton = e.target.closest(".approve-request");
  const rejectButton = e.target.closest(".reject-request");

  if (!approveButton && !rejectButton) return;

  const requestId = parseInt(
    (approveButton || rejectButton).dataset.id,
    10
  );

  try {
    if (approveButton) {
      await fetchJSON(`/api/change-requests/${requestId}/approve`, {
        method: "POST",
      });
    }

    if (rejectButton) {
      await fetchJSON(`/api/change-requests/${requestId}/reject`, {
        method: "POST",
      });
    }

    await loadPlayers();
    await openApprovalModal();
  } catch (err) {
    console.error(err);
    alert("Erro ao processar aprovação.");
  }
}

async function checkPassword(password) {
  const res = await fetch("/api/check-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) return false;

  const data = await res.json();
  return data.valid === true;
}

async function handleAuth() {
  const pwd = authPasswordInput.value.trim();

  if (!pwd) {
    authErrorEl.textContent = "Senha obrigatória.";
    authErrorEl.classList.remove("hidden-text");
    return;
  }

  try {
    const ok = await checkPassword(pwd);

    if (!ok) {
      authErrorEl.textContent = "Senha inválida.";
      authErrorEl.classList.remove("hidden-text");
      authPasswordInput.select();
      return;
    }

    authErrorEl.classList.add("hidden-text");
    isAuthenticated = true;
    closeModal(authModalEl);

    await loadPlayers();
    await loadPendingRequests();
  } catch (err) {
    console.error(err);
    authErrorEl.textContent = "Erro ao validar senha.";
    authErrorEl.classList.remove("hidden-text");
  }
}

if (toggleThemeBtn) {
  toggleThemeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pelada-theme", next);
    updateThemeIcon(next);
  });
}

if (starWidgetEl) {
  starWidgetEl.addEventListener("click", (e) => {
    const target = e.target;
    const starEl =
      target.classList.contains("star") ? target : target.parentElement;

    if (!starEl || !starEl.dataset.index) return;

    const index = parseInt(starEl.dataset.index, 10);
    updateStarWidgetFromClick(starWidgetEl, index);
  });
}

if (playerFormEl) {
  playerFormEl.addEventListener("submit", handlePlayerSubmit);
}

if (cancelPlayerBtn) {
  cancelPlayerBtn.addEventListener("click", () => closeModal(playerModalEl));
}

if (playersListEl) {
  playersListEl.addEventListener("click", handlePlayerListClick);
}

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener("click", () => {
    deleteTargetId = null;
    closeModal(confirmModalEl);
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", deletePlayer);
}

if (drawTeamsBtn) {
  drawTeamsBtn.addEventListener("click", openDrawModal);
}

if (redrawBtn) {
  redrawBtn.addEventListener("click", () => {
    if (!players.some((p) => p.active)) {
      alert("Nenhum jogador ativo para sortear.");
      return;
    }

    performDraw(lastTeamSize);
  });
}

if (cancelDrawBtn) {
  cancelDrawBtn.addEventListener("click", () => closeModal(drawModalEl));
}

if (confirmDrawBtn) {
  confirmDrawBtn.addEventListener("click", () => {
    const size = parseInt(teamSizeInput.value || "0", 10);

    if (!size || size <= 0) {
      alert("Informe um número válido de jogadores por time.");
      return;
    }

    closeModal(drawModalEl);
    performDraw(size);
  });
}

if (compareBtn) {
  compareBtn.addEventListener("click", () => {
    if (players.length === 0) {
      alert("Nenhum jogador cadastrado para comparar.");
      return;
    }

    renderCompareTable();
    openModal(compareModalEl);
  });
}

if (closeCompareBtn) {
  closeCompareBtn.addEventListener("click", () => closeModal(compareModalEl));
}

if (clearAllBtn) {
  clearAllBtn.addEventListener("click", clearAllPlayers);
}

if (exportJsonBtn) {
  exportJsonBtn.addEventListener("click", exportPlayersJson);
}

if (fabApprovalBtn) {
  fabApprovalBtn.addEventListener("click", openApprovalModal);
}

if (approvalListEl) {
  approvalListEl.addEventListener("click", handleApprovalClick);
}

if (closeApprovalBtn) {
  closeApprovalBtn.addEventListener("click", () => closeModal(approvalModalEl));
}

if (fabAddPlayerBtn) {
  fabAddPlayerBtn.addEventListener("click", openNewPlayerModal);
}

if (authSubmitBtn) {
  authSubmitBtn.addEventListener("click", handleAuth);
}

if (authPasswordInput) {
  authPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAuth();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  renderStarWidget(starWidgetEl, 0);

  if (authPasswordInput) {
    authPasswordInput.focus();
  }
});