initEmployeeInterface("receptionist", function (socket) {
  const addSessionBtn = document.getElementById("add-session-btn");
  const sessionsContainer = document.getElementById("sessions-container");
  const sessionSelect = document.getElementById("session-select");
  const carSelect = document.getElementById("car-select");
  const driverNameInput = document.getElementById("driver-name-input");
  const addDriverBtn = document.getElementById("add-driver-btn");
  const logoutBtn = document.getElementById("logout-btn");

  logoutBtn.addEventListener("click", () => location.reload());
  let currentState = null;

  socket.on("state:update", (state) => {
    currentState = state;
    renderSessions(state.sessions);
    renderSessionSelect(state.sessions);
    renderCarSelect(state.sessions, sessionSelect.value);
  });

  sessionSelect.addEventListener("change", () => {
    if (currentState)
      renderCarSelect(currentState.sessions, sessionSelect.value);
  });

  addSessionBtn.addEventListener("click", () => {
    socket.emit("session:add", {}, (res) => {
      if (res?.error) showError(res.error);
    });
  });

  addDriverBtn.addEventListener("click", addDriver);
  driverNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addDriver();
  });

  function addDriver() {
    const name = driverNameInput.value.trim();
    const sessionId = sessionSelect.value;
    const carVal = carSelect.value; // '' = auto-assign, else integer string
    const car = carVal ? parseInt(carVal, 10) : null;

    if (!name) {
      showError("Enter a driver name.");
      return;
    }
    if (!sessionId) {
      showError("Select a session.");
      return;
    }

    socket.emit("driver:add", { sessionId, name }, (res) => {
      if (res?.error) {
        showError(res.error);
        return;
      }

      driverNameInput.value = "";

      if (car && res.driver && res.driver.car !== car) {
        socket.emit(
          "driver:assign-car",
          { sessionId, driverId: res.driver.id, car },
          (assignRes) => {
            if (assignRes?.error) showError(assignRes.error);
          },
        );
      }
    });
  }

  function renderSessionSelect(sessions) {
    const prev = sessionSelect.value;
    sessionSelect.innerHTML = '<option value="">— Select session —</option>';
    sessions.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.id === prev) opt.selected = true;
      sessionSelect.appendChild(opt);
    });
  }

  function renderCarSelect(sessions, sessionId) {
    const session = sessions.find((s) => s.id === sessionId);
    const usedCars = new Set(session ? session.drivers.map((d) => d.car) : []);

    carSelect.innerHTML = '<option value="">Auto-assign</option>';
    for (let n = 1; n <= 8; n++) {
      if (!usedCars.has(n)) {
        const opt = document.createElement("option");
        opt.value = n;
        opt.textContent = `Car ${n}`;
        carSelect.appendChild(opt);
      }
    }
  }

  function renderSessions(sessions) {
    if (!sessions.length) {
      sessionsContainer.innerHTML =
        '<div class="empty-sessions">No sessions yet — click "New Session" above.</div>';
      return;
    }

    sessionsContainer.innerHTML = "";
    sessions.forEach((session) => {
      sessionsContainer.appendChild(buildSessionBlock(session));
    });
  }

  function buildSessionBlock(session) {
    const block = document.createElement("div");
    block.className = "session-block";

    const header = document.createElement("div");
    header.className = "session-block-header";
    header.innerHTML = `
      <span class="session-name">${escHtml(session.name)}</span>
      <div style="display:flex;gap:8px;">
        <span style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted);align-self:center;">
          ${session.drivers.length}/8 drivers
        </span>
        <button class="btn btn-danger btn-sm remove-session-btn">Remove Session</button>
      </div>
    `;
    header
      .querySelector(".remove-session-btn")
      .addEventListener("click", () => {
        socket.emit("session:remove", { sessionId: session.id }, (res) => {
          if (res?.error) showError(res.error);
        });
      });
    block.appendChild(header);

    const table = document.createElement("table");
    table.className = "driver-table";
    table.innerHTML = `
      <tr>
        <th>Driver</th>
        <th>Car</th>
        <th style="text-align:right;">Actions</th>
      </tr>
    `;

    if (!session.drivers.length) {
      const emptyRow = table.insertRow();
      const cell = emptyRow.insertCell();
      cell.colSpan = 3;
      cell.style.cssText =
        "padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;";
      cell.textContent = "No drivers yet — add one using the form above.";
    } else {
      session.drivers.forEach((driver) => {
        table.appendChild(buildDriverRow(session.id, driver));
      });
    }

    block.appendChild(table);
    return block;
  }

  function buildDriverRow(sessionId, driver) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = driver.name;

    const carCell = document.createElement("td");
    carCell.className = "car-cell";
    carCell.textContent = `Car ${driver.car}`;

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions-cell";

    const actionGroup = document.createElement("div");
    actionGroup.className = "action-group";

    const editNameBtn = document.createElement("button");
    editNameBtn.className = "btn btn-ghost btn-sm";
    editNameBtn.textContent = "Edit Name";
    editNameBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = driver.name;
      nameCell.innerHTML = "";
      nameCell.appendChild(input);
      input.focus();
      input.select();

      editNameBtn.textContent = "Save";
      editNameBtn.className = "btn btn-safe btn-sm";
      editCarBtn.disabled = true;

      const save = () => {
        const newName = input.value.trim();
        if (!newName) {
          input.focus();
          return;
        }
        socket.emit(
          "driver:edit",
          { sessionId, driverId: driver.id, name: newName },
          (res) => {
            if (res?.error) showError(res.error);
          },
        );
      };

      editNameBtn.onclick = save;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
      });
    });

    const editCarBtn = document.createElement("button");
    editCarBtn.className = "btn btn-ghost btn-sm";
    editCarBtn.textContent = "Edit Car";
    editCarBtn.addEventListener("click", () => {
      const session = currentState?.sessions.find((s) => s.id === sessionId);
      const usedCars = new Set(
        session
          ? session.drivers.filter((d) => d.id !== driver.id).map((d) => d.car)
          : [],
      );

      const sel = document.createElement("select");
      sel.style.cssText =
        "background:var(--surface2);border:1px solid var(--border-hi);border-radius:var(--radius);color:var(--accent);font-family:var(--font-mono);padding:4px 8px;";
      for (let n = 1; n <= 8; n++) {
        if (!usedCars.has(n)) {
          const opt = document.createElement("option");
          opt.value = n;
          opt.textContent = `Car ${n}`;
          if (n === driver.car) opt.selected = true;
          sel.appendChild(opt);
        }
      }

      carCell.innerHTML = "";
      carCell.appendChild(sel);
      sel.focus();

      editCarBtn.textContent = "Save";
      editCarBtn.className = "btn btn-safe btn-sm";
      editNameBtn.disabled = true;

      const save = () => {
        const newCar = parseInt(sel.value, 10);
        socket.emit(
          "driver:assign-car",
          { sessionId, driverId: driver.id, car: newCar },
          (res) => {
            if (res?.error) showError(res.error);
          },
        );
      };

      editCarBtn.onclick = save;
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-danger btn-sm";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      socket.emit(
        "driver:remove",
        { sessionId, driverId: driver.id },
        (res) => {
          if (res?.error) showError(res.error);
        },
      );
    });

    actionGroup.appendChild(editNameBtn);
    actionGroup.appendChild(editCarBtn);
    actionGroup.appendChild(removeBtn);
    actionsCell.appendChild(actionGroup);

    row.appendChild(nameCell);
    row.appendChild(carCell);
    row.appendChild(actionsCell);
    return row;
  }

  let toastTimer = null;
  function showError(msg) {
    const toast = document.getElementById("error-toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
});
