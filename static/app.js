(function () {
  const form = document.getElementById("summarize-form");
  const submitBtn = document.getElementById("submit-btn");
  const btnLabel = submitBtn.querySelector(".btn-label");
  const spinner = submitBtn.querySelector(".spinner");
  const errorBox = document.getElementById("error");
  const results = document.getElementById("results");
  const dropzone = document.getElementById("dropzone");
  const dropzoneText = document.getElementById("dropzone-text");
  const fileInput = document.getElementById("media_file");

  /* ---------- tabs ---------- */
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.remove("hidden");
    });
  });

  /* ---------- drag & drop ---------- */
  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      dropzoneText.textContent = file.name;
    }
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) dropzoneText.textContent = fileInput.files[0].name;
  });

  /* ---------- submit ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
    results.classList.add("hidden");
    setLoading(true);

    try {
      const res = await fetch("/api/summarize", { method: "POST", body: new FormData(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      renderResults(data.summary);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnLabel.classList.toggle("hidden", isLoading);
    spinner.classList.toggle("hidden", !isLoading);
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  }

  function fillList(el, items, empty) {
    el.innerHTML = "";
    if (!items || !items.length) {
      const li = document.createElement("li");
      li.className = "mut";
      li.textContent = empty;
      el.appendChild(li);
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      el.appendChild(li);
    });
  }

  function renderResults(summary) {
    document.getElementById("tldr").textContent = summary.tldr || "—";
    fillList(document.getElementById("key-points"), summary.key_points, "None captured.");
    fillList(document.getElementById("decisions"), summary.decisions, "None mentioned.");

    const actionsEl = document.getElementById("action-items");
    actionsEl.innerHTML = "";
    if (!summary.action_items || !summary.action_items.length) {
      const li = document.createElement("li");
      li.className = "mut";
      li.textContent = "None mentioned.";
      actionsEl.appendChild(li);
    } else {
      summary.action_items.forEach((a) => {
        const li = document.createElement("li");
        const b = document.createElement("b");
        b.textContent = a.owner || "Unspecified";
        li.appendChild(b);
        li.appendChild(document.createTextNode(" — " + a.task));
        actionsEl.appendChild(li);
      });
    }

    results.classList.remove("hidden");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
