function initEmployeeInterface(role, onReady) {
  const overlay = document.getElementById("auth-overlay");
  const input = document.getElementById("auth-key-input");
  const submitBtn = document.getElementById("auth-submit-btn");
  const errorEl = document.getElementById("auth-error");

  if (!overlay) return;

  const socket = io();

  function unlock() {
    overlay.remove();
    onReady(socket);
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add("visible");
    input.value = "";
    input.focus();
  }

  function attemptAuth(key) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying…";
    errorEl.classList.remove("visible");

    socket.emit("auth", { role, key }, (response) => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Unlock";

      if (response && response.success) {
        sessionStorage.setItem(`auth_key_${role}`, key);
        unlock();
      } else {
        sessionStorage.removeItem(`auth_key_${role}`);
        showError(response?.error || "Invalid access key. Please try again.");
      }
    });
  }

  const savedKey = sessionStorage.getItem(`auth_key_${role}`);
  if (savedKey) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying…";
    socket.emit("auth", { role, key: savedKey }, (response) => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Unlock";
      if (response && response.success) {
        unlock();
      } else {
        sessionStorage.removeItem(`auth_key_${role}`);
        input.focus();
      }
    });
  } else {
    input.focus();
  }

  submitBtn.addEventListener("click", () => {
    const key = input.value.trim();
    if (!key) {
      input.focus();
      return;
    }
    attemptAuth(key);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const key = input.value.trim();
      if (!key) return;
      attemptAuth(key);
    }
  });
}

function syncModeStrip(mode) {
  const strip = document.getElementById("mode-strip");
  if (!strip) return;
  strip.className = `mode-strip mode-${mode || "idle"}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("fullscreenBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });
});
