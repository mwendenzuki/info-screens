# Beachside Racetrack — Info Screens

A real time race management and spectator information system built with Node.js and Socket.IO. All displays and interfaces update instantly across every connected device without polling.

---

## Project Overview

**Employee interfaces** — password-protected screens for staff managing race operations.

**Public displays** — full-screen displays intended for large monitors in spectator and driver areas. These update in real time and require no interaction beyond toggling fullscreen.

All real-time communication runs over Socket.IO. No page refreshes or polling are used at any point.

---

## Requirements

- Node.js v18 or higher
- npm v9 or higher
- A modern browser (Chrome, Firefox, Safari, Edge)

---

## Installation

Clone or copy the project folder, then install dependencies:

```bash
cd info-screens
npm install
```

---

## Environment Variables

Create a `.env` file at the project root:

```
RECEPTIONIST_KEY=your_key_here
OBSERVER_KEY=your_key_here
SAFETY_KEY=your_key_here
```

Each key corresponds to one employee interface. Keep them separate so each role only has access to their own screen.

| Variable           | Interface           | Role              |
| ------------------ | ------------------- | ----------------- |
| `RECEPTIONIST_KEY` | `/front-desk`       | Receptionist      |
| `OBSERVER_KEY`     | `/lap-line-tracker` | Lap-line Observer |
| `SAFETY_KEY`       | `/race-control`     | Safety Official   |

---

## Running the Server

### Production mode

Race sessions last 10 minutes.

```bash
npm start
```

### Development mode

Race sessions last 1 minute. The server also reloads automatically when source files change.

```bash
npm run dev
```

Once running, the server is available at:

```
http://localhost:3000
```

---

## Interfaces

### Employee interfaces

These require an access key to unlock. Enter the key that corresponds to the role when prompted.

| Interface        | Route                                                       | Access Key Variable |
| ---------------- | ----------------------------------------------------------- | ------------------- |
| Front Desk       | [/front-desk](http://localhost:3000/front-desk)             | `RECEPTIONIST_KEY`  |
| Race Control     | [/race-control](http://localhost:3000/race-control)         | `SAFETY_KEY`        |
| Lap-line Tracker | [/lap-line-tracker](http://localhost:3000/lap-line-tracker) | `OBSERVER_KEY`      |

### Public displays

These require no login. Open them in a browser and click the fullscreen button in the bottom-right corner to enter fullscreen mode.

| Interface      | Route                                                   | Intended for                 |
| -------------- | ------------------------------------------------------- | ---------------------------- |
| Leader Board   | [/leader-board](http://localhost:3000/leader-board)     | Spectators and drivers       |
| Next Race      | [/next-race](http://localhost:3000/next-race)           | Drivers waiting to race      |
| Race Countdown | [/race-countdown](http://localhost:3000/race-countdown) | Spectators and drivers       |
| Race Flags     | [/race-flags](http://localhost:3000/race-flags)         | Displayed around the circuit |

---

## User Guide

Open each interface in a separate browser tab before you begin.

- Step 1 — Configure the session (Front Desk)
- Step 2 — Start the race (Race Control)
- Step 3 — Record lap times (Lap-line Tracker)
- Step 4 — Control race modes (Race Control)

- During the race, use the four mode buttons to communicate safety instructions to drivers. The `/race-flags` display around the circuit changes colour immediately.

| Button | Flag display      | Instruction        |
| ------ | ----------------- | ------------------ |
| Safe   | Solid green       | Normal racing      |
| Hazard | Pulsing amber     | Drive slowly       |
| Danger | Flashing red      | Stop driving       |
| Finish | Chequered pattern | Return to pit lane |

- The race ends automatically when the timer reaches zero, or you can click **Finish** to end it early. Once the session is in Finish mode, the race mode cannot be changed.

- Step 5 — End the session (Race Control)
- Step 6 — Repeat

The Race Control interface queues up the next session automatically. Return to Step 2 to run subsequent sessions.

---

## Real-Time Functionality

### All updates are synchronized instantly using Socket.IO:

- Leaderboard updates
- Race countdown timer
- Race status changes
- Lap tracking
