// ============================================================
// Pelada screen
// ============================================================

function showPeladaScreen() {
  peladaScreenEl.classList.remove("hidden");
  appContainerEl.classList.add("hidden");
  loadPeladas();
}

function showAppScreen(peladaId, peladaName, team1Color, team2Color) {
  currentPeladaId = peladaId;
  currentPeladaName = peladaName;
  currentTeam1Color = team1Color || "blue";
  currentTeam2Color = team2Color || "yellow";

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
        '</div>';

      const deleteIcon = document.createElement("i");
      deleteIcon.className = "fa-solid fa-trash pelada-card-delete";
      deleteIcon.setAttribute("aria-hidden", "true");
      deleteIcon.title = "Excluir pelada";
      deleteIcon.addEventListener("click", function (e) {
        e.stopPropagation();
        handleDeletePeladaIconClick(p.id, p.name);
      });
      card.appendChild(deleteIcon);

      const lockIcon = document.createElement("i");
      lockIcon.className = "fa-solid fa-lock pelada-card-lock";
      lockIcon.setAttribute("aria-hidden", "true");
      card.appendChild(lockIcon);

      card.addEventListener("click", function () {
        openAuthModal(p.id, p.name, p.team1_color, p.team2_color);
      });

      peladaListEl.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load peladas:", err);
    peladaLoadingEl.classList.add("hidden");
    showToast("Erro ao carregar peladas.");
  }
}

function openAuthModal(peladaId, peladaName, team1Color, team2Color) {
  authTargetPeladaId = peladaId;
  authTargetPeladaName = peladaName;
  authTargetTeam1Color = team1Color || "blue";
  authTargetTeam2Color = team2Color || "yellow";
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
    showAppScreen(authTargetPeladaId, authTargetPeladaName, authTargetTeam1Color, authTargetTeam2Color);
  } catch (err) {
    console.error(err);
    authErrorEl.textContent = "Erro ao autenticar.";
    authErrorEl.classList.remove("hidden");
  }
}

function handleDeletePeladaIconClick(peladaId, peladaName) {
  const secret = prompt("Digite a chave admin:");
  if (secret == null) return;

  if (secret !== ADMIN_SECRET) {
    showToast("Chave admin invalida.");
    return;
  }

  openDeletePeladaModal(peladaId, peladaName);
}

function openDeletePeladaModal(peladaId, peladaName) {
  deleteTargetPeladaId = peladaId;
  deleteTargetPeladaName = peladaName;

  deletePeladaMessageEl.innerHTML = "";
  deletePeladaMessageEl.appendChild(document.createTextNode("Tem certeza que deseja excluir a pelada "));
  const strong = document.createElement("strong");
  strong.textContent = peladaName;
  deletePeladaMessageEl.appendChild(strong);
  deletePeladaMessageEl.appendChild(document.createTextNode("?"));

  openModal(deletePeladaModalEl);
}

async function confirmDeletePelada() {
  if (deleteTargetPeladaId == null) return;

  try {
    const res = await fetchJSONRaw("/api/peladas/" + deleteTargetPeladaId, {
      method: "DELETE",
      body: JSON.stringify({ admin_secret: ADMIN_SECRET }),
    });

    if (!res.ok) {
      showToast("Erro ao excluir pelada.");
      return;
    }

    closeModal(deletePeladaModalEl);
    loadPeladas();
  } catch (err) {
    console.error(err);
    showToast("Erro ao excluir pelada.");
  } finally {
    deleteTargetPeladaId = null;
    deleteTargetPeladaName = "";
  }
}

// ============================================================
// Bib colors modal (admin)
// ============================================================

function renderEditColorPickers() {
  renderBibPicker(editTeam1PickerEl, editingTeam1Color, function (key) {
    editingTeam1Color = key;
    renderEditColorPickers();
  });
  renderBibPicker(editTeam2PickerEl, editingTeam2Color, function (key) {
    editingTeam2Color = key;
    renderEditColorPickers();
  });
  colorsWarnEl.classList.toggle("hidden", editingTeam1Color !== editingTeam2Color);
}

function openColorsModal() {
  if (!isAdminMode) return;
  editingTeam1Color = currentTeam1Color;
  editingTeam2Color = currentTeam2Color;
  renderEditColorPickers();
  openModal(colorsModalEl);
}

async function confirmColors() {
  try {
    const res = await fetchJSONRaw("/api/peladas/" + currentPeladaId + "/colors", {
      method: "PATCH",
      body: JSON.stringify({
        admin_secret: ADMIN_SECRET,
        team1_color: editingTeam1Color,
        team2_color: editingTeam2Color,
      }),
    });

    if (!res.ok) {
      showToast("Erro ao salvar cores.");
      return;
    }

    currentTeam1Color = editingTeam1Color;
    currentTeam2Color = editingTeam2Color;
    closeModal(colorsModalEl);
    showToast("Cores atualizadas.", "success");

    if (lastDrawnTeams.length > 0) {
      renderTeams(lastDrawnTeams);
    }
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar cores.");
  }
}

// ============================================================
// Create pelada wizard
// ============================================================

function renderWizardColorPickers() {
  renderBibPicker(createTeam1PickerEl, wizardTeam1Color, function (key) {
    wizardTeam1Color = key;
    renderWizardColorPickers();
  });
  renderBibPicker(createTeam2PickerEl, wizardTeam2Color, function (key) {
    wizardTeam2Color = key;
    renderWizardColorPickers();
  });
}

function openCreateModal() {
  createNameInput.value = "";
  createPassInput.value = "";
  createPass2Input.value = "";
  createPassErrorEl.classList.add("hidden");
  wizardPlayers = [];
  wizardPlayerRating = 3;
  wizardTeam1Color = "blue";
  wizardTeam2Color = "yellow";
  renderWizardColorPickers();
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
      body: JSON.stringify({
        name,
        password,
        team1_color: wizardTeam1Color,
        team2_color: wizardTeam2Color,
      }),
    });

    const pelada = await res.json();

    if (!res.ok) {
      showToast("Erro ao criar pelada.");
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
    showAppScreen(newPeladaId, name, wizardTeam1Color, wizardTeam2Color);
  } catch (err) {
    console.error(err);
    showToast("Erro ao criar pelada.");
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
    showToast("Erro ao carregar jogadores.");
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

  playerCountEl.textContent = total + " jogador(es) · " + activeCount + " selecionado(s)";

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
    showToast("Erro ao salvar jogador.");
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
      showToast("Erro ao atualizar jogador.");
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
    showToast("Erro ao remover jogador.");
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
    showToast("Erro ao desmarcar jogadores.");
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
    showToast("Erro ao confirmar presencas.");
  }
}

// ============================================================
// Event listeners — Players
// ============================================================

if (playerFormEl) { playerFormEl.addEventListener("submit", handlePlayerSubmit); }
if (cancelPlayerBtn) { cancelPlayerBtn.addEventListener("click", function () { closeModal(playerModalEl); }); }
if (playersListEl) { playersListEl.addEventListener("click", handlePlayerListClick); }
if (cancelDeleteBtn) { cancelDeleteBtn.addEventListener("click", function () { deleteTargetId = null; closeModal(confirmModalEl); }); }
if (confirmDeleteBtn) { confirmDeleteBtn.addEventListener("click", deletePlayer); }
if (fabAddPlayerBtn) { fabAddPlayerBtn.addEventListener("click", openNewPlayerModal); }
if (clearAllBtn) { clearAllBtn.addEventListener("click", clearAllPlayers); }
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

if (editColorsBtn) { editColorsBtn.addEventListener("click", openColorsModal); }
if (cancelColorsBtn) { cancelColorsBtn.addEventListener("click", function () { closeModal(colorsModalEl); }); }
if (confirmColorsBtn) { confirmColorsBtn.addEventListener("click", confirmColors); }

if (cancelDeletePeladaBtn) {
  cancelDeletePeladaBtn.addEventListener("click", function () {
    deleteTargetPeladaId = null;
    closeModal(deletePeladaModalEl);
  });
}
if (confirmDeletePeladaBtn) { confirmDeletePeladaBtn.addEventListener("click", confirmDeletePelada); }

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
