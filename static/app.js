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
  const ALLOWED_EXT = [".flac", ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".ogg", ".opus", ".wav", ".webm"];

  let currentMediaFile = null; // whichever File is currently queued for upload (drop or recording)
  let lastSummary = null;

  /* ---------- tabs ---------- */
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.remove("hidden");
    });
  });

  /* ---------- drag & drop / file picker ---------- */
  function extOf(name) {
    const i = name.lastIndexOf(".");
    return i === -1 ? "" : name.slice(i).toLowerCase();
  }

  function handleFile(file) {
    if (!file) return;
    if (!ALLOWED_EXT.includes(extOf(file.name))) {
      showError(`Unsupported file type "${extOf(file.name) || file.name}". Try: ${ALLOWED_EXT.join(", ")}`);
      return;
    }
    errorBox.classList.add("hidden");
    dropzoneText.textContent = file.name;
    currentMediaFile = file;
  }

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
    if (e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files;
      handleFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));

  /* ---------- mic recording ---------- */
  const recordBtn = document.getElementById("record-btn");
  const recordTime = document.getElementById("record-time");
  const recordPreview = document.getElementById("record-preview");
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordTimer = null;
  let recordSeconds = 0;

  recordBtn.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => e.data.size && recordedChunks.push(e.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recordTimer);
        recordBtn.classList.remove("recording");
        recordBtn.innerHTML = '<span class="record-dot"></span> Start recording';

        const blob = new Blob(recordedChunks, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        currentMediaFile = file;

        recordPreview.src = URL.createObjectURL(blob);
        recordPreview.classList.remove("hidden");
      };
      mediaRecorder.start();
      recordSeconds = 0;
      recordTime.textContent = "00:00";
      recordTime.classList.remove("hidden");
      recordBtn.classList.add("recording");
      recordBtn.innerHTML = '<span class="record-dot"></span> Stop recording';
      recordTimer = setInterval(() => {
        recordSeconds++;
        const m = String(Math.floor(recordSeconds / 60)).padStart(2, "0");
        const s = String(recordSeconds % 60).padStart(2, "0");
        recordTime.textContent = `${m}:${s}`;
      }, 1000);
    } catch (err) {
      showError("Couldn't access your microphone: " + err.message);
    }
  });

  /* ---------- steps ---------- */
  function setStep(n) {
    document.querySelectorAll(".step").forEach((s) => {
      const step = parseInt(s.dataset.step, 10);
      s.classList.toggle("active", step === n);
      s.classList.toggle("done", step < n);
    });
  }

  /* ---------- submit ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
    results.classList.add("hidden");
    setLoading(true);
    setStep(2);

    try {
      const res = await fetch("/api/summarize", { method: "POST", body: new FormData(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      lastSummary = data.summary;
      renderResults(data);
      setStep(3);
      confettiBurst();
    } catch (err) {
      showError(err.message);
      setStep(1);
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

  /* ---------- results ---------- */
  function renderResults(data) {
    const summary = data.summary;

    animateHealth(summary.health.score, summary.health.label);
    document.getElementById("tldr").textContent = summary.tldr || "—";

    fillCards(document.getElementById("decisions"), summary.decisions, (d) => `<p>${escapeHtml(d)}</p>`, "No decisions captured.");
    fillCards(
      document.getElementById("action-items"),
      summary.action_items,
      (a) => `
        <label class="action-item">
          <input type="checkbox">
          <span><b>${escapeHtml(a.owner || "Unspecified")}</b> — ${escapeHtml(a.task)}${a.due ? `<span class="due">${escapeHtml(a.due)}</span>` : ""}</span>
        </label>`,
      "No action items mentioned."
    );
    fillCards(document.getElementById("key-points"), summary.key_points, (p) => `<p>${escapeHtml(p)}</p>`, "None captured.");

    renderTranscript(data.transcript, data.segments);

    results.classList.remove("hidden");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fillCards(container, items, template, emptyText) {
    container.innerHTML = "";
    if (!items || !items.length) {
      container.innerHTML = `<p class="mut">${emptyText}</p>`;
      return;
    }
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "board-card";
      card.innerHTML = template(item);
      container.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ---------- transcript + player ---------- */
  const toggleTranscriptBtn = document.getElementById("toggle-transcript-btn");
  const transcriptPanel = document.getElementById("transcript-panel");
  toggleTranscriptBtn.addEventListener("click", () => {
    transcriptPanel.classList.toggle("hidden");
    toggleTranscriptBtn.textContent = transcriptPanel.classList.contains("hidden")
      ? "📝 Show full transcript"
      : "📝 Hide transcript";
  });

  function renderTranscript(text, segments) {
    const player = document.getElementById("player");
    const body = document.getElementById("transcript-body");
    body.innerHTML = "";

    if (currentMediaFile) {
      player.src = URL.createObjectURL(currentMediaFile);
      player.classList.remove("hidden");
    } else {
      player.classList.add("hidden");
    }

    if (segments && segments.length && currentMediaFile) {
      segments.forEach((seg) => {
        const line = document.createElement("div");
        line.className = "transcript-line";
        const time = document.createElement("button");
        time.type = "button";
        time.className = "transcript-time";
        time.textContent = formatTime(seg.start);
        time.addEventListener("click", () => {
          player.currentTime = seg.start;
          player.play();
        });
        const span = document.createElement("span");
        span.textContent = seg.text;
        line.appendChild(time);
        line.appendChild(span);
        body.appendChild(line);
      });
    } else {
      const p = document.createElement("p");
      p.textContent = text || "";
      body.appendChild(p);
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  /* ---------- markdown export ---------- */
  document.getElementById("export-md-btn").addEventListener("click", () => {
    if (!lastSummary) return;
    const lines = [];
    lines.push("## TL;DR", lastSummary.tldr || "", "");
    lines.push("## Key points", ...(lastSummary.key_points || []).map((p) => `- ${p}`), "");
    lines.push(
      "## Action items",
      ...(lastSummary.action_items || []).map(
        (a) => `- [ ] ${a.task} (${a.owner || "unspecified"}${a.due ? `, due ${a.due}` : ""})`
      ),
      ""
    );
    lines.push("## Decisions", ...(lastSummary.decisions || []).map((d) => `- ${d}`));
    const md = lines.join("\n");
    navigator.clipboard.writeText(md);

    const btn = document.getElementById("export-md-btn");
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = original), 1500);
  });

  /* ---------- health meter ---------- */
  function animateHealth(target, label) {
    const fill = document.getElementById("meter-fill");
    const valueEl = document.getElementById("health-value");
    document.getElementById("health-label").textContent = label;
    const circumference = 2 * Math.PI * 52;
    fill.style.strokeDasharray = `${circumference} ${circumference}`;

    let current = 0;
    const duration = 700;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      current = Math.round(progress * target);
      const offset = circumference - (current / 100) * circumference;
      fill.style.strokeDashoffset = offset;
      valueEl.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
    }
    fill.style.strokeDashoffset = circumference;
    requestAnimationFrame(step);
  }

  /* ---------- confetti ---------- */
  function confettiBurst() {
    const colors = ["#10b981", "#38bdf8", "#facc15", "#f472b6"];
    for (let i = 0; i < 36; i++) {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.left = Math.random() * 100 + "vw";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = Math.random() * 1.2 + 1.4 + "s";
      el.style.animationDelay = Math.random() * 0.25 + "s";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }
})();
