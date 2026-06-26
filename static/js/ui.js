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
// Toast notifications
// ============================================================

function showToast(message, type) {
  type = type || "error";
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;

  const iconName = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";
  toast.innerHTML =
    '<i class="fa-solid ' + iconName + '"></i>' +
    "<span>" + message + "</span>" +
    '<button class="toast-close"><i class="fa-solid fa-xmark"></i></button>';

  toast.querySelector(".toast-close").addEventListener("click", function () {
    toast.classList.add("toast-exit");
    setTimeout(function () { toast.remove(); }, 300);
  });

  container.appendChild(toast);

  setTimeout(function () {
    if (toast.parentNode) {
      toast.classList.add("toast-exit");
      setTimeout(function () { toast.remove(); }, 300);
    }
  }, 4000);
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

// ============================================================
// Helpers
// ============================================================

function getAttributeValue(player, attributeName) {
  return Number(player[attributeName] ?? 2);
}

function buildPlayerInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDecimal(value) {
  return Number(value).toFixed(1);
}

// ============================================================
// Event listeners — UI
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
