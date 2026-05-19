initEmployeeInterface("safety", function (socket) {
  const timerValue = document.getElementById("timer-value");
  const modePill = document.getElementById("mode-pill");
  const modeStripInline = document.getElementById("mode-strip-inline");
  const modeLabelInline = document.getElementById("mode-label-inline");
  const briefingBody = document.getElementById("briefing-body");
  const logoutBtn = document.getElementById("logout-btn");
  const btnStart = document.getElementById("btn-start");
  const btnSafe = document.getElementById("btn-safe");
  const btnHazard = document.getElementById("btn-hazard");
  const btnDanger = document.getElementById("btn-danger");
  const btnFinish = document.getElementById("btn-finish");
  const btnEndSession = document.getElementById("btn-end-session");

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("auth_key_safety");
    location.reload();
  });

  btnStart.addEventListener("click", () => {
    socket.emit("race:start", {}, (res) => {
      if (res?.error) showFeedback(res.error, "error");
    });
  });

  btnSafe.addEventListener("click", () => setMode("safe"));
  btnHazard.addEventListener("click", () => setMode("hazard"));
  btnDanger.addEventListener("click", () => setMode("danger"));
  btnFinish.addEventListener("click", () => setMode("finish"));

  btnEndSession.addEventListener("click", () => {
    socket.emit("race:end-session", {}, (res) => {
      if (res?.error) showFeedback(res.error, "error");
      else showFeedback("Session ended — circuit set to DANGER.", "info");
    });
  });

  function setMode(mode) {
    socket.emit("race:mode:set", { mode }, (res) => {
      if (res?.error) showFeedback(res.error, "error");
    });
  }

  socket.on("state:update", render);

  function render(state) {
    const mode = state.raceMode || "idle";
    const active = state.raceActive;
    const finished = mode === "finish";

    modePill.className = `mode-pill mode-${mode}`;
    modePill.textContent = modeLabel(mode);
    modeStripInline.className = `flag-pill mode-${mode}`;
    modeLabelInline.textContent = modeLabel(mode);

    [btnSafe, btnHazard, btnDanger, btnFinish].forEach((b) =>
      b.classList.remove("active"),
    );
    if (mode === "safe") btnSafe.classList.add("active");
    if (mode === "hazard") btnHazard.classList.add("active");
    if (mode === "danger") btnDanger.classList.add("active");
    if (mode === "finish") btnFinish.classList.add("active");

    if (active && state.raceRemaining !== null) {
      timerValue.textContent = formatCountdown(state.raceRemaining);
      timerValue.classList.toggle("urgent", state.raceRemaining <= 60_000);
      timerValue.classList.remove("inactive");
    } else if (finished) {
      timerValue.textContent = "0:00";
      timerValue.classList.remove("urgent", "inactive");
    } else {
      timerValue.textContent = "--:--";
      timerValue.classList.remove("urgent");
      timerValue.classList.add("inactive");
    }

    btnStart.disabled = active || finished;
    btnSafe.disabled = !active || finished;
    btnHazard.disabled = !active || finished;
    btnDanger.disabled = !active || finished;
    btnFinish.disabled = !active || finished;
    btnEndSession.disabled = !finished;

    const session = state.raceSession || state.nextSession;
    renderBriefing(session, active);
  }

  function renderBriefing(session, isLive) {
    if (!session || !session.drivers.length) {
      briefingBody.innerHTML =
        '<div class="no-session-msg">No upcoming session.</div>';
      return;
    }

    const label = isLive ? "CURRENT RACE" : "NEXT SESSION";
    const drivers = [...session.drivers].sort((a, b) => a.car - b.car);

    briefingBody.innerHTML = `
      <div style="font-family:var(--font-display);font-weight:700;font-size:0.8rem;letter-spacing:0.15em;color:var(--text-muted);margin-bottom:12px;">${label} — ${session.name || ""}</div>
    `;

    drivers.forEach((driver) => {
      const row = document.createElement("div");
      row.className = "driver-row";
      row.innerHTML = `
        <div class="car-badge">${driver.car}</div>
        <div class="driver-name">${escHtml(driver.name)}</div>
      `;
      briefingBody.appendChild(row);
    });
  }

  let feedbackTimer = null;
  function showFeedback(msg, type = "error") {
    const el = document.getElementById("feedback");
    el.textContent = msg;
    el.className = `show ${type}`;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => el.classList.remove("show"), 3500);
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
});
