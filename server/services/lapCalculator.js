function formatLapTime(ms) {
  if (ms === null || ms === undefined) return "--:--.---";
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  const millis = ms % 1_000;
  return `${minutes}:${pad2(seconds)}.${pad3(millis)}`;
}

function formatCountdown(ms) {
  if (ms === null || ms === undefined) return "--:--";
  const total = Math.max(0, Math.ceil(ms / 1_000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${pad2(seconds)}`;
}

function sortByFastest(drivers) {
  return [...drivers].sort((a, b) => {
    if (a.fastestLap === null && b.fastestLap === null) return 0;
    if (a.fastestLap === null) return 1;
    if (b.fastestLap === null) return -1;
    return a.fastestLap - b.fastestLap;
  });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}
function pad3(n) {
  return String(n).padStart(3, "0");
}

module.exports = { formatLapTime, formatCountdown, sortByFastest };
