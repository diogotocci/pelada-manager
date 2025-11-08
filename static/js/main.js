// ----------------------
// Global state
// ----------------------
let players = [];
let currentEditingId = null;
let deleteTargetId = null;
let lastTeamSize = 5;
let isAuthenticated = false;

// ----------------------
// DOM elements
// ----------------------

// Main sections
const playersListEl = document.getElementById("players-list");
const playerCountEl = document.getElementById("player-count");
const teamsSectionEl = document.getElementById("teams-section");
const teamsResultEl = document.getElementById("teams-result");

// Modals
const playerModalEl = document.getElementById("player-modal");
const confirmModalEl = document.getElementById("confirm-modal");
const drawModalEl = document.getElementById("draw-modal");
const compareModalEl = document.getElementById("compare-modal");
const authModalEl = document.getElementById("auth-modal");

// Compare modal content
const compareContentEl = document.getElementById("compare-content");
const closeCompareBtn = document.getElementById("close-compare-btn");

// Player modal elements
const playerModalTitleEl = document.getElementById("player-modal-title");
const playerFormEl = document.getElementById("player-form");
const playerIdInput = document.getElementById("player-id");
const playerNameInput = document.getElementById("player-name");
const playerRatingInput = document.getElementById("player-rating");
const starWidgetEl = document.getElementById("star-widget");
const cancelPlayerBtn = document.getElementById("cancel-player-btn");

// Confirm delete modal elements
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

// Draw modal elements
const teamSizeInput = document.getElementById("team-size-input");
const cancelDrawBtn = document.getElementById("cancel-draw-btn");
const confirmDrawBtn = document.getElementById("confirm-draw-btn");

// Buttons
const fabAddPlayerBtn = document.getElementById("fab-add-player");
const toggleThemeBtn = document.getElementById("toggle-theme-btn");
const drawTeamsBtn = document.getElementById("draw-teams-btn");
const redrawBtn = document.getElementById("redraw-btn");
const compareBtn = document.getElementById("compare-btn");

// Auth modal elements
const authPasswordInput = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authErrorEl = document.getElementById("auth-error");

// ----------------------
// Theme handling
// ----------------------
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

if (toggleThemeBtn) {
  toggleThemeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pelada-theme", next);
    updateThemeIcon(next);
  });
}

// ----------------------
// Modal helpers
// ----------------------
function openModal(el) {
  if (!el) return;
  el.classList.remove("hidden");
}

function closeModal(el) {
  if (!el) return;
  el.classList.add("hidden");
}

// ----------------------
// Star widget (0.5 steps)
// ----------------------
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
    const value = currentRating;

    if (value >= i) {
      icon.className = "fa-solid fa-star"; // full
    } else if (value >= i - 0.5) {
      icon.className = "fa-regular fa-star-half-stroke"; // half
    } else {
      icon.className = "fa-regular fa-star"; // empty
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
  if (playerRatingInput) {
    playerRatingInput.value = newRating.toString();
  }
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

// ----------------------
// API helper
// ----------------------
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const msg = (await res.text()) || "Erro inesperado";
    throw new Error(msg);
  }

  return res.json();
}

// ----------------------
// Load & render players
// ----------------------
async function loadPlayers() {
  try {
    const data = await fetchJSON("/api/players");
    players = data;
    renderPlayers();
  } catch (err) {
    console.error("Failed to load players:", err);
  }
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

function renderPlayers() {
  if (!playersListEl || !playerCountEl) return;

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

// ----------------------
// Add / edit player
// ----------------------
function openNewPlayerModal() {
  currentEditingId = null;
  if (!playerModalTitleEl || !playerIdInput || !playerNameInput || !playerRatingInput) return;

  playerModalTitleEl.textContent = "Novo jogador";
  playerIdInput.value = "";
  playerNameInput.value = "";
  playerRatingInput.value = "0";
  renderStarWidget(starWidgetEl, 0);
  openModal(playerModalEl);
  playerNameInput.focus();
}

function openEditPlayerModal(player) {
  currentEditingId = player.id;
  if (!playerModalTitleEl || !playerIdInput || !playerNameInput || !playerRatingInput) return;

  playerModalTitleEl.textContent = "Editar jogador";
  playerIdInput.value = player.id;
  playerNameInput.value = player.name;
  playerRatingInput.value = player.rating.toString();
  renderStarWidget(starWidgetEl, player.rating);
  openModal(playerModalEl);
  playerNameInput.focus();
}

if (playerFormEl) {
  playerFormEl.addEventListener("submit", async (e) => {
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
      } else {
        const updated = await fetchJSON(`/api/players/${currentEditingId}`, {
          method: "PUT",
          body: JSON.stringify({ name, rating }),
        });
        players = players.map((p) => (p.id === updated.id ? updated : p));
      }

      renderPlayers();
      closeModal(playerModalEl);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar jogador.");
    }
  });
}

if (cancelPlayerBtn) {
  cancelPlayerBtn.addEventListener("click", () => {
    closeModal(playerModalEl);
  });
}

// ----------------------
// Player list actions
// ----------------------
if (playersListEl) {
  playersListEl.addEventListener("click", async (e) => {
    const target = e.target;
    const row = target.closest(".player-row");
    if (!row) return;
    const id = parseInt(row.dataset.id, 10);

    // Toggle active (only if the checkbox itself was clicked)
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

    // Edit button
    if (target.closest(".edit-player")) {
      const player = players.find((p) => p.id === id);
      if (player) {
        openEditPlayerModal(player);
      }
      return;
    }

    // Delete button
    if (target.closest(".delete-player")) {
      deleteTargetId = id;
      openModal(confirmModalEl);
      return;
    }
  });
}

// ----------------------
// Confirm delete modal
// ----------------------
if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener("click", () => {
    deleteTargetId = null;
    closeModal(confirmModalEl);
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", async () => {
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
  });
}

// ----------------------
// Draw teams
// ----------------------
function openDrawModal() {
  if (!players.some((p) => p.active)) {
    alert("Nenhum jogador ativo para sortear.");
    return;
  }
  if (teamSizeInput) {
    teamSizeInput.value = lastTeamSize.toString();
  }
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
    if (teamsSectionEl) {
      teamsSectionEl.classList.remove("hidden");
    }

    setTimeout(() => {
      if (teamsSectionEl) {
        teamsSectionEl.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
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
  if (!teamsResultEl) return;
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

if (cancelDrawBtn) {
  cancelDrawBtn.addEventListener("click", () => {
    closeModal(drawModalEl);
  });
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

if (drawTeamsBtn) {
  drawTeamsBtn.addEventListener("click", openDrawModal);
}

// "Sortear novamente" – usa mesmo teamSize se já existir, senão abre modal
if (redrawBtn) {
  redrawBtn.addEventListener("click", () => {
    if (!players.some((p) => p.active)) {
      alert("Nenhum jogador ativo para sortear.");
      return;
    }

    if (!lastTeamSize || lastTeamSize <= 0) {
      openDrawModal();
      return;
    }

    performDraw(lastTeamSize);
  });
}

// ----------------------
// Compare players
// ----------------------
function renderCompareTable() {
  if (!compareContentEl) return;

  compareContentEl.innerHTML = "";

  if (players.length === 0) {
    compareContentEl.innerHTML =
      '<p class="muted-text">Nenhum jogador cadastrado.</p>';
    return;
  }

  const groups = {};
  players.forEach((p) => {
    const key = p.rating.toFixed(1);
    if (!groups[key]) {
      groups[key] = [];
    }
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
    const playersInGroup = groups[key];

    const names = playersInGroup
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
  closeCompareBtn.addEventListener("click", () => {
    closeModal(compareModalEl);
  });
}

// ----------------------
// Auth (password gate)
// ----------------------
async function checkPassword(password) {
  const res = await fetch("/api/check-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    return false;
  }

  const data = await res.json();
  return data.valid === true;
}

async function handleAuth() {
  const pwd = authPasswordInput.value.trim();

  if (!pwd) {
    authErrorEl.textContent = "Senha obrigatória.";
    authErrorEl.style.display = "block";
    return;
  }

  try {
    const ok = await checkPassword(pwd);
    if (!ok) {
      authErrorEl.textContent = "Senha inválida.";
      authErrorEl.style.display = "block";
      authPasswordInput.select();
      return;
    }

    authErrorEl.style.display = "none";
    isAuthenticated = true;
    closeModal(authModalEl);
    loadPlayers();
  } catch (err) {
    console.error(err);
    authErrorEl.textContent = "Erro ao validar senha.";
    authErrorEl.style.display = "block";
  }
}

if (authSubmitBtn) {
  authSubmitBtn.addEventListener("click", () => {
    handleAuth();
  });
}

if (authPasswordInput) {
  authPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleAuth();
    }
  });
}

// ----------------------
// FAB (add player)
// ----------------------
if (fabAddPlayerBtn) {
  fabAddPlayerBtn.addEventListener("click", openNewPlayerModal);
}

// ----------------------
// Init
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  renderStarWidget(starWidgetEl, 0);

  if (authPasswordInput) {
    authPasswordInput.focus();
  }
});
