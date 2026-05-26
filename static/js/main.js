let players = [];
let currentEditingId = null;
let deleteTargetId = null;
let lastTeamSize = 5;
let lastDrawnTeams = [];
let isAdminMode = false;

const ADMIN_SECRET = "secret123";
const DEPLOY_ENDPOINT_BASE_URL = "https://peladamanager.bandeira.dev/deploy";

const playersListEl = document.getElementById("players-list");
const playerCountEl = document.getElementById("player-count");
const teamsSectionEl = document.getElementById("teams-section");
const teamsResultEl = document.getElementById("teams-result");

const playerModalEl = document.getElementById("player-modal");
const confirmModalEl = document.getElementById("confirm-modal");
const drawModalEl = document.getElementById("draw-modal");
const compareModalEl = document.getElementById("compare-modal");
const auditModalEl = document.getElementById("audit-modal");
const deployModalEl = document.getElementById("deploy-modal");

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

function loadTheme() {
  const saved = localStorage.getItem("pelada-theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function loadAdminMode() {
  isAdminMode = localStorage.getItem("pelada-admin-mode") === "true";
  updateAdminModeUI();
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
    alert("Chave admin inválida.");
    return;
  }

  isAdminMode = true;
  localStorage.setItem("pelada-admin-mode", "true");
  updateAdminModeUI();

  alert("Modo admin ativado.");
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

function getAttributeValue(player, attributeName) {
  return Number(player[attributeName] ?? 2);
}

async function loadPlayers() {
  try {
    players = await fetchJSON("/api/players");
    renderPlayers();
  } catch (err) {
    console.error("Failed to load players:", err);
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
    a.name.trim().localeCompare(b.name.trim(), "pt-BR", {
      sensitivity: "base",
    })
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

  renderStarWidget(starWidgetEl, 0);
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

  renderStarWidget(starWidgetEl, player.rating);
  updateAdminModeUI();
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

  const payload = {
    name,
    rating,
  };

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

    const updatedPlayer = await fetchJSON(`/api/players/${currentEditingId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    players = players.map((p) =>
      p.id === updatedPlayer.id ? updatedPlayer : p
    );

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
    lastDrawnTeams = data.teams;

    renderTeams(lastDrawnTeams);
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

function getTeamBibClass(teamIndex) {
  if (teamIndex === 1) return "bib-blue";
  if (teamIndex === 2) return "bib-yellow";
  return "";
}

function renderTeams(teams) {
  teamsResultEl.innerHTML = "";

  teams.forEach((team, index) => {
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
    nameSpan.textContent = `${team.name} - ${label}`;

    titleWrap.appendChild(nameSpan);

    if (bibClass) {
      const bibIcon = document.createElement("span");
      bibIcon.className = `bib-icon ${bibClass}`;
      bibIcon.setAttribute("aria-hidden", "true");
      titleWrap.appendChild(bibIcon);
    }

    if (isAdminMode) {
      const auditButton = document.createElement("button");
      auditButton.className = "audit-icon-button";
      auditButton.title = "Ver auditoria do sorteio";
      auditButton.setAttribute("aria-label", "Ver auditoria do sorteio");
      auditButton.innerHTML = '<i class="fa-solid fa-chart-simple"></i>';
      auditButton.addEventListener("click", () => openAuditModal());
      titleWrap.appendChild(auditButton);
    }

    const ratingSpan = document.createElement("span");
    ratingSpan.className = "team-rating";
    ratingSpan.textContent = `Total: ${team.total_rating.toFixed(1)} ★`;

    header.appendChild(titleWrap);
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

    const sortedPlayers = [...team.players].sort((a, b) =>
      a.name.trim().localeCompare(b.name.trim(), "pt-BR", {
        sensitivity: "base",
      })
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

function getTeamAuditStats(team) {
  const teamPlayers = team.players || [];
  const playerCount = teamPlayers.length || 1;

  const totalRating = teamPlayers.reduce((sum, p) => sum + Number(p.rating || 0), 0);
  const totalMarking = teamPlayers.reduce((sum, p) => sum + getAttributeValue(p, "marking"), 0);
  const totalStamina = teamPlayers.reduce((sum, p) => sum + getAttributeValue(p, "stamina"), 0);
  const totalScoring = teamPlayers.reduce((sum, p) => sum + getAttributeValue(p, "scoring"), 0);

  return {
    totalRating,
    totalMarking,
    totalStamina,
    totalScoring,
    averageRating: totalRating / playerCount,
    averageMarking: totalMarking / playerCount,
    averageStamina: totalStamina / playerCount,
    averageScoring: totalScoring / playerCount,
  };
}

function formatDecimal(value) {
  return Number(value).toFixed(1);
}

function renderAuditView() {
  auditContentEl.innerHTML = "";

  if (!lastDrawnTeams.length) {
    auditContentEl.innerHTML = '<p class="muted-text">Nenhum sorteio disponível para auditar.</p>';
    return;
  }

  const summary = document.createElement("div");
  summary.className = "audit-summary-grid";

  lastDrawnTeams.forEach((team, index) => {
    const teamNumber = index + 1;
    const label = getTeamLabel(teamNumber);
    const stats = getTeamAuditStats(team);

    const summaryCard = document.createElement("div");
    summaryCard.className = "audit-summary-card";

    summaryCard.innerHTML = `
      <strong>${team.name} - ${label}</strong>
      <span>Rating: ${formatDecimal(stats.totalRating)} total · ${formatDecimal(stats.averageRating)} média</span>
      <span>Marca: ${stats.totalMarking} total · ${formatDecimal(stats.averageMarking)} média</span>
      <span>Gol: ${stats.totalScoring} total · ${formatDecimal(stats.averageScoring)} média</span>
      <span>Corre: ${stats.totalStamina} total · ${formatDecimal(stats.averageStamina)} média</span>
    `;

    summary.appendChild(summaryCard);
  });

  auditContentEl.appendChild(summary);

  lastDrawnTeams.forEach((team, index) => {
    const teamNumber = index + 1;
    const label = getTeamLabel(teamNumber);
    const stats = getTeamAuditStats(team);

    const teamCard = document.createElement("div");
    teamCard.className = "audit-team-card";

    const sortedPlayers = [...team.players].sort((a, b) =>
      a.name.trim().localeCompare(b.name.trim(), "pt-BR", {
        sensitivity: "base",
      })
    );

    teamCard.innerHTML = `
      <div class="audit-team-header">
        <strong>${team.name} - ${label}</strong>
        <span>Total: ${formatDecimal(stats.totalRating)} ★</span>
      </div>

      <div class="audit-metrics">
        <span>Marca ${stats.totalMarking}</span>
        <span>Gol ${stats.totalScoring}</span>
        <span>Corre ${stats.totalStamina}</span>
      </div>

      <table class="audit-table">
        <thead>
          <tr>
            <th>Jogador</th>
            <th>Rating</th>
            <th>Marca</th>
            <th>Gol</th>
            <th>Corre</th>
          </tr>
        </thead>
        <tbody>
          ${sortedPlayers
            .map(
              (p) => `
                <tr>
                  <td>${p.name}</td>
                  <td>${formatDecimal(p.rating)}</td>
                  <td>${getAttributeValue(p, "marking")}</td>
                  <td>${getAttributeValue(p, "scoring")}</td>
                  <td>${getAttributeValue(p, "stamina")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;

    auditContentEl.appendChild(teamCard);
  });
}

function openAuditModal() {
  if (!isAdminMode) {
    alert("Ative o modo admin para ver a auditoria.");
    return;
  }

  renderAuditView();
  openModal(auditModalEl);
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
      .sort((a, b) =>
        a.trim().localeCompare(b.trim(), "pt-BR", {
          sensitivity: "base",
        })
      );

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

function openDeployModal() {
  if (!isAdminMode) {
    alert("Ative o modo admin para solicitar deploy.");
    return;
  }

  deployMainRadio.checked = true;
  deployCustomRadio.checked = false;
  deployCustomBranchInput.value = "";
  deployErrorEl.textContent = "";
  deployErrorEl.classList.add("hidden-text");

  openModal(deployModalEl);
}

function getSelectedDeployBranch() {
  if (deployMainRadio.checked) {
    return "main";
  }

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

  if (!isValidBranchName(branchName)) {
    showDeployError("Informe uma branch válida.");
    return;
  }

  const deployUrl = `${DEPLOY_ENDPOINT_BASE_URL}?reference=${encodeURIComponent(branchName)}`;

  closeModal(deployModalEl);
  alert(`Deploy solicitado para a branch ${branchName}.`);

  fetch(deployUrl, {
    method: "GET",
    mode: "no-cors",
    cache: "no-store",
    keepalive: true,
  }).catch((err) => {
    console.warn("Deploy request was sent, but the browser could not confirm the response.", err);
  });
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

if (adminModeBtn) {
  adminModeBtn.addEventListener("click", handleAdminModeClick);
}

if (deployBtn) {
  deployBtn.addEventListener("click", openDeployModal);
}

if (deployCustomBranchInput) {
  deployCustomBranchInput.addEventListener("focus", () => {
    deployCustomRadio.checked = true;
    deployMainRadio.checked = false;
  });

  deployCustomBranchInput.addEventListener("input", () => {
    deployCustomRadio.checked = true;
    deployMainRadio.checked = false;
    deployErrorEl.classList.add("hidden-text");
  });
}

if (deployMainRadio) {
  deployMainRadio.addEventListener("change", () => {
    deployErrorEl.classList.add("hidden-text");
  });
}

if (deployCustomRadio) {
  deployCustomRadio.addEventListener("change", () => {
    deployCustomBranchInput.focus();
    deployErrorEl.classList.add("hidden-text");
  });
}

if (cancelDeployBtn) {
  cancelDeployBtn.addEventListener("click", () => closeModal(deployModalEl));
}

if (confirmDeployBtn) {
  confirmDeployBtn.addEventListener("click", requestDeploy);
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

if (fabAddPlayerBtn) {
  fabAddPlayerBtn.addEventListener("click", openNewPlayerModal);
}

if (closeAuditBtn) {
  closeAuditBtn.addEventListener("click", () => closeModal(auditModalEl));
}

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadAdminMode();
  renderStarWidget(starWidgetEl, 0);
  loadPlayers();
});