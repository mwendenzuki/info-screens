const raceState = require("../state/raceState");

let io;
let timerInterval = null;

function init(ioInstance) {
  io = ioInstance;

  if (raceState.wasRaceActiveOnLoad()) {
    console.log("  Resuming active race timer from persisted state.");
    startTimer();
  }
}

function startTimer() {
  stopTimer();

  timerInterval = setInterval(() => {
    const s = raceState.getState();
    if (!s.raceActive) {
      stopTimer();
      return;
    }

    const elapsed = Date.now() - s.raceStartTime;
    const remaining = Math.max(0, s.raceDuration - elapsed);

    raceState.updateRemaining(remaining);

    if (remaining <= 0) {
      const changed = raceState.autoFinish();
      stopTimer();
      if (changed) broadcast();
      return;
    }

    broadcast();
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function broadcast() {
  if (!io) return;
  io.emit("state:update", buildPayload());
}

function buildPayload() {
  const s = raceState.getState();
  return {
    raceActive: s.raceActive,
    raceMode: s.raceMode,
    raceSession: s.raceSession,
    raceRemaining: s.raceRemaining,
    raceDuration: s.raceDuration,
    sessions: s.sessions,
    lastRace: s.lastRace,
    pendingPaddock: s.pendingPaddock,
    nextSession: raceState.getNextSession(),
  };
}

module.exports = { init, startTimer, stopTimer, broadcast, buildPayload };
