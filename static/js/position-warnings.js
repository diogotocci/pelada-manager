// ============================================================
// Avisos de desequilíbrio por posição (só peladas de campo)
// ============================================================

// Outfield positions checked by the warnings (goalkeepers have their own rules).
const WARNING_POSITIONS = ["defender", "fullback", "midfielder", "forward"];

const POSITION_NOUNS = {
  defender: { one: "zagueiro", many: "zagueiros" },
  fullback: { one: "lateral", many: "laterais" },
  midfielder: { one: "meia", many: "meias" },
  forward: { one: "atacante", many: "atacantes" },
};

function positionNoun(position, count) {
  const noun = POSITION_NOUNS[position];
  return count + " " + (count === 1 ? noun.one : noun.many);
}

function presentOutfielders() {
  return players.filter(function (p) {
    return checkinState[p.id] && !p.is_goalkeeper && WARNING_POSITIONS.indexOf(currentPosition(p)) !== -1;
  });
}

function countPositions(list) {
  const counts = {};
  WARNING_POSITIONS.forEach(function (pos) { counts[pos] = 0; });
  list.forEach(function (p) { counts[currentPosition(p)] += 1; });
  return counts;
}

// A position nobody plays today is fine; a single player cannot be split
// between the two sides, and an odd count leaves one side with an extra one.
function positionWarnings(counts) {
  const warnings = [];
  WARNING_POSITIONS.forEach(function (pos) {
    const count = counts[pos];
    if (count === 1) {
      warnings.push({ position: pos, count: count, kind: "short" });
    } else if (count >= 3 && count % 2 === 1) {
      warnings.push({ position: pos, count: count, kind: "odd" });
    }
  });
  return warnings;
}

// The single day-position change that leaves the fewest warnings, if any helps.
// Emptying a position (e.g. moving the only defender away) is a last resort.
function suggestPositionMove(counts) {
  const current = positionWarnings(counts).length;
  let best = null;
  let bestScore = current * 10;
  WARNING_POSITIONS.forEach(function (from) {
    if (counts[from] === 0) return;
    WARNING_POSITIONS.forEach(function (to) {
      if (to === from) return;
      const next = Object.assign({}, counts);
      next[from] -= 1;
      next[to] += 1;
      const left = positionWarnings(next).length;
      if (left >= current) return;
      const score = left * 10 + (next[from] === 0 ? 5 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = { from: from, to: to, solves: left === 0 };
      }
    });
  });
  return best;
}

function currentPositionCheck() {
  if (!isFieldPelada()) return { counts: null, warnings: [], suggestion: null };
  const counts = countPositions(presentOutfielders());
  const warnings = positionWarnings(counts);
  return {
    counts: counts,
    warnings: warnings,
    suggestion: warnings.length ? suggestPositionMove(counts) : null,
  };
}

function warningSummary(warnings) {
  return warnings.map(function (w) { return positionNoun(w.position, w.count); }).join(", ");
}

function warningBoxHTML(check) {
  if (!check.warnings.length) {
    return '<div class="pwb-title ok">Posições equilibradas</div>';
  }
  let html =
    '<div class="pwb-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/></svg>' +
    "Desequilíbrio por posição</div>";
  check.warnings.forEach(function (w) {
    html +=
      '<div class="pwb-item"><b>' + escapeHTML(positionNoun(w.position, w.count)) + "</b><span>" +
      (w.kind === "short" ? "Precisa de pelo menos 2, um para cada lado." : "Número ímpar: um time fica com um a mais.") +
      "</span></div>";
  });
  if (check.suggestion) {
    html +=
      '<div class="pwb-tip">Sugestão: trocar a posição do dia de um ' +
      escapeHTML(POSITION_NOUNS[check.suggestion.from].one) + " para " +
      escapeHTML(POSITION_NOUNS[check.suggestion.to].one) +
      (check.suggestion.solves ? " resolve " + (check.warnings.length > 1 ? "os avisos." : "o aviso.") : " melhora o equilíbrio.") +
      "</div>";
  } else {
    html += '<div class="pwb-tip">Ajuste a posição do dia de alguém para equilibrar.</div>';
  }
  return html;
}

// ------------------------------------------------------------
// Check-in banner
// ------------------------------------------------------------

function renderPositionWarningBanner() {
  const banner = $("ci-pos-warning");
  if (!banner) return;
  const check = currentPositionCheck();
  const show = check.warnings.length > 0 && getPresentIds().length >= 2;
  banner.classList.toggle("hidden", !show);
  if (show) {
    $("ci-pos-warning-text").textContent = warningSummary(check.warnings) + ". Toque para ajustar.";
  }
}

// ------------------------------------------------------------
// Draw sheet
// ------------------------------------------------------------

function renderDrawPositionWarning() {
  const box = $("dr-pos-warning");
  if (!box) return;
  const check = currentPositionCheck();
  const show = check.warnings.length > 0;
  box.classList.toggle("hidden", !show);
  box.innerHTML = show ? warningBoxHTML(check) : "";
  $("dr-adjust").classList.toggle("hidden", !show);
  $("dr-confirm").textContent = show ? "Sortear assim mesmo" : "Sortear";
}

// ------------------------------------------------------------
// Adjust sheet
// ------------------------------------------------------------

function openPositionFixSheet() {
  renderPositionFixSheet();
  openSheet("posfix");
}

function renderPositionFixSheet() {
  const check = currentPositionCheck();
  if (!check.counts) return;

  const box = $("fx-warning");
  box.innerHTML = warningBoxHTML(check);
  box.classList.toggle("ok", check.warnings.length === 0);

  const flagged = check.warnings.map(function (w) { return w.position; });
  const countsEl = $("fx-counts");
  countsEl.innerHTML = "";
  WARNING_POSITIONS.forEach(function (pos) {
    const chip = document.createElement("span");
    chip.className = "pc-count" + (flagged.indexOf(pos) !== -1 ? " warn" : "");
    chip.textContent = getPosition(pos).short + " " + check.counts[pos];
    countsEl.appendChild(chip);
  });

  // Players worth moving: the suggested source position first, then the
  // flagged positions.
  const relevant = [];
  if (check.suggestion) relevant.push(check.suggestion.from);
  flagged.forEach(function (pos) { if (relevant.indexOf(pos) === -1) relevant.push(pos); });

  const listEl = $("fx-list");
  listEl.innerHTML = "";
  const candidates = presentOutfielders().filter(function (p) {
    return relevant.indexOf(currentPosition(p)) !== -1;
  }).sort(function (a, b) {
    const byGroup = relevant.indexOf(currentPosition(a)) - relevant.indexOf(currentPosition(b));
    if (byGroup !== 0) return byGroup;
    return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
  });
  listEl.classList.toggle("hidden", candidates.length === 0);

  candidates.forEach(function (p) {
    const row = document.createElement("div");
    row.className = "row";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = buildPlayerInitials(p.name);

    const position = getPosition(currentPosition(p));
    const main = document.createElement("div");
    main.className = "r-main";
    main.innerHTML =
      '<span class="r-name">' + escapeHTML(p.name) + "</span>" +
      '<span class="r-meta">' + escapeHTML(p.day_position ? "Hoje: " + position.label : position.label) + "</span>";

    row.appendChild(avatar);
    row.appendChild(main);

    if (check.suggestion && currentPosition(p) === check.suggestion.from) {
      const target = check.suggestion.to;
      const quick = document.createElement("button");
      quick.type = "button";
      quick.className = "btn btn-primary btn-sm";
      quick.textContent = "Jogar de " + POSITION_NOUNS[target].one;
      quick.addEventListener("click", function () {
        movePlayerForBalance(p, target);
      });
      row.appendChild(quick);
    }

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "pos-chip" + (p.day_position ? " day" : "");
    chip.textContent = position.short;
    chip.setAttribute("aria-label", "Escolher outra posição de hoje para " + p.name);
    chip.addEventListener("click", function () { openDayPositionSheet(p, true); });
    row.appendChild(chip);

    listEl.appendChild(row);
  });

  $("fx-draw").textContent = check.warnings.length ? "Sortear assim mesmo" : "Sortear";
}

async function movePlayerForBalance(player, position) {
  try {
    const updated = await requestDayPosition(player, position === player.position ? null : position);
    renderCheckin();
    renderSquad();
    renderPositionFixSheet();
    showToast(updated.name + " joga de " + getPosition(currentPosition(updated)).label.toLowerCase() + " hoje");
  } catch (err) {
    console.error(err);
    showToast("Erro ao trocar a posição.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  $("ci-pos-warning").addEventListener("click", openPositionFixSheet);
  $("dr-adjust").addEventListener("click", openPositionFixSheet);
  $("fx-close").addEventListener("click", function () { closeSheets(); });
  $("fx-draw").addEventListener("click", function () {
    closeSheets(true);
    openDrawSheet();
  });
});
