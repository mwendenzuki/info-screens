require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const REQUIRED_ENV = {
  RECEPTIONIST_KEY: "Front Desk interface (/front-desk)",
  OBSERVER_KEY: "Lap-line Tracker interface (/lap-line-tracker)",
  SAFETY_KEY: "Race Control interface (/race-control)",
};

const missing = Object.keys(REQUIRED_ENV).filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error("\n  Missing required environment variables:\n");
  missing.forEach((k) => console.error(`       ${k}  →  ${REQUIRED_ENV[k]}`));
  console.error("\n  Usage:\n");
  console.error("       export RECEPTIONIST_KEY=<key>");
  console.error("       export OBSERVER_KEY=<key>");
  console.error("       export SAFETY_KEY=<key>");
  console.error("       npm start\n");
  process.exit(1);
}

const RACE_DURATION = parseInt(process.env.RACE_DURATION, 10) || 600_000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "../public")));

const VIEWS = [
  "front-desk",
  "race-control",
  "lap-line-tracker",
  "leader-board",
  "next-race",
  "race-countdown",
  "race-flags",
];

VIEWS.forEach((v) => {
  app.get(`/${v}`, (_req, res) =>
    res.sendFile(path.join(__dirname, `../views/${v}.html`)),
  );
});

app.get("/", (_req, res) => res.redirect("/leader-board"));

const { initHandlers } = require("./sockets/handlers");
initHandlers(io, RACE_DURATION);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const dur =
    RACE_DURATION < 60_000
      ? `${RACE_DURATION / 1000}s   DEV MODE`
      : `${RACE_DURATION / 60_000} min`;

  console.log(`\n  Beachside Racetrack — server running`);
  console.log(`       http://localhost:${PORT}`);
  console.log(`       Race duration : ${dur}\n`);
});
