document.addEventListener("DOMContentLoaded", async () => {
  // =========================
  // 1) Inject modal HTML
  // =========================
  const res = await fetch("modals/io-modal.html");
  const html = await res.text();
  document.body.insertAdjacentHTML("beforeend", html);

  // =========================
  // 2) Elements (after injection)
  // =========================
  const openBtn = document.getElementById("internalOrderBtn");
  const modal = document.getElementById("ioModal");
  const backdrop = document.getElementById("ioBackdrop");
  const closeBtn = document.getElementById("ioClose");
  const cancelBtn = document.getElementById("ioCancel");
  const search = document.getElementById("ioSearch");
  const tbody = document.getElementById("ioTableBody");
  const scrollWrap = modal?.querySelector(".io-scroll");

  // Excel UI (must exist in your io-modal.html)
  const fileInput = document.getElementById("ioExcelFile");
  const clearBtn = document.getElementById("ioClearData");
  const fileHint = document.getElementById("ioFileHint");

  // Optional UI to choose start row (must exist if you want a textbox)
  // Add in modal HTML:
  // <input id="ioStartRow" type="number" min="1" value="3" />
  const startRowInput = document.getElementById("ioStartRow");

  if (
    !openBtn ||
    !modal ||
    !backdrop ||
    !closeBtn ||
    !cancelBtn ||
    !search ||
    !tbody ||
    !scrollWrap
  ) {
    console.warn("IO Modal: missing required elements.");
    return;
  }
  if (!fileInput) {
    console.warn("IO Modal: missing #ioExcelFile input in modal.");
  }

  // =========================
  // 3) State
  // =========================
  let rows = []; // table rows to render (including "-" rows)

  // Your Excel headers
  const COLMAP = {
    io: ["Internal Order Number"],
    desc: ["Internal Order Description"],
    budget: ["Sum of Q3 Budget"],
    openpo: ["Sum of Q3 Open PO"],
    invoiced: ["Sum of Q3 Invoiced"],
    inflight: ["Sum of Q3 Inflight PO"],
    exceptions: ["Sum of Q3 Exceptions"],
    committed: ["Sum of Q3 Committed"],
    remaining: ["Sum of Q3 Remaining Balance"],
    pct: ["Q3 Committed %"],
    checkpoint: ["Check Point"],
  };

  // =========================
  // 4) Helpers
  // =========================
  const norm = (s) =>
    String(s ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  function pickCol(obj, candidates) {
    const keys = Object.keys(obj);
    for (const c of candidates) {
      const target = norm(c);
      const found = keys.find((k) => norm(k) === target);
      if (found) return obj[found];
    }
    return "";
  }

  // Show "-" for empty
  const toDash = (v) => {
    const s = String(v ?? "").trim();
    return s === "" ? "-" : s;
  };

  function cleanMoneyLike(v) {
    const s = String(v ?? "").trim();
    if (s === "" || s === "-") return "-";
    const raw = s.replace(/,/g, "").replace(/\s+/g, "");
    if (raw !== "" && !Number.isNaN(Number(raw)))
      return Number(raw).toLocaleString();
    return s;
  }

  function cleanPercent(v) {
    const s = String(v ?? "").trim();
    if (s === "" || s === "-") return "-";
    if (s.includes("%")) return s;
    const raw = s.replace(/\s+/g, "");
    if (raw !== "" && !Number.isNaN(Number(raw))) return `${Number(raw)}%`;
    return s;
  }

  // AOA row emptiness (all cells empty)
  function isEmptyAoaRow(row) {
    return (row || []).every((cell) => String(cell ?? "").trim() === "");
  }

  // Map an AOA row (by index) into your row shape.
  // If a column is missing, show "-"
  function mapAoaRowToTableRow(row, headerIndexMap) {
    const get = (key) => {
      const idx = headerIndexMap[key];
      if (typeof idx !== "number") return "";
      return row[idx] ?? "";
    };

    // Keep "-" visible everywhere
    return {
      group: false,
      io: toDash(get("io")),
      desc: toDash(get("desc")),
      budget: cleanMoneyLike(get("budget")),
      openpo: cleanMoneyLike(get("openpo")),
      invoiced: cleanMoneyLike(get("invoiced")),
      inflight: cleanMoneyLike(get("inflight")),
      exceptions: cleanMoneyLike(get("exceptions")),
      committed: cleanMoneyLike(get("committed")),
      remaining: cleanMoneyLike(get("remaining")),
      pct: cleanPercent(get("pct")),
      checkpoint: toDash(get("checkpoint")),
    };
  }

  // Build a header->index map from a header row (AOA)
  function buildHeaderIndexMap(headerRow) {
    const headers = (headerRow || []).map((h) => String(h ?? ""));
    const map = {};

    const findIndex = (candidates) => {
      const targetSet = new Set(candidates.map(norm));
      for (let i = 0; i < headers.length; i++) {
        if (targetSet.has(norm(headers[i]))) return i;
      }
      return -1;
    };

    map.io = findIndex(COLMAP.io);
    map.desc = findIndex(COLMAP.desc);
    map.budget = findIndex(COLMAP.budget);
    map.openpo = findIndex(COLMAP.openpo);
    map.invoiced = findIndex(COLMAP.invoiced);
    map.inflight = findIndex(COLMAP.inflight);
    map.exceptions = findIndex(COLMAP.exceptions);
    map.committed = findIndex(COLMAP.committed);
    map.remaining = findIndex(COLMAP.remaining);
    map.pct = findIndex(COLMAP.pct);
    map.checkpoint = findIndex(COLMAP.checkpoint);

    return map;
  }

  // Detect header row by looking for "Internal Order Number"
  function detectHeaderRowIndex(aoa) {
    const needle = norm("Internal Order Number");
    for (let i = 0; i < aoa.length; i++) {
      const row = aoa[i] || [];
      if (row.some((cell) => norm(cell) === needle)) return i;
    }
    return -1;
  }

  /**
   * Parse sheet with:
   * - user chooses start row (Excel row number, 1-based)
   * - end when there are 3 consecutive EMPTY rows (all cells empty)
   * - display ALL rows, even if values are missing (show "-")
   */
  function parseSheet(ws, startExcelRowNumber) {
    // Read as array-of-arrays
    const aoa = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: true,
    });

    // Find header row automatically
    const headerIdx = detectHeaderRowIndex(aoa);
    if (headerIdx === -1) {
      throw new Error(
        'Header row not found. Expected "Internal Order Number".'
      );
    }

    const headerMap = buildHeaderIndexMap(aoa[headerIdx]);

    // Require at least IO + Desc columns (or you’ll have unusable table)
    if (headerMap.io === -1 || headerMap.desc === -1) {
      throw new Error(
        "Could not match required headers. Ensure the sheet includes Internal Order Number and Internal Order Description."
      );
    }

    // Determine where to start reading data:
    // - User chooses start row (Excel row number)
    // - But never start above header row + 1 (data should be below header row)
    const minDataStart = headerIdx + 1; // 0-based index
    const userStartIdx = Math.max(0, (Number(startExcelRowNumber) || 1) - 1); // excel row -> 0-based
    let dataStartIdx = Math.max(minDataStart, userStartIdx);

    const out = [];
    let emptyRun = 0;

    for (let r = dataStartIdx; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const empty = isEmptyAoaRow(row);

      if (empty) {
        emptyRun += 1;
      } else {
        emptyRun = 0;
      }

      // Stop when 3 consecutive empty rows are reached
      if (emptyRun >= 3) break;

      // Push row EVEN IF empty (show "-") — but only up to the stop condition above
      out.push(mapAoaRowToTableRow(row, headerMap));
    }

    return out;
  }

  // =========================
  // 5) Sticky frozen column offsets
  // =========================
  function syncFrozenOffsets() {
    const th1 = modal.querySelector("thead th.sticky-col-1");
    if (!th1) return;
    const w1 = Math.round(th1.getBoundingClientRect().width);
    scrollWrap.style.setProperty("--io-col1", w1 + "px");
  }

  // =========================
  // 6) Render
  // =========================
  function render(data) {
    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td class="excel-td" colspan="11" style="text-align:center; padding:24px;">
            No data loaded. Upload an Excel file to display results.
          </td>
        </tr>
      `;
      requestAnimationFrame(syncFrozenOffsets);
      return;
    }

    tbody.innerHTML = data
      .map((r) => {
        const trClass = [
          "excel-zebra",
          r.group ? "excel-group" : "",
          "cursor-pointer",
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <tr class="${trClass}" data-io="${r.io || ""}">
            <td class="excel-td sticky-col-1">${r.io}</td>
            <td class="excel-td sticky-col-2">${r.desc}</td>
            <td class="excel-td text-right">${r.budget}</td>
            <td class="excel-td text-right">${r.openpo}</td>
            <td class="excel-td text-right">${r.invoiced}</td>
            <td class="excel-td text-right">${r.inflight}</td>
            <td class="excel-td text-right">${r.exceptions}</td>
            <td class="excel-td text-right">${r.committed}</td>
            <td class="excel-td text-right font-semibold">${r.remaining}</td>
            <td class="excel-td text-right">${r.pct}</td>
            <td class="excel-td">${r.checkpoint}</td>
          </tr>
        `;
      })
      .join("");

    requestAnimationFrame(syncFrozenOffsets);
  }

  // =========================
  // 7) Modal open/close
  // =========================
  function openModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    scrollWrap.scrollTop = 0;
    scrollWrap.scrollLeft = 0;
    search.value = "";

    render(rows);

    requestAnimationFrame(() => {
      syncFrozenOffsets();
      search.focus();
    });
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  // =========================
  // 8) Events
  // =========================
  openBtn.addEventListener("click", openModal);
  backdrop.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });

  scrollWrap.addEventListener("scroll", syncFrozenOffsets);

  window.addEventListener("resize", () => {
    if (!modal.classList.contains("hidden")) syncFrozenOffsets();
  });

  // Search filters currently loaded rows
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    if (!q) return render(rows);

    const filtered = rows.filter((r) => {
      const hay = `${r.io} ${r.desc} ${r.checkpoint}`.toLowerCase();
      return hay.includes(q);
    });

    render(filtered);
  });

  // Row click -> set selection (ignore "-" IO)
  tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;

    const io = tr.getAttribute("data-io") || "";
    if (!io || io === "-") return;

    openBtn.textContent = io;
    closeModal();
  });

  // =========================
  // 9) Excel upload
  // =========================
  fileInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // User chooses which Excel row to start displaying (1-based)
      // Default: 3 (common when you have two header rows)
      const startRow = startRowInput ? Number(startRowInput.value || 3) : 3;

      rows = parseSheet(ws, startRow);

      search.value = "";
      render(rows);

      if (fileHint) {
        fileHint.textContent = `Loaded: ${file.name} (${rows.length} rows) | Start row: ${startRow}`;
      }
    } catch (err) {
      console.error(err);
      alert(
        "Failed to read the Excel file. Make sure the sheet contains 'Internal Order Number' header."
      );
      if (fileHint)
        fileHint.textContent = "Upload an Excel file to populate the table.";
    }
  });

  // Clear dataset
  clearBtn?.addEventListener("click", () => {
    rows = [];
    search.value = "";
    render(rows);
    if (fileInput) fileInput.value = "";
    if (fileHint)
      fileHint.textContent = "Upload an Excel file to populate the table.";
  });

  // Initial empty state
  render(rows);
});
