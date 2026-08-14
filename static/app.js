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

  let currentMediaFile = null;
  let lastSummary = null;

  /* ---------- mouse-follow glow ---------- */
  document.addEventListener("mousemove", (e) => {
    document.documentElement.style.setProperty("--mx", e.clientX + "px");
    document.documentElement.style.setProperty("--my", e.clientY + "px");
  });

  /* ---------- tabs (input source) ---------- */
  document.querySelectorAll(".tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const group = tab.closest(".tabs");
      group.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      if (tab.dataset.tab) {
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
        document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.remove("hidden");
      }
    });
  });

  /* ---------- results view toggle ---------- */
  document.querySelectorAll(".view-toggle .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".view-toggle .tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".view-panel").forEach((p) => p.classList.add("hidden"));
      document.querySelector(`.view-panel[data-view-panel="${tab.dataset.view}"]`).classList.remove("hidden");
      if (tab.dataset.view === "mindmap") requestAnimationFrame(() => window.__drawMindmapLines && window.__drawMindmapLines());
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
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); })
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
    document.querySelectorAll(".steps .step").forEach((s) => {
      const step = parseInt(s.dataset.step, 10);
      s.classList.toggle("active", step === n);
      s.classList.toggle("done", step < n);
    });
  }

  /* ---------- submit ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
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
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ---------- results ---------- */
  function renderResults(data) {
    const summary = data.summary;

    animateHealth(summary.health.score, summary.health.label);
    updateFloatingBadge(summary.health.score);
    updateMoodOrb(summary.health);
    document.getElementById("tldr").textContent = summary.tldr || "—";

    renderCorkboard(summary);
    renderMindmap(summary);
    renderScrubber(data.segments);
    renderTranscript(data.transcript, data.segments);

    results.classList.remove("hidden");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- draggable helper (container-relative) ---------- */
  function makeCardDraggable(el, onMove) {
    let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
    const start = (x, y) => {
      dragging = true;
      startX = x; startY = y;
      origLeft = el.offsetLeft; origTop = el.offsetTop;
      el.classList.add("dragging");
      el.style.zIndex = 50;
    };
    const move = (x, y) => {
      if (!dragging) return;
      el.style.left = origLeft + (x - startX) + "px";
      el.style.top = origTop + (y - startY) + "px";
      if (onMove) onMove();
    };
    const end = () => {
      dragging = false;
      el.classList.remove("dragging");
      el.style.zIndex = "";
    };
    el.addEventListener("mousedown", (e) => { start(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", end);
    el.addEventListener("touchstart", (e) => start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener("touchmove", (e) => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener("touchend", end);
  }

  function summaryItems(summary) {
    return [
      ...(summary.decisions || []).map((d) => ({ type: "decision", text: d })),
      ...(summary.action_items || []).map((a) => ({
        type: "action",
        text: `${a.owner || "Unspecified"} — ${a.task}${a.due ? ` (${a.due})` : ""}`,
      })),
      ...(summary.key_points || []).map((p) => ({ type: "point", text: p })),
    ];
  }

  /* ---------- corkboard ---------- */
  function renderCorkboard(summary) {
    const board = document.getElementById("corkboard");
    board.innerHTML = "";
    const items = summaryItems(summary);
    if (!items.length) {
      board.innerHTML = '<p class="mut">Nothing captured to pin up.</p>';
      return;
    }
    const cols = 3;
    items.forEach((item, i) => {
      const card = document.createElement("div");
      card.className = `cork-card cork-${item.type}`;
      card.textContent = item.text;
      const col = i % cols, row = Math.floor(i / cols);
      card.style.left = 16 + col * 220 + (Math.random() * 16 - 8) + "px";
      card.style.top = 16 + row * 110 + (Math.random() * 16 - 8) + "px";
      card.style.setProperty("--tilt", Math.random() * 6 - 3 + "deg");
      board.appendChild(card);
      makeCardDraggable(card);
    });
    board.style.minHeight = Math.max(40 + Math.ceil(items.length / cols) * 110, 220) + "px";
  }

  /* ---------- mind map ---------- */
  function renderMindmap(summary) {
    const container = document.getElementById("mindmap");
    const svg = document.getElementById("mindmap-lines");
    container.querySelectorAll(".mm-node:not(.mm-center)").forEach((n) => n.remove());

    const items = summaryItems(summary);
    const cx = container.clientWidth / 2 || 200;
    const cy = container.clientHeight / 2 || 200;
    const radius = Math.max(Math.min(cx, cy) - 70, 60);
    const n = items.length || 1;
    const nodes = [];

    items.forEach((item, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      const node = document.createElement("div");
      node.className = `mm-node mm-${item.type}`;
      node.textContent = item.text.length > 56 ? item.text.slice(0, 53) + "…" : item.text;
      node.title = item.text;
      node.style.left = x + "px";
      node.style.top = y + "px";
      container.appendChild(node);
      nodes.push(node);
      makeCardDraggable(node, drawMindmapLines);
    });

    function drawMindmapLines() {
      const center = document.getElementById("mm-center");
      const containerRect = container.getBoundingClientRect();
      const cRect = center.getBoundingClientRect();
      const ccx = cRect.left + cRect.width / 2 - containerRect.left;
      const ccy = cRect.top + cRect.height / 2 - containerRect.top;
      let html = "";
      nodes.forEach((node) => {
        const r = node.getBoundingClientRect();
        const nx = r.left + r.width / 2 - containerRect.left;
        const ny = r.top + r.height / 2 - containerRect.top;
        html += `<line x1="${ccx}" y1="${ccy}" x2="${nx}" y2="${ny}" class="mm-line"/>`;
      });
      svg.innerHTML = html;
    }
    window.__drawMindmapLines = drawMindmapLines;
    requestAnimationFrame(drawMindmapLines);
  }

  /* ---------- scrubber ---------- */
  function renderScrubber(segments) {
    const scrubber = document.getElementById("scrubber");
    const track = document.getElementById("scrubber-track");
    const playhead = document.getElementById("scrubber-playhead");
    const player = document.getElementById("player");

    if (!segments || !segments.length || !currentMediaFile) {
      scrubber.classList.add("hidden");
      return;
    }
    scrubber.classList.remove("hidden");
    player.src = URL.createObjectURL(currentMediaFile);
    player.classList.remove("hidden");

    const duration = segments[segments.length - 1].end || 1;
    track.querySelectorAll(".scrubber-tick").forEach((t) => t.remove());
    segments.forEach((seg) => {
      const tick = document.createElement("div");
      tick.className = "scrubber-tick";
      tick.style.left = (seg.start / duration) * 100 + "%";
      tick.title = seg.text;
      tick.addEventListener("click", (e) => {
        e.stopPropagation();
        player.currentTime = seg.start;
        player.play();
      });
      track.appendChild(tick);
    });

    function seekFromEvent(e) {
      const rect = track.getBoundingClientRect();
      const frac = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      player.currentTime = frac * duration;
      playhead.style.left = frac * 100 + "%";
    }
    let draggingPlayhead = false;
    playhead.onmousedown = () => (draggingPlayhead = true);
    window.addEventListener("mousemove", (e) => { if (draggingPlayhead) seekFromEvent(e); });
    window.addEventListener("mouseup", () => (draggingPlayhead = false));
    track.onclick = seekFromEvent;
    player.ontimeupdate = () => {
      if (draggingPlayhead) return;
      playhead.style.left = (player.currentTime / duration) * 100 + "%";
    };
  }

  /* ---------- transcript ---------- */
  const toggleTranscriptBtn = document.getElementById("toggle-transcript-btn");
  const transcriptPanel = document.getElementById("transcript-panel");
  toggleTranscriptBtn.addEventListener("click", () => {
    transcriptPanel.classList.toggle("hidden");
    toggleTranscriptBtn.textContent = transcriptPanel.classList.contains("hidden")
      ? "📝 Show full transcript"
      : "📝 Hide transcript";
  });

  function renderTranscript(text, segments) {
    const body = document.getElementById("transcript-body");
    body.innerHTML = "";
    if (segments && segments.length) {
      segments.forEach((seg) => {
        const line = document.createElement("div");
        line.className = "transcript-line";
        line.innerHTML = `<span class="transcript-time-label">${formatTime(seg.start)}</span><span>${escapeHtml(seg.text)}</span>`;
        body.appendChild(line);
      });
    } else {
      body.textContent = text || "";
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
    navigator.clipboard.writeText(lines.join("\n"));
    flashCopied("export-md-btn", "📋 Copy as Markdown");
  });

  function flashCopied(id, original) {
    const btn = document.getElementById(id);
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = original), 1500);
  }

  /* ---------- floating draggable badge ---------- */
  function updateFloatingBadge(score) {
    let badge = document.getElementById("floating-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "floating-badge";
      badge.className = "floating-badge";
      document.body.appendChild(badge);
      makeViewportDraggable(badge);
    }
    badge.textContent = score;
  }
  function makeViewportDraggable(el) {
    let dragging = false, offsetX = 0, offsetY = 0;
    const start = (x, y) => {
      dragging = true;
      const rect = el.getBoundingClientRect();
      offsetX = x - rect.left;
      offsetY = y - rect.top;
      el.classList.add("dragging");
    };
    const move = (x, y) => {
      if (!dragging) return;
      el.style.left = x - offsetX + "px";
      el.style.top = y - offsetY + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    };
    const end = () => { dragging = false; el.classList.remove("dragging"); };
    el.addEventListener("mousedown", (e) => start(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", end);
    el.addEventListener("touchstart", (e) => start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener("touchmove", (e) => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener("touchend", end);
  }

  /* ---------- reactive mood orb ---------- */
  function updateMoodOrb(health) {
    let orb = document.getElementById("mood-orb");
    if (!orb) {
      orb = document.createElement("div");
      orb.id = "mood-orb";
      orb.className = "mood-orb";
      document.body.appendChild(orb);
    }
    const score = health.score;
    const lightness = 45 + score * 0.15;
    orb.style.background = `radial-gradient(circle at 35% 30%, hsl(330,90%,${lightness}%), hsl(280,80%,${Math.max(lightness - 20, 20)}%))`;
    orb.style.animationDuration = 2.6 - (score / 100) * 1.8 + "s";
    orb.title = health.label;
  }

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
    const colors = ["#EC4899", "#F472B6", "#C084FC", "#facc15"];
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
