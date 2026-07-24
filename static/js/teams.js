// ============================================================
// Configurar sorteio (sheet)
// ============================================================

function openDrawSheet() {
  renderDrawSheet();
  openSheet("draw");
}

function renderDrawSheet() {
  $("dr-size").textContent = lastTeamSize;

  const present = getPresentIds().length;
  const inTeams = Math.min(present, lastTeamSize * 2);
  const bench = present - inTeams;

  $("dr-summary").textContent =
    present + " presentes → 2 times de até " + lastTeamSize +
    (bench > 0 ? " · " + bench + " de fora aguardando" : "");
}

function stepTeamSize(delta) {
  lastTeamSize = Math.max(1, Math.min(11, lastTeamSize + delta));
  renderDrawSheet();
}

// ============================================================
// Sorteio
// ============================================================

async function confirmDraw() {
  const presentIds = getPresentIds();

  if (presentIds.length < 2) {
    showToast("Selecione pelo menos 2 jogadores.");
    return;
  }

  try {
    players = await fetchJSON("/api/players/set-active-batch", {
      method: "PATCH",
      body: JSON.stringify({ active_ids: presentIds }),
    });

    await performDraw(lastTeamSize);
    closeSheets();
  } catch (err) {
    console.error(err);
    showToast("Erro ao confirmar presenças.");
  }
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
    showScreen("s-teams");
    return true;
  } catch (err) {
    console.error(err);
    showToast("Erro ao sortear times.");
    return false;
  }
}

async function redraw() {
  if (!players.some(function (p) { return p.active; })) {
    showToast("Nenhum jogador ativo para sortear.");
    return;
  }
  const ok = await performDraw(lastTeamSize);
  if (ok) showToast("Times sorteados de novo");
}

// ============================================================
// Tela de times
// ============================================================

function getTeamColorKey(teamNumber) {
  if (teamNumber === 1) return currentTeam1Color;
  if (teamNumber === 2) return currentTeam2Color;
  return null;
}

function teamOutfielders(team) {
  return (team.players || []).filter(function (p) { return !p.is_goalkeeper; });
}

function teamGoalkeeper(team) {
  return (team.players || []).find(function (p) { return p.is_goalkeeper; }) || null;
}

function teamTotal(team) {
  return teamOutfielders(team).reduce(function (sum, p) { return sum + Number(p.rating || 0); }, 0);
}

function renderTeams(teams) {
  const cardsEl = $("tm-cards");
  const balanceEl = $("tm-balance");
  if (!cardsEl) return;

  $("tm-sub").textContent = gameDateLabel();
  $("tm-audit-btn").classList.toggle("hidden", !isAdminMode);

  cardsEl.innerHTML = "";
  balanceEl.innerHTML = "";

  if (!teams || teams.length === 0) return;

  // Placar de equilíbrio (dois primeiros times)
  const color1 = getBibColor(currentTeam1Color);
  const color2 = getBibColor(currentTeam2Color);

  if (teams.length >= 2) {
    balanceEl.innerHTML =
      '<div class="side"><div class="val">' + formatDecimal(teamTotal(teams[0])) + ' ★</div><div class="who">' + escapeHTML(color1.label) + "</div></div>" +
      '<span class="vs">VS</span>' +
      '<div class="side"><div class="val">' + formatDecimal(teamTotal(teams[1])) + ' ★</div><div class="who">' + escapeHTML(color2.label) + "</div></div>";
  }

  teams.forEach(function (team, index) {
    const teamNumber = index + 1;
    const colorKey = getTeamColorKey(teamNumber);
    const isBench = colorKey == null;

    const card = document.createElement("div");
    card.className = "card team-card";

    const head = document.createElement("div");
    head.className = "team-head";

    if (!isBench) {
      head.appendChild(buildBibEl(colorKey, false));
    }

    const nameEl = document.createElement("span");
    nameEl.className = "t-name";
    if (isBench) {
      nameEl.textContent = "De fora · próximos";
      nameEl.style.color = "var(--muted)";
    } else {
      nameEl.textContent = team.name + " · " + getBibColor(colorKey).label;
    }

    const keeper = teamGoalkeeper(team);
    const outfielders = teamOutfielders(team);

    const totalEl = document.createElement("span");
    totalEl.className = "t-total";
    const count = isBench ? (team.players || []).length : outfielders.length;
    totalEl.textContent = isBench
      ? String(count)
      : count + " na linha" + (isAdminMode ? " · " + formatDecimal(teamTotal(team)) + " ★" : "");

    head.appendChild(nameEl);
    head.appendChild(totalEl);

    const body = document.createElement("div");
    body.className = "team-players";

    // Keeper first, on its own row, marked with the glove.
    if (keeper && !isBench) {
      const rowEl = document.createElement("div");
      rowEl.className = "tp";

      const avatar = document.createElement("div");
      avatar.className = "avatar sm hl";
      avatar.textContent = buildPlayerInitials(keeper.name);

      const nm = document.createElement("span");
      nm.className = "nm";
      nm.innerHTML = escapeHTML(keeper.name) + gkGloveHTML(keeper);

      rowEl.appendChild(avatar);
      rowEl.appendChild(nm);

      if (isAdminMode) {
        const stars = document.createElement("span");
        stars.innerHTML = buildStarsHTML(keeper.rating);
        rowEl.appendChild(stars);
      }

      body.appendChild(rowEl);
    }

    const sortedPlayers = outfielders.slice().sort(function (a, b) {
      return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
    });

    sortedPlayers.forEach(function (p) {
      const rowEl = document.createElement("div");
      rowEl.className = "tp";

      const avatar = document.createElement("div");
      avatar.className = "avatar sm";
      avatar.textContent = buildPlayerInitials(p.name);

      const nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = p.name;

      rowEl.appendChild(avatar);
      rowEl.appendChild(nm);

      if (isAdminMode && !isBench) {
        const stars = document.createElement("span");
        stars.innerHTML = buildStarsHTML(p.rating);
        rowEl.appendChild(stars);
      }

      body.appendChild(rowEl);
    });

    card.appendChild(head);
    card.appendChild(body);
    cardsEl.appendChild(card);
  });
}

// ============================================================
// Auditoria
// ============================================================

function getTeamAuditStats(team) {
  const outfielders = teamOutfielders(team);
  const playerCount = outfielders.length || 1;
  const totalRating = teamTotal(team);
  const sum = function (attr) {
    return outfielders.reduce(function (acc, p) { return acc + getAttributeValue(p, attr); }, 0);
  };
  return {
    totalRating: totalRating,
    averageRating: totalRating / playerCount,
    marking: sum("marking"),
    stamina: sum("stamina"),
    scoring: sum("scoring"),
  };
}

function renderAudit() {
  const bodyEl = $("audit-body");
  bodyEl.innerHTML = "";

  if (!lastDrawnTeams.length) {
    bodyEl.innerHTML = '<p class="empty">Nenhum sorteio disponível para auditar.</p>';
    return;
  }

  let html = '<div class="audit-grid">';
  lastDrawnTeams.slice(0, 2).forEach(function (team, index) {
    const colorKey = getTeamColorKey(index + 1);
    const label = colorKey ? getBibColor(colorKey).label : "De fora";
    const stats = getTeamAuditStats(team);
    html +=
      '<div class="audit-cell"><b>' + escapeHTML(team.name) + " · " + escapeHTML(label) + "</b>" +
      "<span>Rating " + formatDecimal(stats.totalRating) + " · média " + formatDecimal(stats.averageRating) + "</span>" +
      "<span>Marca " + stats.marking + " · Gol " + stats.scoring + " · Corre " + stats.stamina + "</span></div>";
  });
  html += "</div>";

  lastDrawnTeams.forEach(function (team, index) {
    const colorKey = getTeamColorKey(index + 1);
    const label = colorKey ? getBibColor(colorKey).label : "De fora";

    const sortedPlayers = teamOutfielders(team).slice().sort(function (a, b) {
      return b.rating - a.rating;
    });

    html += '<p class="eyebrow">' + escapeHTML(team.name) + " · " + escapeHTML(label) + "</p>";

    const keeper = teamGoalkeeper(team);
    if (keeper) {
      html +=
        '<p class="hint" style="margin:-2px 2px 6px">🧤 Goleiro: ' + escapeHTML(keeper.name) +
        " · defesa " + formatDecimal(keeper.rating) +
        " · pé " + Number(keeper.gk_footwork != null ? keeper.gk_footwork : 1) + "</p>";
    }

    html += '<table class="audit-table"><thead><tr><th>Jogador</th><th>★</th><th>Marca</th><th>Gol</th><th>Corre</th></tr></thead><tbody>';
    sortedPlayers.forEach(function (p) {
      html +=
        "<tr><td>" + escapeHTML(p.name) + "</td><td>" + formatDecimal(p.rating) + "</td><td>" +
        getAttributeValue(p, "marking") + "</td><td>" + getAttributeValue(p, "scoring") + "</td><td>" +
        getAttributeValue(p, "stamina") + "</td></tr>";
    });
    html += "</tbody></table>";
  });

  bodyEl.innerHTML = html;
}

// ============================================================
// Compartilhar times
// ============================================================

function buildShareText() {
  const lines = [];
  lines.push("⚽ Times — " + currentPeladaName);
  lines.push(gameDateLabel());
  lines.push("");

  lastDrawnTeams.forEach(function (team, index) {
    const colorKey = getTeamColorKey(index + 1);
    const keeper = teamGoalkeeper(team);
    const sorted = teamOutfielders(team).slice().sort(function (a, b) {
      return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
    });

    if (colorKey == null) {
      lines.push("🪑 De fora");
      (team.players || []).slice().sort(function (a, b) {
        return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
      }).forEach(function (p) { lines.push("• " + p.name); });
      lines.push("");
      return;
    }

    const color = getBibColor(colorKey);
    lines.push(color.emoji + " " + color.label + " (" + sorted.length + ")");
    if (keeper) {
      lines.push("🧤 " + keeper.name);
    }
    sorted.forEach(function (p) { lines.push("• " + p.name); });
    lines.push("");
  });

  lines.push("timejusto.xyz");
  return lines.join("\n");
}

async function shareTeams() {
  if (!lastDrawnTeams.length) {
    showToast("Sorteie os times primeiro.");
    return;
  }

  const text = buildShareText();

  if (navigator.share) {
    try {
      await navigator.share({ text: text });
    } catch (err) {
      if (err && err.name === "AbortError") return;
      copyShareText(text);
    }
  } else {
    copyShareText(text);
  }
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

// ============================================================
// Comparar por nível
// ============================================================

function renderCompare() {
  const bodyEl = $("compare-body");
  bodyEl.innerHTML = "";

  if (players.length === 0) {
    bodyEl.innerHTML = '<p class="empty">Nenhum jogador cadastrado.</p>';
    return;
  }

  const groups = {};
  players.forEach(function (p) {
    const key = p.rating.toFixed(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p.name);
  });

  const ratings = Object.keys(groups)
    .map(function (r) { return parseFloat(r); })
    .sort(function (a, b) { return b - a; });

  let html = '<table class="audit-table"><thead><tr><th style="width:90px">Nível</th><th style="text-align:left">Jogadores</th></tr></thead><tbody>';
  ratings.forEach(function (rating) {
    const names = groups[rating.toFixed(1)].slice().sort(function (a, b) {
      return a.trim().localeCompare(b.trim(), "pt-BR", { sensitivity: "base" });
    });
    html +=
      '<tr><td style="text-align:left;white-space:nowrap">' + buildStarsHTML(rating) + "</td>" +
      '<td style="text-align:left">' + names.map(escapeHTML).join(", ") + "</td></tr>";
  });
  html += "</tbody></table>";

  bodyEl.innerHTML = html;
}

// ============================================================
// Event listeners
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  $("ci-cta").addEventListener("click", openDrawSheet);

  $("dr-minus").addEventListener("click", function () { stepTeamSize(-1); });
  $("dr-plus").addEventListener("click", function () { stepTeamSize(1); });
  $("dr-cancel").addEventListener("click", function () { closeSheets(); });
  $("dr-confirm").addEventListener("click", confirmDraw);

  $("tm-back").addEventListener("click", function () { showScreen("s-checkin"); renderCheckin(); });
  $("tm-redraw").addEventListener("click", redraw);
  $("tm-share").addEventListener("click", shareTeams);
  $("tm-audit-btn").addEventListener("click", function () { renderAudit(); openSheet("audit"); });
  $("audit-close").addEventListener("click", function () { closeSheets(); });

  $("sq-compare-btn").addEventListener("click", function () { renderCompare(); openSheet("compare"); });
  $("compare-close").addEventListener("click", function () { closeSheets(); });
});
