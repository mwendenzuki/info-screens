const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const PERSIST_FILE = path.join(__dirname, "../../.race-state.json");

const MODES = {
  IDLE: "idle",
  SAFE: "safe",
  HAZARD: "hazard",
  DANGER: "danger",
  FINISH: "finish",
};

function defaultState() {
  return {
    sessions: [],
    raceActive: false,
    raceSession: null,
    raceMode: MODES.IDLE,
    raceStartTime: null,
    raceDuration: 600_000,
    raceRemaining: null,
    lastRace: null,
    pendingPaddock: false,
    sessionCounter: 0,
  };
}

function loadState() {
  try {
    const raw = fs.readFileSync(PERSIST_FILE, "utf8");
    const saved = JSON.parse(raw);

    if (saved.raceActive && saved.raceStartTime) {
      const elapsed = Date.now() - saved.raceStartTime;
      const remaining = Math.max(0, saved.raceDuration - elapsed);
      saved.raceRemaining = remaining;

      if (remaining <= 0) {
        saved.raceMode = MODES.FINISH;
        saved.raceActive = false;
      }
    }

    console.log("  Resumed state from disk.");
    return saved;
  } catch {
    return defaultState();
  }
}

let state = loadState();
let sessionCounter = state.sessionCounter || 0;

function persist() {
  try {
    const toSave = { ...state, sessionCounter };
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(toSave, null, 2), "utf8");
  } catch (err) {
    console.error("  Warning: could not persist state:", err.message);
  }
}

function makeDriver(name, car) {
  return {
    id: uuidv4(),
    name,
    car,
    currentLap: 0,
    fastestLap: null,
    lapTimes: [],
    lapStart: null,
  };
}

function nextAvailableCar(drivers) {
  const used = new Set(drivers.map((d) => d.car));
  for (let n = 1; n <= 8; n++) {
    if (!used.has(n)) return n;
  }
  return null;
}

function addSession() {
  sessionCounter++;
  const session = {
    id: uuidv4(),
    name: `Session ${sessionCounter}`,
    drivers: [],
  };
  state.sessions.push(session);
  persist();
  return session;
}

function removeSession(sessionId) {
  state.sessions = state.sessions.filter((s) => s.id !== sessionId);
  persist();
}

function getSession(sessionId) {
  return state.sessions.find((s) => s.id === sessionId) || null;
}

function addDriver(sessionId, name) {
  const session = getSession(sessionId);
  if (!session) return { error: "Session not found" };
  if (session.drivers.length >= 8)
    return { error: "Session is full (max 8 drivers)" };

  const duplicate = session.drivers.some(
    (d) => d.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (duplicate)
    return { error: "Driver name must be unique within this session" };

  const car = nextAvailableCar(session.drivers);
  if (!car) return { error: "No cars available" };

  const driver = makeDriver(name.trim(), car);
  session.drivers.push(driver);
  persist();
  return { driver };
}

function removeDriver(sessionId, driverId) {
  const session = getSession(sessionId);
  if (!session) return { error: "Session not found" };
  session.drivers = session.drivers.filter((d) => d.id !== driverId);
  persist();
  return { success: true };
}

function editDriver(sessionId, driverId, name) {
  const session = getSession(sessionId);
  if (!session) return { error: "Session not found" };

  const duplicate = session.drivers.some(
    (d) =>
      d.id !== driverId &&
      d.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (duplicate)
    return { error: "Driver name must be unique within this session" };

  const driver = session.drivers.find((d) => d.id === driverId);
  if (!driver) return { error: "Driver not found" };

  driver.name = name.trim();
  persist();
  return { success: true };
}

function assignCar(sessionId, driverId, carNumber) {
  const session = getSession(sessionId);
  if (!session) return { error: "Session not found" };

  const carTaken = session.drivers.some(
    (d) => d.id !== driverId && d.car === carNumber,
  );
  if (carTaken) return { error: `Car ${carNumber} is already assigned` };

  const driver = session.drivers.find((d) => d.id === driverId);
  if (!driver) return { error: "Driver not found" };

  driver.car = carNumber;
  persist();
  return { success: true };
}

function startRace(duration) {
  if (!state.sessions.length) return { error: "No upcoming sessions" };
  const session = state.sessions[0];
  if (!session.drivers.length)
    return { error: "No drivers in the next session" };

  state.raceSession = JSON.parse(JSON.stringify(session));
  state.raceSession.drivers.forEach((d) => {
    d.currentLap = 0;
    d.fastestLap = null;
    d.lapTimes = [];
    d.lapStart = null;
  });

  state.sessions.shift();
  state.raceActive = true;
  state.raceMode = MODES.SAFE;
  state.raceStartTime = Date.now();
  state.raceDuration = duration;
  state.raceRemaining = duration;
  state.pendingPaddock = false;

  persist();
  return { success: true };
}

function setMode(mode) {
  if (!Object.values(MODES).includes(mode))
    return { error: `Unknown mode: ${mode}` };
  if (state.raceMode === MODES.FINISH)
    return { error: "Race is finished — mode cannot be changed" };
  state.raceMode = mode;
  persist();
  return { success: true };
}

function endSession() {
  if (state.raceMode !== MODES.FINISH)
    return { error: "Race must be in Finish mode first" };

  state.lastRace = state.raceSession
    ? JSON.parse(JSON.stringify(state.raceSession))
    : null;
  state.raceSession = null;
  state.raceActive = false;
  state.raceMode = MODES.DANGER;
  state.raceStartTime = null;
  state.raceRemaining = null;
  state.pendingPaddock = state.sessions.length > 0;

  persist();
  return { success: true };
}

function recordLap(carNumber) {
  if (!state.raceSession) return { error: "No active race session" };

  const driver = state.raceSession.drivers.find((d) => d.car === carNumber);
  if (!driver) return { error: `Car ${carNumber} not found in this session` };

  const now = Date.now();

  if (driver.currentLap === 0) {
    driver.currentLap = 1;
    driver.lapStart = now;
  } else {
    if (driver.lapStart !== null) {
      const lapTime = now - driver.lapStart;
      driver.lapTimes.push(lapTime);
      if (driver.fastestLap === null || lapTime < driver.fastestLap) {
        driver.fastestLap = lapTime;
      }
    }
    driver.currentLap++;
    driver.lapStart = now;
  }

  persist();
  return { success: true, driver };
}

function updateRemaining(ms) {
  state.raceRemaining = ms;
}

function markRaceInactive() {
  state.raceActive = false;
  state.raceRemaining = 0;
  persist();
}

function autoFinish() {
  if (state.raceMode !== MODES.FINISH) {
    state.raceMode = MODES.FINISH;
    state.raceActive = false;
    persist();
    return true;
  }
  return false;
}

function getState() {
  return state;
}
function getNextSession() {
  return state.sessions[0] || null;
}

function wasRaceActiveOnLoad() {
  return state.raceActive;
}

module.exports = {
  MODES,
  getState,
  getNextSession,
  wasRaceActiveOnLoad,
  addSession,
  removeSession,
  addDriver,
  removeDriver,
  editDriver,
  assignCar,
  startRace,
  setMode,
  endSession,
  recordLap,
  updateRemaining,
  markRaceInactive,
  autoFinish,
};
