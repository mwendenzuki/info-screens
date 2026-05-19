initEmployeeInterface("observer", function (socket) {
  const lapGrid = document.getElementById("lap-grid");
  const waitingMsg = document.getElementById("waiting-msg");
  const statusBanner = document.getElementById("status-banner");
  const flagPill = document.getElementById("flag-pill");
  const flagLabel = document.getElementById("flag-label");
  const raceTimer = document.getElementById("race-timer");
  const logoutBtn = document.getElementById("logout-btn");

  logoutBtn.addEventListener("click", () => location.reload());

  let lapMap = {};

  socket.on("state:update", render);

  function render(state) {
    const mode = state.raceMode || "idle";
    const active = state.raceActive;
    const session = state.raceSession;
    const ended = !active && mode !== "idle";

    flagPill.className = `flag-pill mode-${mode}`;
    flagLabel.textContent = modeLabel(mode);

    statusBanner.className = `mode-${mode}`;
    const BANNER_TEXT = {
      safe: "🟢  RACE IN PROGRESS — SAFE",
      hazard: "🟡  HAZARD — DRIVE SLOWLY",
      danger: "🔴  DANGER — STOP",
      finish: "🏁  FINISH — RACE OVER — RETURN TO PIT LANE",
      idle: "",
    };
    statusBanner.textContent = BANNER_TEXT[mode] || "";

    if (active && state.raceRemaining !== null) {
      raceTimer.textContent = formatCountdown(state.raceRemaining);
      raceTimer.classList.toggle("urgent", state.raceRemaining <= 60_000);
      raceTimer.classList.remove("inactive");
    } else {
      raceTimer.textContent = "--:--";
      raceTimer.classList.remove("urgent");
      raceTimer.classList.add("inactive");
    }

    if (!session) {
      lapGrid.classList.add("hidden");
      waitingMsg.style.display = "flex";
      lapMap = {};
      return;
    }

    lapGrid.classList.remove("hidden");
    waitingMsg.style.display = "none";

    const drivers = [...session.drivers].sort((a, b) => a.car - b.car);
    const isDisabled = !active || mode === "finish";

    drivers.forEach((d) => {
      lapMap[d.car] = d.currentLap;
    });

    renderButtons(drivers, isDisabled, mode);
  }

  function renderButtons(drivers, disabled, mode) {
    const count = drivers.length;

    let cols, rows;
    if (count <= 2) {
      cols = count;
      rows = 1;
    } else if (count <= 4) {
      cols = 2;
      rows = 2;
    } else if (count <= 6) {
      cols = 3;
      rows = 2;
    } else {
      cols = 4;
      rows = 2;
    }

    lapGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    lapGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const existingKeys = Array.from(lapGrid.querySelectorAll(".lap-btn"))
      .map((b) => b.dataset.car)
      .join(",");
    const newKeys = drivers.map((d) => d.car).join(",");

    if (existingKeys !== newKeys) {
      lapGrid.innerHTML = "";
      drivers.forEach((driver) => {
        lapGrid.appendChild(makeButton(driver, disabled));
      });
    } else {
      lapGrid.querySelectorAll(".lap-btn").forEach((btn) => {
        const car = parseInt(btn.dataset.car, 10);
        const driver = drivers.find((d) => d.car === car);
        btn.disabled = disabled;
        if (driver) {
          const countEl = btn.querySelector(".lap-count");
          if (countEl) countEl.textContent = lapCountLabel(driver.currentLap);
        }
      });
    }

    if (
      mode === "finish" ||
      (!lapGrid.classList.contains("hidden") && disabled)
    ) {
      lapGrid
        .querySelectorAll(".lap-btn")
        .forEach((btn) => (btn.disabled = true));
    }
  }

  function makeButton(driver, disabled) {
    const btn = document.createElement("button");
    btn.className = "lap-btn";
    btn.dataset.car = driver.car;
    btn.disabled = disabled;

    btn.innerHTML = `
      <span class="car-label">CAR</span>
      <span>${driver.car}</span>
      <span class="lap-count">${lapCountLabel(driver.currentLap)}</span>
    `;

    btn.addEventListener("click", () => {
      if (btn.disabled) return;

      btn.classList.add("tapped");
      setTimeout(() => btn.classList.remove("tapped"), 200);

      socket.emit("lap:record", { carNumber: driver.car }, (res) => {
        if (res?.error) {
          console.warn("[lap-line-tracker] lap:record error:", res.error);
        }
      });
    });

    return btn;
  }

  function lapCountLabel(lap) {
    if (!lap || lap === 0) return "LAP —";
    return `LAP ${lap}`;
  }

  function modeLabel(mode) {
    const MAP = {
      idle: "IDLE",
      safe: "SAFE",
      hazard: "HAZARD",
      danger: "DANGER",
      finish: "FINISH",
    };
    return MAP[mode] || mode?.toUpperCase() || "—";
  }
});
