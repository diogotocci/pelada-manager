// ============================================================
// Campinho — times desenhados no campo (society) ou na quadra (salão)
// ============================================================

// "list" or "pitch"; persisted so the teams screen opens the way it was left.
let teamsView = localStorage.getItem("tj-teams-view") === "pitch" ? "pitch" : "list";

// Futsal has no positions, so outfielders get random spots on the court. The
// shuffle is cached per drawn team so toggling the view keeps the same layout.
let pitchShuffleCache = new WeakMap();

function setTeamsView(view) {
  teamsView = view === "pitch" ? "pitch" : "list";
  localStorage.setItem("tj-teams-view", teamsView);
  if (lastDrawnTeams.length > 0) renderTeams(lastDrawnTeams);
}

function updateTeamsViewToggle() {
  const listBtn = $("tm-view-list");
  const pitchBtn = $("tm-view-pitch");
  if (!listBtn || !pitchBtn) return;
  listBtn.classList.toggle("on", teamsView === "list");
  pitchBtn.classList.toggle("on", teamsView === "pitch");
  listBtn.setAttribute("aria-pressed", String(teamsView === "list"));
  pitchBtn.setAttribute("aria-pressed", String(teamsView === "pitch"));
}

// ------------------------------------------------------------
// Formation: rows of players from the team's own goal outwards
// ------------------------------------------------------------

function shuffledOutfielders(team) {
  let cached = pitchShuffleCache.get(team);
  if (!cached) {
    cached = teamOutfielders(team).slice();
    for (let i = cached.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = cached[i];
      cached[i] = cached[j];
      cached[j] = tmp;
    }
    pitchShuffleCache.set(team, cached);
  }
  return cached;
}

// Futsal row sizes for n outfielders (4 is the classic 1-2-1 diamond).
function futsalRowSizes(count) {
  const patterns = { 1: [1], 2: [2], 3: [1, 2], 4: [1, 2, 1], 5: [2, 1, 2], 6: [2, 2, 2] };
  if (patterns[count]) return patterns[count];
  const sizes = [];
  let left = count;
  while (left > 0) {
    sizes.push(Math.min(3, left));
    left -= 3;
  }
  return sizes;
}

function byName(a, b) {
  return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
}

// Horizontal spots (0 = left touchline, 1 = right) for players spread evenly.
function evenSpots(count) {
  const spots = [];
  for (let i = 0; i < count; i++) spots.push((i + 1) / (count + 1));
  return spots;
}

// Defensive line: fullbacks on the wings, defenders in the middle.
function defenseSlots(fullbacks, defenders) {
  if (fullbacks.length === 0) {
    const spots = evenSpots(defenders.length);
    return defenders.map(function (p, i) { return { player: p, x: spots[i] }; });
  }
  const leftCount = Math.ceil(fullbacks.length / 2);
  const slots = [];
  fullbacks.slice(0, leftCount).forEach(function (p, i) { slots.push({ player: p, x: 0.15 + i * 0.16 }); });
  fullbacks.slice(leftCount).forEach(function (p, i) { slots.push({ player: p, x: 0.85 - i * 0.16 }); });
  const inner = defenders.length === 1
    ? [0.5]
    : defenders.map(function (_, i) { return 0.36 + (0.28 * i) / (defenders.length - 1); });
  defenders.forEach(function (p, i) { slots.push({ player: p, x: inner[i] }); });
  return slots.sort(function (a, b) { return a.x - b.x; });
}

function evenSlots(list) {
  const spots = evenSpots(list.length);
  return list.map(function (p, i) { return { player: p, x: spots[i] }; });
}

// Society: one band per sector at a fixed depth (0 = own goal line, 1 = halfway
// line), so a missing sector leaves its band empty instead of shifting the rest.
function fieldRows(outfielders) {
  const of = function (position) {
    return outfielders.filter(function (p) { return p.position === position; }).sort(byName);
  };
  const unknown = outfielders.filter(function (p) {
    return ["fullback", "defender", "midfielder", "forward"].indexOf(p.position) === -1;
  }).sort(byName);

  return [
    { depth: 0.34, slots: defenseSlots(of("fullback"), of("defender")) },
    { depth: 0.67, slots: evenSlots(of("midfielder").concat(unknown)) },
    { depth: 0.94, slots: evenSlots(of("forward")) },
  ];
}

// Formation of one team: rows of { player, x } slots with their depth from the
// team's own goal line (0) to the halfway line (1).
function buildFormation(team) {
  const keeper = teamGoalkeeper(team);
  let rows;

  if (isFieldPelada()) {
    rows = fieldRows(teamOutfielders(team));
  } else {
    const shuffled = shuffledOutfielders(team);
    const sizes = futsalRowSizes(shuffled.length);
    rows = [];
    let start = 0;
    sizes.forEach(function (size, r) {
      rows.push({
        depth: sizes.length === 1 ? 0.67 : 0.34 + (0.6 * r) / (sizes.length - 1),
        slots: evenSlots(shuffled.slice(start, start + size)),
      });
      start += size;
    });
  }

  rows.unshift({ depth: 0, slots: keeper ? [{ player: keeper, x: 0.5 }] : [] });
  return rows.filter(function (row) { return row.slots.length > 0; });
}

// Position tag shown next to the name (society outfielders only).
function pitchPositionTag(player) {
  if (!isFieldPelada() || player.is_goalkeeper) return "";
  const position = getPosition(player.position);
  return position ? position.short : "";
}

// Readable text color over a bib color.
function inkOver(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1a1f1c" : "#ffffff";
}

function teamLabel(index) {
  return getBibColor(getTeamColorKey(index + 1)).label;
}

// ------------------------------------------------------------
// In-app pitch
// ------------------------------------------------------------

function buildPitchEl(teams) {
  const pitch = document.createElement("div");
  pitch.className = "pitch " + (isFieldPelada() ? "pitch-field" : "pitch-court");
  pitch.setAttribute("role", "img");
  pitch.setAttribute(
    "aria-label",
    teams.slice(0, 2).map(function (team, index) {
      return teamLabel(index) + ": " + (team.players || []).map(function (p) { return p.name; }).join(", ");
    }).join(". ")
  );

  const lines = document.createElement("div");
  lines.className = "pitch-lines";
  lines.setAttribute("aria-hidden", "true");
  lines.innerHTML =
    '<span class="pl-mid"></span><span class="pl-circle"></span>' +
    '<span class="pl-area top"></span><span class="pl-area bottom"></span>';
  pitch.appendChild(lines);

  teams.slice(0, 2).forEach(function (team, index) {
    const color = getBibColor(getTeamColorKey(index + 1));
    const half = document.createElement("div");
    half.className = "pitch-half " + (index === 0 ? "top" : "bottom");
    half.setAttribute("aria-hidden", "true");

    buildFormation(team).forEach(function (row) {
      // Top team defends the top goal; the bottom team is mirrored.
      const depth = index === 0 ? row.depth : 1 - row.depth;
      row.slots.forEach(function (slot) {
        const p = slot.player;
        const chip = document.createElement("div");
        chip.className = "pc";
        chip.style.left = (slot.x * 100) + "%";
        chip.style.top = "calc(4px + (100% - 64px) * " + depth + ")";
        const av = document.createElement("span");
        av.className = "pc-av";
        av.style.background = color.dark;
        av.style.color = inkOver(color.dark);
        av.textContent = buildPlayerInitials(p.name);
        const nm = document.createElement("span");
        nm.className = "pc-nm";
        const nmText = document.createElement("span");
        nmText.className = "pc-nm-text";
        nmText.textContent = p.name;
        nm.appendChild(nmText);
        const posTag = pitchPositionTag(p);
        if (posTag) {
          const tagEl = document.createElement("span");
          tagEl.className = "pc-pos";
          tagEl.textContent = posTag;
          nm.appendChild(tagEl);
        }
        chip.appendChild(av);
        chip.appendChild(nm);
        half.appendChild(chip);
      });
    });

    const tag = document.createElement("span");
    tag.className = "pitch-tag " + (index === 0 ? "top" : "bottom");
    tag.style.background = color.dark;
    tag.style.color = inkOver(color.dark);
    tag.textContent = color.label + " · " + (team.players || []).length;
    tag.setAttribute("aria-hidden", "true");

    pitch.appendChild(half);
    pitch.appendChild(tag);
  });

  return pitch;
}

// ------------------------------------------------------------
// Share image (canvas)
// ------------------------------------------------------------

const PITCH_IMAGE_W = 1080;
const PITCH_IMAGE_H = 1350;

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + "…").width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return cut + "…";
}

function imageTheme() {
  // Society uses the dark grass look; futsal the light wooden court.
  if (isFieldPelada()) {
    return {
      bg: "#101312", ink: "#eceeec", muted: "#88918b", accent: "#4fc98c", chipBg: "#1e2320",
      floorA: "#1f7a45", floorB: "#23864c", stripe: "horizontal", line: "rgba(255,255,255,0.7)",
      area: null, pillBg: "rgba(8,10,9,0.78)", pillInk: "#ffffff",
    };
  }
  return {
    bg: "#f7f8f6", ink: "#1a1f1c", muted: "#5d6661", accent: "#0f7b4d", chipBg: "#ffffff",
    floorA: "#c99a62", floorB: "#c08d55", stripe: "vertical", line: "#ffffff",
    area: "rgba(140,80,30,0.25)", pillBg: "#ffffff", pillInk: "#1a1f1c",
  };
}

function drawPitchFloor(ctx, theme, x, y, w, h) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 28);
  ctx.clip();
  ctx.fillStyle = theme.floorA;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = theme.floorB;
  const band = theme.stripe === "horizontal" ? 84 : 54;
  if (theme.stripe === "horizontal") {
    for (let sy = y + band; sy < y + h; sy += band * 2) ctx.fillRect(x, sy, w, band);
  } else {
    for (let sx = x + band; sx < x + w; sx += band * 2) ctx.fillRect(sx, y, band, h);
  }

  const inset = 22;
  const lx = x + inset;
  const ly = y + inset;
  const lw = w - inset * 2;
  const lh = h - inset * 2;
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 5;
  ctx.strokeRect(lx, ly, lw, lh);
  ctx.beginPath();
  ctx.moveTo(lx, cy);
  ctx.lineTo(lx + lw, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 95, 0, Math.PI * 2);
  ctx.stroke();

  if (isFieldPelada()) {
    // Rectangular penalty boxes.
    ctx.strokeRect(cx - 170, ly, 340, 110);
    ctx.strokeRect(cx - 170, ly + lh - 110, 340, 110);
  } else {
    // Futsal "D" areas, shaded.
    [[ly, 0], [ly + lh, Math.PI]].forEach(function (pair) {
      ctx.beginPath();
      ctx.ellipse(cx, pair[0], 210, 165, 0, pair[1], pair[1] + Math.PI);
      ctx.closePath();
      ctx.fillStyle = theme.area;
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

// Chip block: avatar circle, a gap, then the name pill.
const CHIP_RADIUS = 32;
const CHIP_GAP = 6;
const CHIP_PILL_H = 34;
const CHIP_BLOCK_H = CHIP_RADIUS * 2 + CHIP_GAP + CHIP_PILL_H;

function drawPlayerChip(ctx, theme, p, color, cx, cy) {
  const radius = CHIP_RADIUS;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = color.dark;
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = inkOver(color.dark);
  ctx.font = "800 23px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(buildPlayerInitials(p.name), cx, cy + 1);

  const tag = pitchPositionTag(p);
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  const name = fitText(ctx, p.name, tag ? 150 : 190);
  const nameW = ctx.measureText(name).width;
  ctx.font = "700 15px Inter, system-ui, sans-serif";
  const tagW = tag ? ctx.measureText(tag).width + 8 : 0;
  const pillW = nameW + tagW + 28;
  const pillH = CHIP_PILL_H;
  const pillY = cy + radius + CHIP_GAP;

  roundRectPath(ctx, cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = theme.pillBg;
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = theme.pillInk;
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  const textX = cx - pillW / 2 + 14;
  ctx.fillText(name, textX, pillY + pillH / 2 + 1);
  if (tag) {
    ctx.font = "700 15px Inter, system-ui, sans-serif";
    ctx.fillStyle = theme.pillBg === "#ffffff" ? "#5d6661" : "#b9c2bc";
    ctx.fillText(tag, textX + nameW + 8, pillY + pillH / 2 + 1);
  }
}

function drawHalf(ctx, theme, team, index, x, y, w, h) {
  const color = getBibColor(getTeamColorKey(index + 1));
  // Keep the whole chip block (circle + name) inside the half.
  const top = y + 8;
  const usable = h - 16 - CHIP_BLOCK_H;

  buildFormation(team).forEach(function (row) {
    const depth = index === 0 ? row.depth : 1 - row.depth;
    const cy = top + usable * depth + CHIP_RADIUS;
    row.slots.forEach(function (slot) {
      drawPlayerChip(ctx, theme, slot.player, color, x + w * slot.x, cy);
    });
  });

  const label = color.label.toUpperCase() + " · " + (team.players || []).length;
  ctx.font = "800 22px Inter, system-ui, sans-serif";
  const lw = ctx.measureText(label).width + 32;
  const ly = index === 0 ? y + 24 : y + h - 24 - 40;
  roundRectPath(ctx, x + 24, ly, lw, 40, 10);
  ctx.fillStyle = color.dark;
  ctx.fill();
  ctx.fillStyle = inkOver(color.dark);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 40, ly + 21);
}

async function drawPitchImage(teams) {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (err) { /* fall back to system font */ }
  }

  const theme = imageTheme();
  const canvas = document.createElement("canvas");
  canvas.width = PITCH_IMAGE_W;
  canvas.height = PITCH_IMAGE_H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, PITCH_IMAGE_W, PITCH_IMAGE_H);

  const padX = 60;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = theme.muted;
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  ctx.fillText((gameDateLabel() + " · " + (isFieldPelada() ? "Society" : "Salão")).toUpperCase(), padX, 90);
  ctx.fillStyle = theme.ink;
  ctx.font = "800 56px Inter, system-ui, sans-serif";
  ctx.fillText(fitText(ctx, currentPeladaName, 600), padX, 152);

  if (lastKickoffTeam !== null && teams.length >= 2) {
    const kickoffColor = getBibColor(getTeamColorKey(lastKickoffTeam + 1));
    const prefix = "Começa: ";
    ctx.font = "700 24px Inter, system-ui, sans-serif";
    const labelW = ctx.measureText(kickoffColor.label).width;
    ctx.font = "600 24px Inter, system-ui, sans-serif";
    const prefixW = ctx.measureText(prefix).width;
    const pillW = prefixW + labelW + 44;
    const pillX = PITCH_IMAGE_W - padX - pillW;
    roundRectPath(ctx, pillX, 104, pillW, 56, 28);
    ctx.fillStyle = theme.chipBg;
    ctx.fill();
    ctx.fillStyle = theme.ink;
    ctx.fillText(prefix, pillX + 22, 141);
    ctx.font = "700 24px Inter, system-ui, sans-serif";
    ctx.fillStyle = kickoffColor.key === "white" ? theme.ink : kickoffColor.dark;
    ctx.fillText(kickoffColor.label, pillX + 22 + prefixW, 141);
  }

  const fieldX = padX;
  const fieldY = 196;
  const fieldW = PITCH_IMAGE_W - padX * 2;
  const fieldH = PITCH_IMAGE_H - fieldY - 120;
  drawPitchFloor(ctx, theme, fieldX, fieldY, fieldW, fieldH);

  teams.slice(0, 2).forEach(function (team, index) {
    drawHalf(ctx, theme, team, index, fieldX, fieldY + (fieldH / 2) * index, fieldW, fieldH / 2);
  });

  const bench = teams.slice(2).reduce(function (all, team) { return all.concat(team.players || []); }, []);
  const footY = PITCH_IMAGE_H - 52;
  ctx.textBaseline = "middle";
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  const brand = "timejusto.xyz";
  const brandW = ctx.measureText(brand).width;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = "right";
  ctx.fillText(brand, PITCH_IMAGE_W - padX, footY);

  if (bench.length > 0) {
    ctx.textAlign = "left";
    ctx.fillStyle = theme.muted;
    ctx.font = "700 20px Inter, system-ui, sans-serif";
    const benchLabel = "DE FORA";
    ctx.fillText(benchLabel, padX, footY);
    const labelW = ctx.measureText(benchLabel).width + 14;
    ctx.fillStyle = theme.ink;
    ctx.font = "600 24px Inter, system-ui, sans-serif";
    const names = bench.map(function (p) { return p.name; }).sort(function (a, b) {
      return a.trim().localeCompare(b.trim(), "pt-BR", { sensitivity: "base" });
    }).join(", ");
    ctx.fillText(fitText(ctx, names, PITCH_IMAGE_W - padX * 2 - labelW - brandW - 30), padX + labelW, footY);
  }

  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (blob) resolve(blob);
      else reject(new Error("Canvas export failed"));
    }, "image/png");
  });
}

// Returns false when the image could not be generated, so the caller can fall
// back to sharing the text.
async function sharePitchImage() {
  let blob;
  try {
    blob = await drawPitchImage(lastDrawnTeams);
  } catch (err) {
    console.error(err);
    return false;
  }

  const file = new File([blob], "times.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (err) {
      if (err && err.name === "AbortError") return true;
      console.error(err);
    }
  }

  // Fallback: download the image.
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "times.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  showToast("Imagem salva");
  return true;
}

document.addEventListener("DOMContentLoaded", function () {
  $("tm-view-list").addEventListener("click", function () { setTeamsView("list"); });
  $("tm-view-pitch").addEventListener("click", function () { setTeamsView("pitch"); });
});
