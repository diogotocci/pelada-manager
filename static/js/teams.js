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
    showToast("Erro ao sortear times.");
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
    ratingSpan.textContent = "Total: " + team.total_rating.toFixed(1) + " ★";

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
      "<span>Rating: " + formatDecimal(stats.totalRating) + " total · " + formatDecimal(stats.averageRating) + " media</span>" +
      "<span>Marca: " + stats.totalMarking + " total · " + formatDecimal(stats.averageMarking) + " media</span>" +
      "<span>Gol: " + stats.totalScoring + " total · " + formatDecimal(stats.averageScoring) + " media</span>" +
      "<span>Corre: " + stats.totalStamina + " total · " + formatDecimal(stats.averageStamina) + " media</span>";
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
      '<div class="audit-team-header"><strong>' + team.name + " - " + label + "</strong><span>Total: " + formatDecimal(stats.totalRating) + " ★</span></div>" +
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
    ratingTd.textContent = key + " ★";
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
// Event listeners — Teams
// ============================================================

if (deployBtn) { deployBtn.addEventListener("click", openDeployModal); }

if (deployCustomBranchInput) {
  deployCustomBranchInput.addEventListener("focus", function () { deployCustomRadio.checked = true; deployMainRadio.checked = false; });
  deployCustomBranchInput.addEventListener("input", function () { deployCustomRadio.checked = true; deployMainRadio.checked = false; deployErrorEl.classList.add("hidden-text"); });
}

if (deployMainRadio) { deployMainRadio.addEventListener("change", function () { deployErrorEl.classList.add("hidden-text"); }); }
if (deployCustomRadio) { deployCustomRadio.addEventListener("change", function () { deployCustomBranchInput.focus(); deployErrorEl.classList.add("hidden-text"); }); }
if (cancelDeployBtn) { cancelDeployBtn.addEventListener("click", function () { closeModal(deployModalEl); }); }
if (confirmDeployBtn) { confirmDeployBtn.addEventListener("click", requestDeploy); }

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
if (exportJsonBtn) { exportJsonBtn.addEventListener("click", exportPlayersJson); }
if (closeAuditBtn) { closeAuditBtn.addEventListener("click", function () { closeModal(auditModalEl); }); }

// ============================================================
// Init
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  loadTheme();
  loadAdminMode();
  renderStarWidget(starWidgetEl, 0, playerRatingInput);
  showPeladaScreen();
});
