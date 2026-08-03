// ============================================================
// Comparar níveis — tier list arrastável (só admin).
// Cada faixa é um nível de estrelas; arrastar um jogador entre faixas
// muda a nota (rating) e salva no backend. Usa Pointer Events para
// funcionar tanto no toque (celular) quanto no mouse.
// ============================================================

const COMPARE_TIERS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];

let cmpDrag = null;

function openCompare() {
  renderCompareTiers();
  showScreen("s-compare");
}

function clampToTier(rating) {
  let r = Math.round(Number(rating) * 2) / 2;
  if (r > 5) r = 5;
  if (r < 0.5) r = 0.5;
  return r;
}

function comparePlayerPayload(p) {
  const payload = { name: p.name, rating: p.rating, is_goalkeeper: !!p.is_goalkeeper };
  if (p.is_goalkeeper) {
    if (p.gk_footwork != null) payload.gk_footwork = p.gk_footwork;
  } else {
    if (p.marking != null) payload.marking = p.marking;
    if (p.stamina != null) payload.stamina = p.stamina;
    if (p.scoring != null) payload.scoring = p.scoring;
  }
  return payload;
}

function renderCompareTiers() {
  const wrap = $("cmp-tiers");
  wrap.innerHTML = "";

  if (!players || players.length === 0) {
    wrap.innerHTML = '<p class="empty">Nenhum jogador cadastrado.</p>';
    return;
  }

  const byTier = {};
  players.forEach(function (p) {
    const key = clampToTier(p.rating).toFixed(1);
    (byTier[key] = byTier[key] || []).push(p);
  });

  COMPARE_TIERS.forEach(function (t) {
    const key = t.toFixed(1);
    const tier = document.createElement("div");
    tier.className = "tier";
    tier.dataset.rating = key;

    const label = document.createElement("div");
    label.className = "tier-label";
    label.innerHTML = buildStarsHTML(t) + '<span class="tier-num">' + formatDecimal(t) + "</span>";

    const chips = document.createElement("div");
    chips.className = "tier-chips";
    const list = (byTier[key] || []).slice().sort(function (a, b) {
      return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { sensitivity: "base" });
    });
    if (list.length === 0) chips.classList.add("empty");
    list.forEach(function (p) { chips.appendChild(makeChip(p)); });

    tier.appendChild(label);
    tier.appendChild(chips);
    wrap.appendChild(tier);
  });
}

function makeChip(p) {
  const chip = document.createElement("div");
  chip.className = "chip";
  chip.dataset.playerId = p.id;
  chip.innerHTML =
    '<svg class="chip-grip" viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/>' +
    '<circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/>' +
    '<circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>' +
    "<span>" + escapeHTML(p.name) + gkGloveHTML(p) + "</span>";
  chip.addEventListener("pointerdown", function (e) { onChipPointerDown(e, p, chip); });
  return chip;
}

// ------------------------------------------------------------
// Drag (pointer events)
// ------------------------------------------------------------

function onChipPointerDown(e, player, chip) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  e.preventDefault();

  const rect = chip.getBoundingClientRect();
  const ghost = chip.cloneNode(true);
  ghost.classList.add("chip-ghost");
  ghost.style.width = rect.width + "px";
  document.body.appendChild(ghost);

  cmpDrag = {
    player: player,
    chip: chip,
    ghost: ghost,
    pointerId: e.pointerId,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    targetTier: null,
  };
  chip.classList.add("dragging");
  moveGhost(e.clientX, e.clientY);

  window.addEventListener("pointermove", onChipPointerMove);
  window.addEventListener("pointerup", onChipPointerUp);
  window.addEventListener("pointercancel", onChipPointerUp);
}

function moveGhost(x, y) {
  if (!cmpDrag) return;
  cmpDrag.ghost.style.left = (x - cmpDrag.offsetX) + "px";
  cmpDrag.ghost.style.top = (y - cmpDrag.offsetY) + "px";
}

function onChipPointerMove(e) {
  if (!cmpDrag || e.pointerId !== cmpDrag.pointerId) return;
  e.preventDefault();
  moveGhost(e.clientX, e.clientY);

  const under = document.elementFromPoint(e.clientX, e.clientY);
  const tier = under ? under.closest(".tier") : null;
  if (tier !== cmpDrag.targetTier) {
    if (cmpDrag.targetTier) cmpDrag.targetTier.classList.remove("drop-target");
    cmpDrag.targetTier = tier;
    if (tier) tier.classList.add("drop-target");
  }

  autoScrollCompare(e.clientY);
}

function autoScrollCompare(y) {
  const scroller = $("cmp-scroll");
  if (!scroller) return;
  const r = scroller.getBoundingClientRect();
  const margin = 70;
  if (y < r.top + margin) scroller.scrollTop -= 12;
  else if (y > r.bottom - margin) scroller.scrollTop += 12;
}

function onChipPointerUp(e) {
  if (!cmpDrag) return;
  window.removeEventListener("pointermove", onChipPointerMove);
  window.removeEventListener("pointerup", onChipPointerUp);
  window.removeEventListener("pointercancel", onChipPointerUp);

  const target = cmpDrag.targetTier;
  const player = cmpDrag.player;

  if (cmpDrag.ghost.parentNode) cmpDrag.ghost.parentNode.removeChild(cmpDrag.ghost);
  cmpDrag.chip.classList.remove("dragging");
  if (target) target.classList.remove("drop-target");
  cmpDrag = null;

  if (target) {
    const newRating = parseFloat(target.dataset.rating);
    if (!isNaN(newRating) && newRating !== clampToTier(player.rating)) {
      setPlayerRating(player, newRating);
    }
  }
}

async function setPlayerRating(player, newRating) {
  const previous = player.rating;
  player.rating = newRating;
  renderCompareTiers();

  try {
    const updated = await fetchJSON("/api/players/" + player.id, {
      method: "PUT",
      body: JSON.stringify(comparePlayerPayload(player)),
    });
    // Update in place so chip closures keep pointing at the same object.
    Object.assign(player, updated);
    if (typeof renderSquad === "function") renderSquad();
    showToast(player.name + " · " + formatDecimal(newRating) + "★");
  } catch (err) {
    player.rating = previous;
    renderCompareTiers();
    showToast("Não foi possível salvar.");
  }
}

// ------------------------------------------------------------
// Event listeners
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
  $("sq-compare-btn").addEventListener("click", openCompare);
  $("cmp-back").addEventListener("click", function () { showScreen("s-squad"); });
});
