// ============================================================
// State
// ============================================================

let players = [];
let currentPeladaId = null;
let currentPeladaName = "";
let currentTeam1Color = "blue";
let currentTeam2Color = "yellow";
let currentPeladaWeekday = null;
let isAdminMode = false;

let checkinState = {};
let lastTeamSize = 5;
let lastDrawnTeams = [];

const ADMIN_SECRET = window.ADMIN_SECRET || "";

const BIB_COLORS = [
  { key: "blue", label: "Azul", light: "#4da3ff", dark: "#2d7cff", emoji: "🔵" },
  { key: "yellow", label: "Amarelo", light: "#ffd94d", dark: "#f5be18", emoji: "🟡" },
  { key: "green", label: "Verde", light: "#4ade80", dark: "#16a34a", emoji: "🟢" },
  { key: "red", label: "Vermelho", light: "#f87171", dark: "#dc2626", emoji: "🔴" },
  { key: "orange", label: "Laranja", light: "#fb923c", dark: "#ea580c", emoji: "🟠" },
  { key: "black", label: "Preto", light: "#4b5563", dark: "#111827", emoji: "⚫" },
  { key: "white", label: "Branco", light: "#f9fafb", dark: "#d1d5db", emoji: "⚪" },
  { key: "pink", label: "Rosa", light: "#f472b6", dark: "#db2777", emoji: "🩷" },
];

// Weekday values follow JS Date.getDay(): 0=Sunday ... 6=Saturday.
const WEEKDAYS = [
  { value: 0, short: "Dom", long: "Domingo" },
  { value: 1, short: "Seg", long: "Segunda" },
  { value: 2, short: "Ter", long: "Terça" },
  { value: 3, short: "Qua", long: "Quarta" },
  { value: 4, short: "Qui", long: "Quinta" },
  { value: 5, short: "Sex", long: "Sexta" },
  { value: 6, short: "Sáb", long: "Sábado" },
];

// ============================================================
// DOM helper
// ============================================================

function $(id) {
  return document.getElementById(id);
}

// ============================================================
// Toast
// ============================================================

let toastTimer = null;

function showToast(message) {
  const toastEl = $("toast");
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove("on"); }, 2500);
}

// ============================================================
// Screens & sheets
// ============================================================

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("on"); });
  const el = $(id);
  if (el) el.classList.add("on");
}

function openSheet(name) {
  closeSheets(true);
  $("veil").classList.add("on");
  const sheet = $("sh-" + name);
  if (sheet) sheet.classList.add("on");
}

function closeSheets(keepVeil) {
  document.querySelectorAll(".sheet").forEach(function (s) { s.classList.remove("on"); });
  if (!keepVeil) $("veil").classList.remove("on");
}

// ============================================================
// Theme — claro (padrão) / escuro
// ============================================================

const SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

const THEME_COLORS = { light: "#f7f8f6", dark: "#101312" };

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pelada-theme", theme);

  document.querySelectorAll(".theme-btn").forEach(function (btn) {
    btn.innerHTML = theme === "light" ? MOON_ICON : SUN_ICON;
  });

  const themeSwitch = $("mn-theme");
  if (themeSwitch) themeSwitch.classList.toggle("on", theme === "dark");

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", THEME_COLORS[theme]);
}

function loadTheme() {
  const saved = localStorage.getItem("pelada-theme");
  applyTheme(saved === "dark" ? "dark" : "light");
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "light" ? "dark" : "light");
}

// ============================================================
// Admin mode
// ============================================================

function loadAdminMode() {
  isAdminMode = localStorage.getItem("pelada-admin-mode") === "true";
}

function setAdminMode(enabled) {
  isAdminMode = enabled;
  if (enabled) {
    localStorage.setItem("pelada-admin-mode", "true");
  } else {
    localStorage.removeItem("pelada-admin-mode");
  }
  refreshAdminUI();
}

function refreshAdminUI() {
  const adminSwitch = $("mn-admin");
  if (adminSwitch) adminSwitch.classList.toggle("on", isAdminMode);

  const colorsSection = $("mn-colors-section");
  if (colorsSection) colorsSection.classList.toggle("hidden", !isAdminMode);

  const compareActions = $("sq-admin-actions");
  if (compareActions) compareActions.classList.toggle("hidden", !isAdminMode);

  const auditBtn = $("tm-audit-btn");
  if (auditBtn) auditBtn.classList.toggle("hidden", !isAdminMode);

  if (typeof renderSquad === "function") renderSquad();
  if (typeof renderTeams === "function" && lastDrawnTeams.length > 0) renderTeams(lastDrawnTeams);
}

// ============================================================
// Stars
// ============================================================

function buildStarsHTML(rating) {
  let html = '<span class="stars" aria-label="' + formatDecimal(rating) + ' estrelas">';
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      html += "<span>★</span>";
    } else if (rating >= i - 0.5) {
      html += '<span class="half">★</span>';
    } else {
      html += '<span class="off">★</span>';
    }
  }
  return html + "</span>";
}

// Input de estrelas: toque define o valor cheio; tocar de novo na mesma
// estrela alterna para meia estrela.
function renderStarInput(element, value, onPick) {
  if (!element) return;
  element.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.textContent = "★";
    starBtn.setAttribute("aria-label", i + " estrela" + (i > 1 ? "s" : ""));
    if (value >= i) {
      starBtn.className = "lit";
    } else if (value >= i - 0.5) {
      starBtn.className = "half-lit";
    }
    starBtn.addEventListener("click", function () {
      onPick(value === i ? i - 0.5 : i);
    });
    element.appendChild(starBtn);
  }
}

// ============================================================
// Segmented control (atributos 1–3)
// ============================================================

function renderSeg(element, value, onPick) {
  if (!element) return;
  element.innerHTML = "";
  [1, 2, 3].forEach(function (v) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = v;
    if (v === value) btn.className = "on";
    btn.addEventListener("click", function () { onPick(v); });
    element.appendChild(btn);
  });
}

// ============================================================
// Bib colors
// ============================================================

function getBibColor(key) {
  return BIB_COLORS.find(function (c) { return c.key === key; }) || BIB_COLORS[0];
}

function buildBibEl(colorKey, small) {
  const color = getBibColor(colorKey);
  const bibEl = document.createElement("span");
  bibEl.className = "bib" + (small ? " bib-sm" : "");
  bibEl.setAttribute("aria-hidden", "true");
  bibEl.style.background = "linear-gradient(180deg, " + color.light + " 0%, " + color.dark + " 100%)";
  return bibEl;
}

function renderSwatches(container, selectedKey, onSelect) {
  if (!container) return;
  container.innerHTML = "";
  BIB_COLORS.forEach(function (c) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "swatch" + (c.key === selectedKey ? " on" : "");
    swatch.title = c.label;
    swatch.setAttribute("aria-label", c.label);

    const inner = document.createElement("span");
    inner.className = "inner";
    inner.style.background = "linear-gradient(180deg, " + c.light + " 0%, " + c.dark + " 100%)";

    swatch.appendChild(inner);
    swatch.addEventListener("click", function () { onSelect(c.key); });
    container.appendChild(swatch);
  });
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
  return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dateLabel(date) {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return days[date.getDay()] + ", " + date.getDate() + " de " + months[date.getMonth()];
}

function todayLabel() {
  return dateLabel(new Date());
}

// Next occurrence of a weekday (0-6). Today if today already matches, so a
// draw done on game day keeps that day; a draw done earlier jumps ahead.
// Falls back to today when the pelada has no configured weekday.
function nextGameDate(weekday) {
  const now = new Date();
  if (weekday == null) return now;
  const diff = (weekday - now.getDay() + 7) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  return target;
}

function gameDateLabel() {
  return dateLabel(nextGameDate(currentPeladaWeekday));
}

function renderWeekdayPicker(container, selectedValue, onSelect) {
  if (!container) return;
  container.innerHTML = "";
  WEEKDAYS.forEach(function (w) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wd" + (w.value === selectedValue ? " on" : "");
    btn.textContent = w.short;
    btn.setAttribute("aria-label", w.long);
    btn.addEventListener("click", function () { onSelect(w.value); });
    container.appendChild(btn);
  });
}
