const auth = require("../auth");
const raceState = require("../state/raceState");
const raceManager = require("../services/raceManager");

const authedSockets = new Map();

function initHandlers(io, raceDuration) {
  raceManager.init(io);

  io.on("connection", (socket) => {
    socket.emit("state:update", raceManager.buildPayload());

    socket.on("auth", async ({ role, key } = {}, cb) => {
      if (auth.verify(role, key)) {
        authedSockets.set(socket.id, role);
        return cb?.({ success: true, role });
      }
      await delay(500);
      cb?.({ success: false, error: "Invalid access key. Please try again." });
    });

    socket.on("disconnect", () => authedSockets.delete(socket.id));

    socket.on("session:add", (_data, cb) => {
      if (!guard(socket, "receptionist", cb)) return;
      const session = raceState.addSession();
      raceManager.broadcast();
      cb?.({ success: true, session });
    });

    socket.on("session:remove", ({ sessionId } = {}, cb) => {
      if (!guard(socket, "receptionist", cb)) return;
      raceState.removeSession(sessionId);
      raceManager.broadcast();
      cb?.({ success: true });
    });

    socket.on("driver:add", ({ sessionId, name } = {}, cb) => {
      if (!guard(socket, "receptionist", cb)) return;
      const result = raceState.addDriver(sessionId, name);
      if (result.error) return cb?.({ error: result.error });
      raceManager.broadcast();
      cb?.({ success: true, driver: result.driver });
    });

    socket.on("driver:remove", ({ sessionId, driverId } = {}, cb) => {
      if (!guard(socket, "receptionist", cb)) return;
      const result = raceState.removeDriver(sessionId, driverId);
      if (result.error) return cb?.({ error: result.error });
      raceManager.broadcast();
      cb?.({ success: true });
    });

    socket.on("driver:edit", ({ sessionId, driverId, name } = {}, cb) => {
      if (!guard(socket, "receptionist", cb)) return;
      const result = raceState.editDriver(sessionId, driverId, name);
      if (result.error) return cb?.({ error: result.error });
      raceManager.broadcast();
      cb?.({ success: true });
    });

    socket.on("driver:assign-car", ({ sessionId, driverId, car } = {}, cb) => {
      if (!guard(socket, "receptionist", cb)) return;
      const result = raceState.assignCar(sessionId, driverId, car);
      if (result.error) return cb?.({ error: result.error });
      raceManager.broadcast();
      cb?.({ success: true });
    });

    socket.on("race:start", (_data, cb) => {
      if (!guard(socket, "safety", cb)) return;
      const result = raceState.startRace(raceDuration);
      if (result.error) return cb?.({ error: result.error });
      raceManager.startTimer();
      raceManager.broadcast();
      cb?.({ success: true });
    });

    socket.on("race:mode:set", ({ mode } = {}, cb) => {
      if (!guard(socket, "safety", cb)) return;
      const result = raceState.setMode(mode);
      if (result.error) return cb?.({ error: result.error });
      if (mode === "finish") {
        raceManager.stopTimer();
        raceState.markRaceInactive();
      }
      raceManager.broadcast();
      cb?.({ success: true });
    });

    socket.on("race:end-session", (_data, cb) => {
      if (!guard(socket, "safety", cb)) return;
      const result = raceState.endSession();
      if (result.error) return cb?.({ error: result.error });
      raceManager.stopTimer();
      raceManager.broadcast();
      cb?.({ success: true });
    });

    socket.on("lap:record", ({ carNumber } = {}, cb) => {
      if (!guard(socket, "observer", cb)) return;
      const result = raceState.recordLap(Number(carNumber));
      if (result.error) return cb?.({ error: result.error });
      raceManager.broadcast();
      cb?.({ success: true, driver: result.driver });
    });
  });
}

function guard(socket, role, cb) {
  if (authedSockets.get(socket.id) === role) return true;
  cb?.({ error: "Unauthorized" });
  return false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { initHandlers };
