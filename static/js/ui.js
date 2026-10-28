// ============================================================
// No zoom — block pinch-zoom on iOS Safari, which ignores
// user-scalable=no. (Double-tap zoom is handled by CSS touch-action.)
// ============================================================

["gesturestart", "gesturechange", "gestureend"].forEach(function (evt) {
  document.addEventListener(evt, function (e) { e.preventDefault(); }, { passive: false });
});

// ============================================================
// State
// ============================================================

let players = [];
let currentPeladaId = null;
let currentPeladaName = "";
let currentTeam1Color = "blue";
let currentTeam2Color = "yellow";
let currentPeladaWeekday = null;
// "futsal" (salão) or "field" (campo/society); fixed when the pelada is created.
let currentPeladaSport = "futsal";
let currentPeladaRole = null;
// Goal/assist marking + rankings (opt-in) and the countdown timer (default on).
let currentStatsEnabled = false;
let currentTimerEnabled = true;
let currentTimerMinutes = 8;
let isAdminMode = false;
let helpReturnScreen = "s-home";

let checkinState = {};
let lastTeamSize = 5;
let lastDrawnTeams = [];
// Index (0 or 1) of the playing team that starts with the ball, from the draw.
let lastKickoffTeam = null;

const BIB_COLORS = [
  { key: "blue", label: "Azul", light: "#4da3ff", dark: "#2d7cff" },
  { key: "yellow", label: "Amarelo", light: "#ffd94d", dark: "#f5be18" },
  { key: "green", label: "Verde", light: "#4ade80", dark: "#16a34a" },
  { key: "red", label: "Vermelho", light: "#f87171", dark: "#dc2626" },
  { key: "orange", label: "Laranja", light: "#fb923c", dark: "#ea580c" },
  { key: "black", label: "Preto", light: "#4b5563", dark: "#111827" },
  { key: "white", label: "Branco", light: "#f9fafb", dark: "#d1d5db" },
  { key: "gray", label: "Cinza", light: "#b8bfc7", dark: "#7b8490" },
  { key: "pink", label: "Rosa", light: "#f472b6", dark: "#db2777" },
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

// Admin mode is derived from the caller's role in the current pelada
// (owner/admin), set on enterPelada — never persisted.
function setAdminMode(enabled) {
  isAdminMode = enabled;
  refreshAdminUI();
}

function refreshAdminUI() {
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

const CUSTOM_BIB_RE = /^#[0-9a-f]{6}$/i;
const CUSTOM_SWATCH_RING = "conic-gradient(#ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)";

function isCustomBibColor(key) {
  return typeof key === "string" && CUSTOM_BIB_RE.test(key);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Mixes a hex color with white; amount 0..1.
function lightenHex(hex, amount) {
  const c = hexToRgb(hex);
  const mix = function (v) { return Math.round(v + (255 - v) * amount).toString(16).padStart(2, "0"); };
  return "#" + mix(c.r) + mix(c.g) + mix(c.b);
}

// Approximate Portuguese name for any color, so custom bibs need no typing.
function approxColorName(hex) {
  const c = hexToRgb(hex);
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;

  if (l < 0.12) return "Preto";
  if (l > 0.93) return "Branco";
  if (s < 0.15) return l < 0.36 ? "Grafite" : "Cinza";

  if (h < 15 || h >= 345) {
    if (l < 0.3) return "Vinho";
    return l > 0.75 ? "Rosa" : "Vermelho";
  }
  if (h < 45) {
    if (l > 0.75 && s < 0.85) return "Bege";
    if (l < 0.42) return h < 35 ? "Marrom" : "Mostarda";
    return h < 20 && l > 0.65 ? "Salmão" : "Laranja";
  }
  if (h < 66) {
    if (l < 0.4) return h < 50 ? "Mostarda" : "Verde-oliva";
    return l > 0.75 && s < 0.6 ? "Bege" : "Amarelo";
  }
  if (h < 90) return l < 0.35 ? "Verde-oliva" : "Verde-limão";
  if (h < 160) return l < 0.3 ? "Verde-escuro" : "Verde";
  if (h < 180) return l < 0.35 ? "Verde-petróleo" : "Verde-água";
  if (h < 250) {
    if (l < 0.36) return "Azul-marinho";
    return l > 0.7 || h < 205 ? "Azul-claro" : "Azul";
  }
  if (h < 290) return l > 0.72 ? "Lilás" : "Roxo";
  if (h < 330) return l < 0.3 ? "Roxo" : l > 0.65 ? "Lilás" : "Magenta";
  return l < 0.3 ? "Vinho" : "Rosa";
}

function getBibColor(key) {
  if (isCustomBibColor(key)) {
    const hex = key.toLowerCase();
    return { key: hex, label: approxColorName(hex), light: lightenHex(hex, 0.3), dark: hex, custom: true };
  }
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

// Preset swatches plus a multicolor one that opens the device color picker.
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

  const custom = isCustomBibColor(selectedKey) ? getBibColor(selectedKey) : null;
  const swatch = document.createElement("label");
  swatch.className = "swatch swatch-custom" + (custom ? " on" : "");
  swatch.title = custom ? custom.label : "Outra cor";
  // A chosen custom color keeps a rainbow ring so it still reads as "any color".
  if (custom) swatch.style.background = CUSTOM_SWATCH_RING;

  const inner = document.createElement("span");
  inner.className = "inner";
  inner.style.background = custom
    ? "linear-gradient(180deg, " + custom.light + " 0%, " + custom.dark + " 100%)"
    : CUSTOM_SWATCH_RING;

  const input = document.createElement("input");
  input.type = "color";
  input.value = custom ? custom.key : "#7c3aed";
  input.setAttribute("aria-label", custom ? "Cor escolhida: " + custom.label : "Escolher outra cor");
  // "change" fires once the picker closes, so a drag does not save every step.
  input.addEventListener("change", function () { onSelect(input.value.toLowerCase()); });

  swatch.appendChild(inner);
  swatch.appendChild(input);
  container.appendChild(swatch);
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

function gkGloveHTML(player) {
  return player && player.is_goalkeeper
    ? ' <span class="gk-glove" title="Goleiro fixo" aria-label="Goleiro fixo">🧤</span>'
    : "";
}

// ============================================================
// Posições (só peladas de campo)
// ============================================================

const POSITIONS = [
  { value: "goalkeeper", label: "Goleiro", short: "GOL" },
  { value: "defender", label: "Zagueiro", short: "ZAG" },
  { value: "fullback", label: "Lateral", short: "LAT" },
  { value: "midfielder", label: "Meio campo", short: "MEI" },
  { value: "forward", label: "Atacante", short: "ATA" },
];

function isFieldPelada() {
  return currentPeladaSport === "field";
}

function getPosition(value) {
  return POSITIONS.find(function (p) { return p.value === value; }) || null;
}

// Position the player plays today: the day position while set, else the main one.
function currentPosition(player) {
  return (player && (player.day_position || player.position)) || null;
}

function positionOrder(value) {
  const index = POSITIONS.findIndex(function (p) { return p.value === value; });
  return index === -1 ? POSITIONS.length : index;
}

function renderPositionPicker(container, selected, onSelect) {
  if (!container) return;
  container.innerHTML = "";
  POSITIONS.forEach(function (pos) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-opt" + (pos.value === selected ? " on" : "");
    btn.textContent = pos.label;
    btn.setAttribute("aria-pressed", String(pos.value === selected));
    btn.addEventListener("click", function () { onSelect(pos.value); });
    container.appendChild(btn);
  });
}

// Dominant foot (field peladas only, optional): a cleat seen from above. The
// left one is the right one mirrored.
const DOMINANT_FEET = [
  { value: "left", label: "Esquerdo" },
  { value: "right", label: "Direito" },
];

const FOOT_PATH = "M10.6 1.5C13.6 1.5 16.2 3.6 16.6 7.2C16.9 9.8 15.6 12.2 15.4 14.4C15.2 16.6 16 18.8 15.6 20.4C15.1 22.2 13.6 22.9 12 22.9C10.2 22.9 8.8 22 8.5 20.2C8.2 18.2 8.6 15.6 8.4 13.4C8.2 11 7 8.8 7.1 6C7.2 3.4 8.6 1.5 10.6 1.5ZM9.8 18.3a2.2 2.8 0 1 0 4.4 0a2.2 2.8 0 1 0 -4.4 0ZM10.3 8.6h3.3v1.1h-3.3ZM10.2 10.6h3.4v1.1h-3.4ZM10.2 12.6h3.5v1.1h-3.5Z";

function getDominantFoot(value) {
  return DOMINANT_FEET.find(function (f) { return f.value === value; }) || null;
}

function footIconSVG(foot, size) {
  const mirror = foot === "left" ? ' transform="matrix(-1 0 0 1 24 0)"' : "";
  return '<svg class="foot-icon" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<path fill="currentColor" fill-rule="evenodd"' + mirror + ' d="' + FOOT_PATH + '"/></svg>';
}

// "[icon] Pé esquerdo" for the meta line under a player's name; empty when unset.
function footTagHTML(value) {
  const foot = getDominantFoot(value);
  if (!foot) return "";
  return '<span class="foot-tag">' + footIconSVG(foot.value, 14) + "Pé " + foot.label.toLowerCase() + "</span>";
}

// Tapping the selected foot again clears it (the field is optional).
function renderFootPicker(container, selected, onSelect) {
  if (!container) return;
  container.innerHTML = "";
  DOMINANT_FEET.forEach(function (foot) {
    const on = foot.value === selected;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "foot-opt" + (on ? " on" : "");
    btn.setAttribute("aria-pressed", String(on));
    btn.innerHTML = footIconSVG(foot.value, 26) + "<span>" + foot.label + "</span>";
    btn.addEventListener("click", function () { onSelect(on ? null : foot.value); });
    container.appendChild(btn);
  });
}

function kickoffBallSVG(size) {
  return '<svg class="kickoff-ball" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9.5"/>' +
    '<path d="M12 7.2l4.2 3-1.6 4.9H9.4L7.8 10.2z"/>' +
    '<path d="M12 7.2V2.6M16.2 10.2l4.3-1.5M14.6 15.1l2.7 3.8M9.4 15.1l-2.7 3.8M7.8 10.2 3.5 8.7"/>' +
    "</svg>";
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

// ============================================================
// Como funciona (help accordion)
// ============================================================

const HELP_ITEMS = [
  {
    ico: "\u26bd",
    title: "Como os times s\u00e3o sorteados",
    tag: false,
    body:
      "As <b>estrelas</b> de cada jogador definem a for\u00e7a dele. O app monta " +
      "<b>times com a for\u00e7a somada parecida</b>, espalhando os melhores e os " +
      "mais fracos entre os lados. <b class=\"g\">N\u00e3o \u00e9 aleat\u00f3rio</b> \u2014 \u00e9 " +
      "equilibrado." +
      "<p style=\"margin-top:8px\">No <b>campo/society</b> o sorteio tamb\u00e9m olha a " +
      "<b>posi\u00e7\u00e3o</b> de cada um \u2014 veja as regras abaixo.</p>"
  },
  {
    ico: "\ud83d\udd11",
    title: "Entrar e criar pelada",
    tag: false,
    body:
      "Voc\u00ea entra no app com sua <b>conta Google</b> \u2014 sem senha de grupo. Ao " +
      "criar uma pelada, voc\u00ea vira o <b>dono</b> dela. Na tela inicial aparecem " +
      "s\u00f3 as peladas de que voc\u00ea participa." +
      "<div class=\"help-sub\">" +
      "<p><b>Tipo:</b> <b>Sal\u00e3o</b> ou <b>Campo / society</b>. O tipo " +
      "<b>n\u00e3o muda depois</b> de criada.</p>" +
      "<p><b>Dia da pelada:</b> agora \u00e9 <b>obrigat\u00f3rio</b> \u2014 \u00e9 ele que define " +
      "at\u00e9 quando valem a posi\u00e7\u00e3o do dia e o ranking do dia.</p>" +
      "</div>"
  },
  {
    ico: "\ud83d\udc64",
    title: "Dono, admin e membro",
    tag: false,
    body:
      "Cada pessoa tem um papel na pelada:" +
      "<div class=\"help-sub\">" +
      "<p><b>Dono:</b> manda na pelada \u2014 pode <b>excluir</b>, <b>transferir</b> " +
      "a propriedade e faz tudo que o admin faz.</p>" +
      "<p><b>Admin:</b> cadastra e edita jogadores, v\u00ea e ajusta as notas, " +
      "atributos, cores e dia, e <b>convida</b> gente.</p>" +
      "<p><b>Membro:</b> marca presen\u00e7a, sorteia, troca a posi\u00e7\u00e3o do dia e marca " +
      "gols. Pode cadastrar jogador, mas depois <b>n\u00e3o v\u00ea nem edita</b> as " +
      "notas.</p>" +
      "</div>"
  },
  {
    ico: "\u2b50",
    title: "Os n\u00edveis (estrelas)",
    tag: false,
    body:
      "Cada jogador tem de <b>1 a 5 estrelas</b> (pode ter meia estrela). Quanto " +
      "mais estrelas, mais forte no sorteio. <b>S\u00f3 admin e dono</b> definem e " +
      "enxergam as estrelas."
  },
  {
    ico: "\ud83c\udfdf\ufe0f",
    title: "Posi\u00e7\u00f5es (campo/society)",
    tag: false,
    body:
      "Na pelada de <b>campo/society</b> cada jogador tem uma <b>posi\u00e7\u00e3o " +
      "principal</b>: <b>Goleiro</b>, <b>Zagueiro</b>, <b>Lateral</b>, " +
      "<b>Meio campo</b> ou <b>Atacante</b>. No sal\u00e3o n\u00e3o tem posi\u00e7\u00e3o." +
      "<div class=\"help-sub\">" +
      "<p><b>Posi\u00e7\u00e3o do dia:</b> na presen\u00e7a, toque na posi\u00e7\u00e3o de algu\u00e9m pra " +
      "trocar <b>s\u00f3 por hoje</b> (faltou zagueiro? algu\u00e9m quebra o galho). " +
      "Qualquer pessoa da pelada pode trocar.</p>" +
      "<p>Ela vale <b>at\u00e9 o dia do jogo passar</b>; depois volta sozinha pra " +
      "posi\u00e7\u00e3o principal.</p>" +
      "<p><b>P\u00e9 dominante:</b> opcional, no cadastro (direito ou esquerdo). " +
      "Aparece no elenco ao lado da posi\u00e7\u00e3o e n\u00e3o muda o sorteio.</p>" +
      "</div>"
  },
  {
    ico: "\u2696\ufe0f",
    title: "Regras do sorteio no campo/society",
    tag: false,
    body:
      "No <b>campo/society</b>, al\u00e9m das estrelas, o sorteio segue estas " +
      "regras, nesta ordem de prioridade:" +
      "<div class=\"help-sub\">" +
      "<p><b>1. Posi\u00e7\u00f5es divididas por igual</b> \u2014 cada posi\u00e7\u00e3o de linha " +
      "(zagueiro, lateral, meio campo, atacante) \u00e9 espalhada entre os times. " +
      "Um time pode ter <b>no m\u00e1ximo 1 a mais</b> de uma posi\u00e7\u00e3o que o outro.</p>" +
      "<p><b>2. Estrelas equilibradas dentro da posi\u00e7\u00e3o</b> \u2014 a soma de estrelas " +
      "de cada posi\u00e7\u00e3o fica parecida dos dois lados. Com 4 zagueiros (5\u2605, " +
      "4\u2605, 3\u2605, 2\u2605), cada time leva um forte e um fraco, e n\u00e3o os dois " +
      "craques juntos.</p>" +
      "<p><b>3. For\u00e7a total parecida</b> \u2014 no fim, a soma de estrelas e os " +
      "atributos de cada time tamb\u00e9m ficam equilibrados, como no sal\u00e3o.</p>" +
      "</div>" +
      "<p style=\"margin-top:8px\">Vale a <b>posi\u00e7\u00e3o do dia</b> de cada um. " +
      "<b>Goleiro</b> segue a regra do goleiro fixo (at\u00e9 2 no gol; os demais " +
      "jogam na linha). As regras de posi\u00e7\u00e3o valem para os <b>times completos</b>; " +
      "o time que sobra com menos gente n\u00e3o entra na conta.</p>" +
      "<p style=\"margin-top:8px\">A forma\u00e7\u00e3o <b class=\"g\">n\u00e3o \u00e9 fixa</b>: o app " +
      "s\u00f3 divide o que tem. Se a conta n\u00e3o fecha (1 zagueiro s\u00f3, 3 laterais), " +
      "aparece o <b>aviso de desequil\u00edbrio</b>.</p>"
  },
  {
    ico: "\u26a0\ufe0f",
    title: "Aviso de desequil\u00edbrio por posi\u00e7\u00e3o",
    tag: false,
    body:
      "Na presen\u00e7a do <b>campo/society</b>, o app avisa quando uma posi\u00e7\u00e3o de " +
      "linha n\u00e3o fecha certinho:" +
      "<div class=\"help-sub\">" +
      "<p><b>S\u00f3 1 jogador</b> na posi\u00e7\u00e3o \u2014 n\u00e3o d\u00e1 pra ter um de cada lado.</p>" +
      "<p><b>N\u00famero \u00edmpar</b> (ex.: 3 laterais) \u2014 um time fica com um a mais.</p>" +
      "</div>" +
      "<p style=\"margin-top:8px\">Toque no aviso: o app <b class=\"g\">sugere " +
      "quem trocar de posi\u00e7\u00e3o hoje</b> pra resolver. \u00c9 s\u00f3 um aviso \u2014 d\u00e1 pra " +
      "sortear assim mesmo.</p>"
  },
  {
    ico: "\u26bd",
    title: "Atributos do jogador de linha",
    tag: true,
    body:
      "As <b>estrelas</b> s\u00e3o o que mais pesa. Al\u00e9m delas, cada jogador tem 3 " +
      "atributos de <b>1 a 3</b> (2 = normal): <b>Marca\u00e7\u00e3o</b>, <b>Corrida</b> " +
      "e <b>Faz gol</b>. Eles fazem o <b class=\"g\">ajuste fino</b> do sorteio:" +
      "<div class=\"help-sub\">" +
      "<p><b>1. N\u00e3o amontoa os extremos</b> \u2014 evita juntar v\u00e1rios craques " +
      "(ou v\u00e1rios fracos) no mesmo atributo de um s\u00f3 lado.</p>" +
      "<p><b>2. Equilibra a soma</b> \u2014 deixa a soma de cada atributo parecida " +
      "entre os dois times.</p>" +
      "</div>" +
      "<p style=\"margin-top:8px\"><b>Peso:</b> Estrelas \u226b Marca\u00e7\u00e3o \u203a " +
      "Faz gol \u203a Corrida. Quem \u00e9 <b>2 em tudo</b> n\u00e3o interfere no ajuste.</p>"
  },
  {
    ico: "\ud83e\udde4",
    title: "Goleiro fixo",
    tag: true,
    body:
      "O goleiro <b>ocupa uma vaga</b> do time (num 5x5, sobram 4 na linha). A " +
      "for\u00e7a dele vem das <b>estrelas</b> (defesa) e de <b>quanto joga com o " +
      "p\u00e9</b>:" +
      "<div class=\"help-formula\">" +
      "<div class=\"f\">Vantagem = (Defesa + b\u00f4nus do p\u00e9) \u2212 2,5</div>" +
      "<div class=\"s\">p\u00e9 1 \u2192 +0 \u00b7 p\u00e9 2 \u2192 +0,5 \u00b7 p\u00e9 3 \u2192 +1,0</div>" +
      "</div>" +
      "<p style=\"margin-top:8px\">Essa vantagem vira <b class=\"g\">refor\u00e7o pro " +
      "time sem goleiro</b>, pra compensar o lado que tem o goleiro forte.</p>" +
      "<div class=\"help-ex\">" +
      "<div><div class=\"t\">3\u2605 \u00b7 p\u00e9 1</div><div class=\"d\">vantagem 0,5 \u2014 " +
      "quase n\u00e3o muda</div></div>" +
      "<div><div class=\"t\">5\u2605 \u00b7 p\u00e9 3</div><div class=\"d\">vantagem 3,5 \u2014 " +
      "refor\u00e7a bem o outro time</div></div>" +
      "</div>"
  },
  {
    ico: "\ud83c\udfb2",
    title: "Bola de sa\u00edda",
    tag: false,
    body:
      "A cada sorteio o app tamb\u00e9m <b>sorteia quem come\u00e7a com a bola</b>. Aparece " +
      "logo abaixo do placar, com a <b>cor do colete</b> do time \u2014 " +
      "<b class=\"g\">acabou a discuss\u00e3o do par ou \u00edmpar</b>."
  },
  {
    ico: "\ud83d\uddfa\ufe0f",
    title: "Lista, campinho e compartilhar",
    tag: false,
    body:
      "Depois do sorteio, veja os times em <b>Lista</b> ou no <b>Campinho</b>. " +
      "No campo/society cada um aparece no setor da sua posi\u00e7\u00e3o, com a sigla " +
      "(ZAG, LAT, MEI, ATA); no sal\u00e3o aparece numa <b>quadra de madeira</b> " +
      "(1-2-1)." +
      "<p style=\"margin-top:8px\">O bot\u00e3o <b>Compartilhar</b> manda " +
      "<b class=\"g\">sempre a imagem do campinho</b> no WhatsApp, com a data do " +
      "pr\u00f3ximo jogo \u2014 n\u00e3o importa qual vis\u00e3o est\u00e1 aberta.</p>"
  },
  {
    ico: "\ud83d\udd17",
    title: "Convidar pra pelada",
    tag: true,
    body:
      "<b>Dono e admin</b> geram um <b>link de convite</b> (como membro ou admin), " +
      "escolhem a validade (1h, 24h ou 7 dias) e mandam no <b>WhatsApp</b>. " +
      "Quem abrir o link entra com o Google e j\u00e1 cai na pelada. D\u00e1 pra " +
      "<b class=\"g\">revogar</b> o link quando quiser."
  },
  {
    ico: "\ud83d\udd12",
    title: "Por que n\u00e3o vejo as notas?",
    tag: false,
    body:
      "Por <b>privacidade</b>. As notas ficam s\u00f3 com o <b>admin e o dono</b> \u2014 " +
      "mas o <b class=\"g\">sorteio continua justo</b> pra todo mundo do mesmo " +
      "jeito."
  },
  {
    ico: "\ud83c\udfbd",
    title: "Coletes e dia",
    tag: false,
    body:
      "Cada pelada escolhe as <b>cores dos coletes</b> e o <b>dia</b> do jogo. " +
      "A bolinha colorida abre o seletor do celular pra usar <b>qualquer cor</b>; " +
      "o app d\u00e1 o nome aproximado sozinho. " +
      "O admin muda isso quando quiser nos <b>ajustes</b>."
  },
  {
    ico: "\u23f1\ufe0f",
    title: "Cron\u00f4metro",
    tag: false,
    body:
      "Escolha os minutos e o <b>cron\u00f4metro</b> faz a contagem regressiva, com " +
      "<b>apito no fim</b>. Ele roda <b>s\u00f3 no celular de quem iniciou</b>. Vem " +
      "<b>ligado</b> por padr\u00e3o; nos ajustes o admin desliga e define a " +
      "<b>dura\u00e7\u00e3o padr\u00e3o</b>."
  },
  {
    ico: "\ud83e\udd45",
    title: "Gols e assist\u00eancias",
    tag: false,
    body:
      "Se a pelada tem <b>Marcar gols e assist\u00eancias</b> ligado (escolhido ao " +
      "criar ou depois nos ajustes), aparece o bot\u00e3o de marcar nos times e a " +
      "aba <b>Ranking</b>." +
      "<div class=\"help-sub\">" +
      "<p><b>Qualquer membro marca</b>, durante o jogo, com o <b>+</b> e " +
      "<b>\u2212</b> de bola (gol) e chuteira (assist\u00eancia).</p>" +
      "<p>A lista \u00e9 o <b>elenco inteiro</b> em ordem alfab\u00e9tica \u2014 d\u00e1 pra marcar " +
      "at\u00e9 quem <b>chegou depois do sorteio</b>.</p>" +
      "</div>"
  },
  {
    ico: "\ud83c\udfc6",
    title: "Ranking do dia e do ano",
    tag: false,
    body:
      "A aba <b>Ranking</b> ordena por <b>gols</b> e desempata por " +
      "<b>assist\u00eancias</b>:" +
      "<div class=\"help-sub\">" +
      "<p><b>Do dia:</b> fica no ar <b>at\u00e9 a v\u00e9spera da pr\u00f3xima pelada</b>, " +
      "depois some pra come\u00e7ar a pr\u00f3xima rodada.</p>" +
      "<p><b>Do ano:</b> soma todas as peladas do ano e <b>zera em 1\u00ba de " +
      "janeiro</b>. D\u00e1 pra ver anos anteriores.</p>" +
      "</div>" +
      "<p style=\"margin-top:8px\">Os dois d\u00e1 pra <b class=\"g\">compartilhar no " +
      "WhatsApp</b>.</p>"
  },
  {
    ico: "\ud83d\udee1\ufe0f",
    title: "Seus dados",
    tag: false,
    body:
      "Cada pelada \u00e9 <b>isolada</b>: s\u00f3 quem participa acessa. Voc\u00ea pode <b>sair</b> " +
      "de uma pelada quando quiser, ou <b>excluir sua conta</b> \u2014 o que apaga " +
      "tamb\u00e9m as peladas onde voc\u00ea \u00e9 dono."
  }
];

function renderHelp() {
  const acc = document.getElementById("help-acc");
  if (!acc || acc.dataset.built === "1") return;

  HELP_ITEMS.forEach(function (item, i) {
    const q = document.createElement("div");
    q.className = "help-q" + (i === 0 ? " open" : "");

    const head = document.createElement("button");
    head.type = "button";
    head.className = "help-q-head";

    const tagHTML = item.tag
      ? "<span class=\"help-q-tag\">s\u00f3 admin</span>"
      : "";
    head.innerHTML =
      "<span class=\"help-q-ico\">" + item.ico + "</span>" +
      "<span class=\"help-q-title\">" + item.title + "</span>" +
      tagHTML +
      "<span class=\"help-q-chev\"><svg viewBox=\"0 0 24 24\">" +
      "<path d=\"M9 18l6-6-6-6\"/></svg></span>";
    head.addEventListener("click", function () { q.classList.toggle("open"); });

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "help-q-body";
    const inner = document.createElement("div");
    inner.className = "help-q-inner";
    inner.innerHTML = item.body;
    bodyWrap.appendChild(inner);

    q.appendChild(head);
    q.appendChild(bodyWrap);
    acc.appendChild(q);
  });

  acc.dataset.built = "1";
}

function openHelp(fromScreen) {
  helpReturnScreen = fromScreen || "s-home";
  renderHelp();
  showScreen("s-help");
}

let feedbackReturnScreen = "s-home";

function openFeedback(fromScreen) {
  feedbackReturnScreen = fromScreen || "s-home";
  $("fb-category").value = "bug";
  $("fb-subject").value = "";
  $("fb-message").value = "";
  $("fb-contact").value = "";
  $("fb-err").classList.remove("on");
  showScreen("s-feedback");
  setTimeout(function () { $("fb-subject").focus(); }, 100);
}
