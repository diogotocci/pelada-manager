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
let helpReturnScreen = "s-home";

let checkinState = {};
let lastTeamSize = 5;
let lastDrawnTeams = [];

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

function gkGloveHTML(player) {
  return player && player.is_goalkeeper
    ? ' <span class="gk-glove" title="Goleiro fixo" aria-label="Goleiro fixo">🧤</span>'
    : "";
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
      "<b>2 times com a for\u00e7a somada parecida</b>, espalhando os melhores e os " +
      "mais fracos entre os lados. <b class=\"g\">N\u00e3o \u00e9 aleat\u00f3rio</b> \u2014 \u00e9 " +
      "equilibrado."
  },
  {
    ico: "\u2b50",
    title: "Os n\u00edveis (estrelas)",
    tag: false,
    body:
      "Cada jogador tem de <b>1 a 5 estrelas</b> (pode ter meia estrela). Quanto " +
      "mais estrelas, mais forte no sorteio. <b>S\u00f3 o admin</b> define e enxerga " +
      "as estrelas."
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
    ico: "\ud83d\udc64",
    title: "Membro e Admin",
    tag: false,
    body:
      "<b>Membro:</b> entra com a senha, marca presen\u00e7a e sorteia os times.<br>" +
      "<b>Admin</b> (chave): cadastra e edita jogadores, v\u00ea as notas e ajusta " +
      "atributos, cores e dia da pelada."
  },
  {
    ico: "\ud83d\udd12",
    title: "Por que n\u00e3o vejo as notas?",
    tag: false,
    body:
      "Por <b>privacidade</b>. A avalia\u00e7\u00e3o dos jogadores fica s\u00f3 com o admin \u2014 " +
      "mas o <b class=\"g\">sorteio continua justo</b> pra todo mundo do mesmo " +
      "jeito."
  },
  {
    ico: "\ud83c\udfbd",
    title: "Coletes, dia e compartilhar",
    tag: false,
    body:
      "Cada pelada escolhe as <b>cores dos coletes</b> e o <b>dia</b> do jogo. " +
      "D\u00e1 pra <b>compartilhar os times no WhatsApp</b> j\u00e1 com a data do " +
      "pr\u00f3ximo jogo."
  },
  {
    ico: "\ud83d\udee1\ufe0f",
    title: "Seus dados",
    tag: false,
    body:
      "Cada pelada \u00e9 <b>isolada</b> e protegida por senha. Ningu\u00e9m de uma " +
      "pelada acessa os dados de outra."
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
