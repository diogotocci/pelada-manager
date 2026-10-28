// ============================================================
// Match day: countdown timer, live goal/assist marking and the
// daily/yearly rankings (with a shareable image).
// ============================================================

// Boot icon for assists, traced from the reference drawing (filled, evenodd).
const BOOT_PATH = "M8.30 1.32 7.40 2.04 3.75 5.69 2.94 6.64 2.62 7.40 2.62 8.66 2.80 9.20 3.16 9.75 3.39 9.93 3.43 10.15 2.98 10.60 2.76 10.96 2.76 11.32 2.85 11.50 3.25 11.77 3.48 11.77 3.84 11.59 4.29 11.10 4.52 11.10 5.51 12.09 5.51 12.23 5.01 12.72 4.83 13.04 4.83 13.40 4.92 13.58 5.19 13.80 5.55 13.85 5.78 13.76 6.32 13.22 6.64 13.22 9.88 16.46 9.84 16.73 9.25 17.32 9.25 17.82 9.34 18.00 9.57 18.18 10.02 18.22 10.33 18.04 10.83 17.55 10.96 17.55 12.00 18.58 11.95 18.76 11.41 19.26 11.28 19.48 11.28 19.89 11.68 20.30 12.14 20.30 12.86 19.62 13.04 19.62 14.03 20.61 13.98 20.88 13.44 21.38 13.40 22.01 13.62 22.28 13.85 22.37 14.25 22.32 14.89 21.74 15.16 21.69 15.61 22.14 16.91 22.82 17.86 23.00 18.90 22.86 19.80 22.46 20.48 21.87 21.06 21.11 21.42 20.07 21.42 19.03 21.06 17.91 20.52 17.05 19.89 16.37 19.53 15.83 18.58 13.76 18.36 12.90 18.22 12.68 18.18 12.18 18.04 12.00 18.00 11.46 17.82 10.92 17.41 7.72 16.96 7.40 15.74 7.45 14.80 7.22 13.53 6.41 12.59 5.42 12.14 4.74 11.73 3.66 11.73 2.08 11.14 1.50 10.51 1.18 9.66 1.00 8.84 1.09ZM5.82 5.46 5.96 5.46 6.09 5.60 6.55 6.36 6.82 7.54 6.82 8.53 6.73 9.16 6.36 10.06 5.91 10.65 4.43 9.25 3.98 8.66 3.84 8.26 3.84 7.85 3.98 7.36ZM9.16 2.31 9.61 2.26 10.02 2.35 10.47 2.67 10.51 3.89 10.74 4.52 10.74 4.74 11.46 6.05 12.59 7.27 14.03 8.26 15.07 8.62 16.15 8.71 16.33 8.93 16.33 9.52 16.46 10.06 16.33 10.29 13.76 10.29 13.58 10.38 13.40 10.65 13.40 11.10 13.62 11.41 13.85 11.50 16.60 11.59 16.78 11.77 16.82 12.32 16.96 12.63 16.87 12.86 15.34 12.90 14.93 13.17 14.84 13.67 14.93 13.85 15.34 14.16 17.36 14.21 17.50 14.34 17.50 14.52 17.77 15.02 17.82 15.29 17.68 15.47 17.00 15.47 16.60 15.65 16.42 16.01 16.46 16.42 16.82 16.73 18.54 16.69 19.44 17.77 19.93 18.54 20.16 19.30 20.07 20.20 19.84 20.66 19.17 21.33 18.58 21.65 17.41 21.65 16.19 20.97 6.95 11.73 6.95 11.46 7.54 10.56 7.90 9.66 8.08 8.71 8.08 7.40 7.90 6.41 7.76 6.23 7.54 5.51 6.91 4.43 8.39 2.85Z";
const BALL_PATHS = [
  "M12 7.2l4.2 3-1.6 4.9H9.4L7.8 10.2z",
  "M12 7.2V2.6M16.2 10.2l4.3-1.5M14.6 15.1l2.7 3.8M9.4 15.1l-2.7 3.8M7.8 10.2 3.5 8.7",
];

function ballIconSVG(size) {
  return '<svg class="stat-ball" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9.5"/><path d="' + BALL_PATHS[0] + '"/><path d="' + BALL_PATHS[1] + '"/></svg>';
}

function bootIconSVG(size) {
  return '<svg class="stat-boot" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<path fill-rule="evenodd" d="' + BOOT_PATH + '"/></svg>';
}

const TIMER_MIN = 1;
const TIMER_MAX = 60;
const TIMER_PRESETS = [5, 7, 8, 10, 12];

// ------------------------------------------------------------
// Settings (from the pelada) and visibility of the entry points
// ------------------------------------------------------------

function applyMatchSettings(pelada) {
  currentStatsEnabled = !!(pelada && pelada.stats_enabled);
  currentTimerEnabled = !(pelada && pelada.timer_enabled === false);
  const minutes = pelada && pelada.timer_minutes != null ? Number(pelada.timer_minutes) : 8;
  currentTimerMinutes = Math.min(TIMER_MAX, Math.max(TIMER_MIN, minutes || 8));
  if (!timerHasStarted()) resetTimer(currentTimerMinutes);
  refreshMatchEntryPoints();
}

function refreshMatchEntryPoints() {
  document.querySelectorAll(".tab-ranking").forEach(function (tab) {
    tab.classList.toggle("hidden", !currentStatsEnabled);
  });
  document.querySelectorAll(".timer-open").forEach(function (btn) {
    btn.classList.toggle("hidden", !currentTimerEnabled);
  });
  $("tm-live-btn").classList.toggle("hidden", !currentStatsEnabled);
  $("tr-live").classList.toggle("hidden", !currentStatsEnabled);
  $("lv-timer").classList.toggle("hidden", !currentTimerEnabled);
}

function renderMatchSettings() {
  $("mn-stats").classList.toggle("on", currentStatsEnabled);
  $("mn-stats").setAttribute("aria-checked", String(currentStatsEnabled));
  $("mn-timer").classList.toggle("on", currentTimerEnabled);
  $("mn-timer").setAttribute("aria-checked", String(currentTimerEnabled));
  $("mn-tmin").textContent = currentTimerMinutes + " min";
  $("mn-tmin-row").classList.toggle("hidden", !currentTimerEnabled);
}

async function saveMatchSettings(changes) {
  const next = {
    stats_enabled: currentStatsEnabled,
    timer_enabled: currentTimerEnabled,
    timer_minutes: currentTimerMinutes,
  };
  Object.assign(next, changes);
  if (next.stats_enabled && !currentStatsEnabled && currentPeladaWeekday == null) {
    showToast("Escolha o dia da pelada primeiro.");
    return;
  }
  try {
    const res = await fetchJSONRaw("/api/peladas/" + currentPeladaId + "/match-settings", {
      method: "PATCH",
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      showToast("Erro ao salvar ajustes.");
      return;
    }
    applyMatchSettings(await res.json());
    renderMatchSettings();
    // Leaving the ranking when stats get turned off.
    if (!currentStatsEnabled && $("s-ranking").classList.contains("on")) setTab("hoje");
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar ajustes.");
  }
}

// ------------------------------------------------------------
// Countdown timer (local to this device)
// ------------------------------------------------------------

let timerState = { minutes: 8, remainingMs: 8 * 60000, endAt: null, finished: false };
let timerInterval = null;
let timerReturnScreen = "s-checkin";
let timerAudio = null;
let timerWakeLock = null;

function timerRunning() {
  return timerState.endAt !== null;
}

function timerHasStarted() {
  return timerRunning() || timerState.finished || timerState.remainingMs !== timerState.minutes * 60000;
}

function timerRemainingMs() {
  if (timerRunning()) return Math.max(0, timerState.endAt - Date.now());
  return timerState.remainingMs;
}

function resetTimer(minutes) {
  timerState = { minutes: minutes, remainingMs: minutes * 60000, endAt: null, finished: false };
  stopTimerTicking();
  renderTimer();
}

function startTimer() {
  if (timerState.finished) {
    resetTimer(timerState.minutes);
  }
  unlockTimerAudio();
  timerState.endAt = Date.now() + timerState.remainingMs;
  requestWakeLock();
  clearInterval(timerInterval);
  timerInterval = setInterval(tickTimer, 250);
  renderTimer();
}

function pauseTimer() {
  if (!timerRunning()) return;
  timerState.remainingMs = timerRemainingMs();
  timerState.endAt = null;
  stopTimerTicking();
  renderTimer();
}

function toggleTimer() {
  if (timerRunning()) pauseTimer();
  else startTimer();
}

function addTimerMinute() {
  if (timerRunning()) timerState.endAt += 60000;
  else timerState.remainingMs += 60000;
  timerState.finished = false;
  renderTimer();
}

function stopTimerTicking() {
  clearInterval(timerInterval);
  timerInterval = null;
  releaseWakeLock();
}

function tickTimer() {
  if (timerRunning() && Date.now() >= timerState.endAt) {
    timerState.endAt = null;
    timerState.remainingMs = 0;
    timerState.finished = true;
    stopTimerTicking();
    playWhistle();
    if (!$("s-timer").classList.contains("on")) showToast("Fim de jogo!");
  }
  renderTimer();
}

function setTimerMinutes(minutes) {
  resetTimer(Math.min(TIMER_MAX, Math.max(TIMER_MIN, minutes)));
}

function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
}

function timerStatusLabel() {
  if (timerState.finished) return "acabou";
  if (timerRunning()) return "rolando";
  if (timerHasStarted()) return "pausado";
  return "pronto";
}

function renderTimer() {
  const remaining = timerRemainingMs();
  const clock = formatClock(remaining);
  const lastMinute = timerHasStarted() && remaining <= 60000;
  const status = timerStatusLabel();
  const started = timerHasStarted();

  const ring = $("tr-ring");
  if (ring) {
    const circumference = 2 * Math.PI * 126;
    const total = Math.max(timerState.minutes * 60000, remaining, 1);
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference * (1 - remaining / total));
    ring.classList.toggle("last", lastMinute);
  }
  $("tr-clock").textContent = clock;
  $("tr-clock").classList.toggle("last", lastMinute);
  $("tr-status").textContent = status;
  $("tr-minutes").textContent = timerState.minutes + " min";
  $("tr-setup").classList.toggle("hidden", started);
  $("tr-tools").classList.toggle("hidden", !started || timerState.finished);
  $("tr-done").classList.toggle("hidden", !timerState.finished);
  $("tr-toggle").textContent = timerState.finished ? "Novo jogo" : timerRunning() ? "Pausar" : started ? "Continuar" : "Começar";

  const presets = $("tr-presets");
  if (presets && !started) {
    presets.innerHTML = "";
    TIMER_PRESETS.forEach(function (m) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip-opt" + (m === timerState.minutes ? " on" : "");
      btn.textContent = m + " min";
      btn.setAttribute("aria-pressed", String(m === timerState.minutes));
      btn.addEventListener("click", function () { setTimerMinutes(m); });
      presets.appendChild(btn);
    });
  }

  $("lv-timer-clock").textContent = clock;
  $("lv-timer-clock").classList.toggle("last", lastMinute);
  $("lv-timer-status").textContent = status;
  $("lv-timer-toggle").textContent = timerState.finished ? "Novo jogo" : timerRunning() ? "Pausar" : started ? "Continuar" : "Começar";
}

function openTimer(fromScreen) {
  timerReturnScreen = fromScreen || "s-checkin";
  $("tr-sub").textContent = currentPeladaName || "";
  renderTimer();
  showScreen("s-timer");
}

// Audio must be unlocked by a user gesture (the Start tap) so the whistle can
// play later from the interval.
function unlockTimerAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!timerAudio) timerAudio = new AudioCtx();
    if (timerAudio.state === "suspended") timerAudio.resume();
  } catch (err) { /* sound is optional */ }
}

// Three referee-style blasts: a high tone with a fast trill.
function playWhistle() {
  if (navigator.vibrate) {
    try { navigator.vibrate([500, 150, 500, 150, 900]); } catch (err) { /* optional */ }
  }
  if (!timerAudio) return;
  try {
    const ctx = timerAudio;
    const start = ctx.currentTime + 0.05;
    [[0, 0.45], [0.6, 0.45], [1.2, 1.0]].forEach(function (blast) {
      const t0 = start + blast[0];
      const t1 = t0 + blast[1];
      const osc = ctx.createOscillator();
      const trill = ctx.createOscillator();
      const trillGain = ctx.createGain();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 2900;
      trill.frequency.value = 28;
      trillGain.gain.value = 180;
      trill.connect(trillGain);
      trillGain.connect(osc.frequency);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.03);
      gain.gain.setValueAtTime(0.18, t1 - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      trill.start(t0);
      osc.stop(t1);
      trill.stop(t1);
    });
  } catch (err) { /* sound is optional */ }
}

async function requestWakeLock() {
  try {
    if (navigator.wakeLock && !timerWakeLock) {
      timerWakeLock = await navigator.wakeLock.request("screen");
      timerWakeLock.addEventListener("release", function () { timerWakeLock = null; });
    }
  } catch (err) { timerWakeLock = null; }
}

function releaseWakeLock() {
  if (timerWakeLock) {
    timerWakeLock.release().catch(function () {});
    timerWakeLock = null;
  }
}

// ------------------------------------------------------------
// Live marking (any member, whole elenco)
// ------------------------------------------------------------

let liveCounts = {};
let liveReqSeq = {};
let liveReturnScreen = "s-checkin";

function normalizeName(text) {
  return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

async function openLive(fromScreen) {
  liveReturnScreen = fromScreen || "s-checkin";
  $("lv-search").value = "";
  $("lv-sub").textContent = todayLabel() + " · todo o elenco";
  refreshMatchEntryPoints();
  renderTimer();
  renderLive();
  showScreen("s-live");
  try {
    const data = await fetchJSON("/api/stats/today");
    liveCounts = {};
    (data.counts || []).forEach(function (c) {
      liveCounts[c.player_id] = { goals: c.goals, assists: c.assists };
    });
    renderLive();
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar os gols de hoje.");
  }
}

function liveCount(playerId) {
  return liveCounts[playerId] || { goals: 0, assists: 0 };
}

function renderLive() {
  const listEl = $("lv-list");
  const query = normalizeName($("lv-search").value.trim());
  const sorted = players.slice().sort(function (a, b) {
    return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
  }).filter(function (p) {
    return !query || normalizeName(p.name).indexOf(query) !== -1;
  });

  listEl.innerHTML = "";
  listEl.classList.toggle("hidden", sorted.length === 0);
  const emptyEl = $("lv-empty");
  emptyEl.classList.toggle("hidden", sorted.length > 0);
  emptyEl.textContent = players.length === 0 ? "Ninguém no elenco ainda." : "Ninguém com esse nome.";

  sorted.forEach(function (p) {
    const counts = liveCount(p.id);
    const row = document.createElement("div");
    row.className = "row live-row";
    row.innerHTML =
      '<span class="r-main"><span class="r-name">' + escapeHTML(p.name) + "</span></span>" +
      statStepperHTML(p, "goals", counts.goals, ballIconSVG(17), "gol") +
      statStepperHTML(p, "assists", counts.assists, bootIconSVG(18), "assistência");
    row.querySelectorAll("[data-field]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        changeLiveStat(p, btn.dataset.field, Number(btn.dataset.delta));
      });
    });
    listEl.appendChild(row);
  });
}

function statStepperHTML(player, field, value, icon, label) {
  const name = escapeHTML(player.name);
  return '<span class="stat-step' + (value > 0 ? " has" : "") + '">' +
    '<button type="button" class="sb" data-field="' + field + '" data-delta="-1" aria-label="Tirar ' + label + " de " + name + '"' +
    (value > 0 ? "" : " disabled") + ">−</button>" +
    '<span class="sv">' + icon + '<span class="sv-num">' + value + "</span></span>" +
    '<button type="button" class="sb" data-field="' + field + '" data-delta="1" aria-label="Mais ' + label + " de " + name + '">+</button>' +
    "</span>";
}

async function changeLiveStat(player, field, delta) {
  const before = liveCount(player.id);
  if (delta < 0 && before[field] <= 0) return;

  // Optimistic update; only the latest answer for a player is applied, so
  // fast taps never get overwritten by an older response.
  const next = { goals: before.goals, assists: before.assists };
  next[field] = Math.max(0, next[field] + delta);
  liveCounts[player.id] = next;
  const seq = (liveReqSeq[player.id] || 0) + 1;
  liveReqSeq[player.id] = seq;
  renderLive();
  if (navigator.vibrate) {
    try { navigator.vibrate(15); } catch (err) { /* optional */ }
  }

  try {
    const result = await fetchJSON("/api/stats/players/" + player.id, {
      method: "POST",
      body: JSON.stringify({ field: field, delta: delta }),
    });
    if (liveReqSeq[player.id] === seq) {
      liveCounts[player.id] = { goals: result.goals, assists: result.assists };
      renderLive();
    }
  } catch (err) {
    console.error(err);
    if (liveReqSeq[player.id] === seq) {
      liveCounts[player.id] = before;
      renderLive();
    }
    showToast("Não deu para salvar. Tente de novo.");
  }
}

// ------------------------------------------------------------
// Rankings (day and year)
// ------------------------------------------------------------

let rankingView = "day";
let rankingDay = null;
let rankingYear = null;
let rankingYearValue = null;

function openRanking() {
  $("rk-title").textContent = currentPeladaName || "Ranking";
  refreshMatchEntryPoints();
  showScreen("s-ranking");
  setRankingView(rankingView);
}

function setRankingView(view) {
  rankingView = view === "year" ? "year" : "day";
  $("rk-view-day").classList.toggle("on", rankingView === "day");
  $("rk-view-year").classList.toggle("on", rankingView === "year");
  $("rk-view-day").setAttribute("aria-pressed", String(rankingView === "day"));
  $("rk-view-year").setAttribute("aria-pressed", String(rankingView === "year"));
  $("rk-day").classList.toggle("hidden", rankingView !== "day");
  $("rk-year").classList.toggle("hidden", rankingView !== "year");
  if (rankingView === "day") loadDayRanking();
  else loadYearRanking(rankingYearValue);
}

function parseISODate(value) {
  const parts = String(value).split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function shortDateLabel(date) {
  return WEEKDAYS[date.getDay()].short.toLowerCase() + " " +
    String(date.getDate()).padStart(2, "0") + "/" + String(date.getMonth() + 1).padStart(2, "0");
}

async function loadDayRanking() {
  renderRankingLoading();
  try {
    rankingDay = await fetchJSON("/api/stats/day");
    if (rankingView === "day") renderRanking();
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar o ranking.");
  }
}

async function loadYearRanking(year) {
  renderRankingLoading();
  try {
    rankingYear = await fetchJSON("/api/stats/year" + (year ? "?year=" + year : ""));
    rankingYearValue = rankingYear.year;
    if (rankingView === "year") renderRanking();
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar o ranking.");
  }
}

function renderRankingLoading() {
  $("rk-highlights").classList.add("hidden");
  $("rk-table").classList.add("hidden");
  $("rk-note").classList.add("hidden");
  $("rk-empty").classList.remove("hidden");
  $("rk-empty").textContent = "Carregando...";
}

function currentRankingRows() {
  const data = rankingView === "day" ? rankingDay : rankingYear;
  return (data && data.rows) || [];
}

// Best assist giver: most assists, then goals, then the ranking order.
function topAssister(rows) {
  let best = null;
  rows.forEach(function (r) {
    if (r.assists <= 0) return;
    if (!best || r.assists > best.assists || (r.assists === best.assists && r.goals > best.goals)) best = r;
  });
  return best;
}

function renderRanking() {
  const rows = currentRankingRows();

  if (rankingView === "day") {
    const date = rankingDay && rankingDay.date ? parseISODate(rankingDay.date) : null;
    $("rk-day-date").textContent = date ? dateLabel(date) : "Ranking do dia";
    $("rk-day-until").textContent = rankingDay && rankingDay.visible_until
      ? "visível até " + shortDateLabel(parseISODate(rankingDay.visible_until))
      : "";
  } else {
    const years = (rankingYear && rankingYear.years) || [];
    const year = rankingYear ? rankingYear.year : new Date().getFullYear();
    $("rk-year-label").textContent = String(year);
    $("rk-year-prev").disabled = !years.some(function (y) { return y < year; });
    $("rk-year-next").disabled = !years.some(function (y) { return y > year; });
  }

  const empty = rows.length === 0;
  $("rk-empty").classList.toggle("hidden", !empty);
  $("rk-empty").textContent = rankingView === "day"
    ? "Nenhum gol marcado ainda. Toque em Marcar gols durante o jogo."
    : "Nenhum gol marcado neste ano.";
  $("rk-table").classList.toggle("hidden", empty);
  $("rk-note").classList.toggle("hidden", empty);
  $("rk-highlights").classList.toggle("hidden", empty);
  $("rk-share").disabled = empty;
  if (empty) return;

  const scorer = rows[0].goals > 0 ? rows[0] : null;
  const assister = topAssister(rows);
  $("rk-highlights").innerHTML =
    highlightHTML("Artilheiro", scorer ? scorer.name : "—", scorer ? scorer.goals + (scorer.goals === 1 ? " gol" : " gols") : "") +
    highlightHTML("Garçom", assister ? assister.name : "—", assister ? assister.assists + (assister.assists === 1 ? " assist." : " assists.") : "");

  let html = '<div class="rank-row rank-hd"><span>#</span><span>Jogador</span>' +
    '<span class="rank-ico" title="Gols">' + ballIconSVG(19) + "</span>" +
    '<span class="rank-ico" title="Assistências">' + bootIconSVG(21) + "</span></div>";
  rankPositions(rows).forEach(function (pos, i) {
    const r = rows[i];
    html += '<div class="rank-row' + (pos <= 3 ? " top" + pos : "") + '">' +
      '<span class="rank-pos">' + pos + "</span>" +
      '<span class="rank-name">' + escapeHTML(r.name) + "</span>" +
      '<span class="rank-num g">' + r.goals + "</span>" +
      '<span class="rank-num a">' + r.assists + "</span></div>";
  });
  $("rk-table").innerHTML = html;
}

// Same goals and assists share the position (1, 2, 2, 4...).
function rankPositions(rows) {
  const positions = [];
  rows.forEach(function (r, i) {
    const prev = rows[i - 1];
    if (prev && prev.goals === r.goals && prev.assists === r.assists) positions.push(positions[i - 1]);
    else positions.push(i + 1);
  });
  return positions;
}

function highlightHTML(label, name, value) {
  return '<div class="rank-hl"><span class="rank-hl-lbl">' + label + "</span>" +
    '<span class="rank-hl-name">' + escapeHTML(name) + "</span>" +
    '<span class="rank-hl-val">' + value + "</span></div>";
}

function stepRankingYear(direction) {
  const years = (rankingYear && rankingYear.years) || [];
  const year = rankingYear ? rankingYear.year : new Date().getFullYear();
  const candidates = years.filter(function (y) { return direction < 0 ? y < year : y > year; });
  if (!candidates.length) return;
  loadYearRanking(direction < 0 ? Math.max.apply(null, candidates) : Math.min.apply(null, candidates));
}

// ------------------------------------------------------------
// Share image (1080x1350, like the teams image)
// ------------------------------------------------------------

const RANK_IMAGE_W = 1080;
const RANK_IMAGE_MIN_H = 1080;
const RANK_IMAGE_ROWS = 12;

function rankingTitle() {
  if (rankingView === "day") {
    const date = rankingDay && rankingDay.date ? parseISODate(rankingDay.date) : new Date();
    return { eyebrow: "Ranking do dia", title: currentPeladaName + " · " + shortDateLabel(date) };
  }
  return { eyebrow: "Ranking de " + (rankingYear ? rankingYear.year : ""), title: currentPeladaName };
}

function drawStatIcon(ctx, kind, x, y, size, color) {
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  if (kind === "boot") {
    ctx.fillStyle = color;
    ctx.fill(new Path2D(BOOT_PATH), "evenodd");
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.7;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(12, 12, 9.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.stroke(new Path2D(BALL_PATHS[0]));
    ctx.stroke(new Path2D(BALL_PATHS[1]));
  }
  ctx.restore();
}

async function drawRankingImage(rows) {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (err) { /* fall back to system font */ }
  }
  // Height follows the table (square at least), so short rankings have no
  // empty half.
  const tableY = 380;
  const rowH = 64;
  const shown = rows.slice(0, RANK_IMAGE_ROWS);
  const tableH = 70 + shown.length * rowH + (rows.length > shown.length ? 56 : 12);
  const imageH = Math.max(RANK_IMAGE_MIN_H, tableY + tableH + 140);

  const canvas = document.createElement("canvas");
  canvas.width = RANK_IMAGE_W;
  canvas.height = imageH;
  const ctx = canvas.getContext("2d");
  const ink = "#ffffff";
  const soft = "#9fe0bd";
  const padX = 72;

  ctx.fillStyle = "#0d5a39";
  ctx.fillRect(0, 0, RANK_IMAGE_W, imageH);

  const head = rankingTitle();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = soft;
  ctx.font = "700 28px Inter, system-ui, sans-serif";
  ctx.fillText(head.eyebrow.toUpperCase(), padX, 110);
  ctx.fillStyle = ink;
  ctx.font = "800 64px Inter, system-ui, sans-serif";
  ctx.fillText(fitText(ctx, head.title, RANK_IMAGE_W - padX * 2), padX, 184);

  // Highlights
  const scorer = rows[0] && rows[0].goals > 0 ? rows[0] : null;
  const assister = topAssister(rows);
  const cardW = (RANK_IMAGE_W - padX * 2 - 24) / 2;
  [["ARTILHEIRO", scorer, scorer ? scorer.goals : 0], ["GARÇOM", assister, assister ? assister.assists : 0]].forEach(function (hl, i) {
    const x = padX + i * (cardW + 24);
    roundRectPath(ctx, x, 226, cardW, 118, 28);
    ctx.fillStyle = "rgba(255,255,255,.1)";
    ctx.fill();
    ctx.fillStyle = soft;
    ctx.font = "700 24px Inter, system-ui, sans-serif";
    ctx.fillText(hl[0], x + 28, 272);
    ctx.fillStyle = ink;
    ctx.font = "800 40px Inter, system-ui, sans-serif";
    const text = hl[1] ? hl[1].name + " · " + hl[2] : "—";
    ctx.fillText(fitText(ctx, text, cardW - 56), x + 28, 322);
  });

  // Table
  roundRectPath(ctx, padX, tableY, RANK_IMAGE_W - padX * 2, tableH, 32);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fill();

  const colPos = padX + 32;
  const colName = padX + 100;
  const colG = RANK_IMAGE_W - padX - 200;
  const colA = RANK_IMAGE_W - padX - 80;
  ctx.fillStyle = soft;
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("#", colPos, tableY + 38);
  ctx.fillText("JOGADOR", colName, tableY + 38);
  drawStatIcon(ctx, "ball", colG, tableY + 38, 36, ink);
  drawStatIcon(ctx, "boot", colA, tableY + 38, 40, ink);

  const positions = rankPositions(rows);
  shown.forEach(function (r, i) {
    const y = tableY + 70 + i * rowH;
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(padX + 24, y, RANK_IMAGE_W - padX * 2 - 48, 2);
    const mid = y + rowH / 2 + 1;
    ctx.textAlign = "left";
    ctx.fillStyle = soft;
    ctx.font = "800 30px Inter, system-ui, sans-serif";
    ctx.fillText(String(positions[i]), colPos, mid);
    ctx.fillStyle = ink;
    ctx.font = "600 32px Inter, system-ui, sans-serif";
    ctx.fillText(fitText(ctx, r.name, colG - colName - 60), colName, mid);
    ctx.textAlign = "center";
    ctx.font = "800 34px Inter, system-ui, sans-serif";
    ctx.fillText(String(r.goals), colG, mid);
    ctx.fillStyle = "#cfe9db";
    ctx.fillText(String(r.assists), colA, mid);
  });
  if (rows.length > shown.length) {
    ctx.textAlign = "left";
    ctx.fillStyle = soft;
    ctx.font = "600 24px Inter, system-ui, sans-serif";
    const more = rows.length - shown.length;
    ctx.fillText("+" + more + (more === 1 ? " jogador" : " jogadores") + " no app", colName, tableY + 70 + shown.length * rowH + 30);
  }

  ctx.textBaseline = "middle";
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillStyle = soft;
  ctx.textAlign = "left";
  ctx.fillText("Desempate: assistências", padX, imageH - 56);
  ctx.textAlign = "right";
  ctx.fillText("timejusto.xyz", RANK_IMAGE_W - padX, imageH - 56);

  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (blob) resolve(blob);
      else reject(new Error("Canvas export failed"));
    }, "image/png");
  });
}

function copyShareText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function () { showToast("Escalação copiada"); })
      .catch(function () { showToast("Não foi possível compartilhar."); });
  } else {
    showToast("Não foi possível compartilhar.");
  }
}

function buildRankingText(rows) {
  const head = rankingTitle();
  const lines = [head.eyebrow + " — " + head.title, ""];
  const positions = rankPositions(rows);
  rows.forEach(function (r, i) {
    lines.push(positions[i] + ". " + r.name + " — " + r.goals + " gol" + (r.goals === 1 ? "" : "s") +
      ", " + r.assists + " assist.");
  });
  lines.push("", "timejusto.xyz");
  return lines.join("\n");
}

async function shareRanking() {
  const rows = currentRankingRows();
  if (!rows.length) return;
  const fileName = rankingView === "day" ? "ranking-do-dia.png" : "ranking-do-ano.png";

  let blob = null;
  try {
    blob = await drawRankingImage(rows);
  } catch (err) {
    console.error(err);
  }

  if (blob) {
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
        console.error(err);
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("Imagem salva");
    return;
  }

  const text = buildRankingText(rows);
  if (navigator.share) {
    try {
      await navigator.share({ text: text });
    } catch (err) {
      if (err && err.name !== "AbortError") copyShareText(text);
    }
  } else {
    copyShareText(text);
  }
}

// ------------------------------------------------------------
// Event listeners
// ------------------------------------------------------------

function currentScreenId() {
  const screen = document.querySelector(".screen.on");
  return screen ? screen.id : "s-checkin";
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector("#tm-live-btn .stat-ico").innerHTML = ballIconSVG(18);

  document.querySelectorAll(".timer-open").forEach(function (btn) {
    btn.addEventListener("click", function () { openTimer(currentScreenId()); });
  });
  $("tr-back").addEventListener("click", function () {
    showScreen(timerReturnScreen);
    if (timerReturnScreen === "s-live") renderLive();
  });
  $("tr-toggle").addEventListener("click", toggleTimer);
  $("tr-add").addEventListener("click", addTimerMinute);
  $("tr-reset").addEventListener("click", function () { resetTimer(timerState.minutes); });
  $("tr-minus").addEventListener("click", function () { setTimerMinutes(timerState.minutes - 1); });
  $("tr-plus").addEventListener("click", function () { setTimerMinutes(timerState.minutes + 1); });
  $("tr-live").addEventListener("click", function () { openLive(timerReturnScreen === "s-live" ? liveReturnScreen : timerReturnScreen); });

  $("tm-live-btn").addEventListener("click", function () { openLive("s-teams"); });
  $("rk-live-btn").addEventListener("click", function () { openLive("s-ranking"); });
  $("lv-back").addEventListener("click", function () {
    if (liveReturnScreen === "s-ranking") openRanking();
    else showScreen(liveReturnScreen);
  });
  $("lv-search").addEventListener("input", renderLive);
  $("lv-timer-open").addEventListener("click", function () { openTimer("s-live"); });
  $("lv-timer-toggle").addEventListener("click", toggleTimer);

  $("rk-back").addEventListener("click", goHome);
  $("rk-menu-btn").addEventListener("click", function () { renderMenuSheet(); openSheet("menu"); });
  $("rk-view-day").addEventListener("click", function () { setRankingView("day"); });
  $("rk-view-year").addEventListener("click", function () { setRankingView("year"); });
  $("rk-year-prev").addEventListener("click", function () { stepRankingYear(-1); });
  $("rk-year-next").addEventListener("click", function () { stepRankingYear(1); });
  $("rk-share").addEventListener("click", shareRanking);

  $("mn-stats").addEventListener("click", function () { saveMatchSettings({ stats_enabled: !currentStatsEnabled }); });
  $("mn-timer").addEventListener("click", function () { saveMatchSettings({ timer_enabled: !currentTimerEnabled }); });
  $("mn-tmin-minus").addEventListener("click", function () {
    if (currentTimerMinutes > TIMER_MIN) saveMatchSettings({ timer_minutes: currentTimerMinutes - 1 });
  });
  $("mn-tmin-plus").addEventListener("click", function () {
    if (currentTimerMinutes < TIMER_MAX) saveMatchSettings({ timer_minutes: currentTimerMinutes + 1 });
  });

  // Back from the background: catch up the clock (intervals are throttled).
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      tickTimer();
      if (timerRunning()) requestWakeLock();
    }
  });

  renderTimer();
});
