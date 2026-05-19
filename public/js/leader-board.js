const socket = io();
const modeStrip = document.getElementById("mode-strip");
const sessionLabel = document.getElementById("session-label");
const flagPill = document.getElementById("flag-pill");
const flagLabel = document.getElementById("flag-label");
const countdown = document.getElementById("countdown");
const driverList = document.getElementById("driver-list");
const emptyState = document.getElementById("empty-state");
const statusBanner = document.getElementById("status-banner");
const bannerText = document.getElementById("banner-text");

const prevFastest = new Map();
socket.on("state:update", render);

function render(state) {
  updateModeUI(state.raceMode);
  updateCountdown(state);

  const session = state.raceSession || state.lastRace;
  const isLive = Boolean(state.raceSession);
  const isLast = !isLive && Boolean(state.lastRace);

  if (isLast && !isLive) {
    statusBanner.classList.add("visible");
    bannerText.textContent = "LAST RACE RESULTS";
  } else {
    statusBanner.classList.remove("visible");
  }

  if (!session) {
    driverList.classList.add("hidden");
    emptyState.classList.remove("hidden");
    sessionLabel.textContent = "—";
    return;
  }

  driverList.classList.remove("hidden");
  emptyState.classList.add("hidden");
  sessionLabel.textContent = isLast ? "LAST SESSION" : "LIVE";

  const sorted = sortByFastest(session.drivers);
  renderRows(sorted);
}

function renderRows(drivers) {
  const existing = Array.from(driverList.querySelectorAll(".driver-row"));

  drivers.forEach((driver, i) => {
    const pos = i + 1;
    let row = existing[i];

    if (!row) {
      row = document.createElement("div");
      row.className = "driver-row";
      driverList.appendChild(row);
    }

    const newFastest = driver.fastestLap;
    const oldFastest = prevFastest.get(driver.car);
    const improved = newFastest !== null && newFastest !== oldFastest;

    if (improved) {
      prevFastest.set(driver.car, newFastest);
      row.classList.remove("lap-updated");
      void row.offsetWidth;
      row.classList.add("lap-updated");
    }

    const posClass =
      pos === 1 ? "pos-1" : pos === 2 ? "pos-2" : pos === 3 ? "pos-3" : "pos-n";
    const lapStr =
      driver.fastestLap !== null
        ? formatLapTime(driver.fastestLap)
        : "--:--.---";
    const lapClass = driver.fastestLap !== null ? "" : "no-time";

    row.innerHTML = `
      <div class="pos ${posClass}">${pos}</div>
      <div class="car-num">${driver.car}</div>
      <div class="driver-name">${escHtml(driver.name)}</div>
      <div class="fastest-lap ${lapClass}">${lapStr}</div>
      <div class="lap-count">${driver.currentLap > 0 ? driver.currentLap : "—"}</div>
    `;
  });

  for (let i = drivers.length; i < existing.length; i++) {
    existing[i].remove();
  }
}

function updateModeUI(mode) {
  modeStrip.className = `mode-strip mode-${mode}`;
  flagPill.className = `flag-pill mode-${mode}`;
  flagLabel.textContent = modeLabel(mode);
}

function updateCountdown(state) {
  if (!state.raceActive || state.raceRemaining === null) {
    countdown.textContent = "--:--";
    countdown.classList.remove("urgent");
    return;
  }

  countdown.textContent = formatCountdown(state.raceRemaining);
  countdown.classList.toggle("urgent", state.raceRemaining <= 60_000);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
