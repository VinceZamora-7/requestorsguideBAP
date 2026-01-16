// /js/io-excel-utils.js
// Requires SheetJS loaded first:
// <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>

(function () {
  // =========================
  // CONFIG (EDIT THESE)
  // =========================
  const CONFIG = {
    // Rows you want to DISPLAY (Excel row numbers are 1-based)
    displayRange: { startRow: 3, endRow: null }, // endRow: null = auto

    // If you want to stop rendering after N consecutive empty rows (in mapped columns)
    // Set to Infinity to never stop early during rendering
    stopAfterEmptyRun: Infinity,

    // ✅ Performance + reliability
    // Only read needed columns, then detect last row by scanning down.
    rangeMinCol: "F", // first needed column (F in your sheet)
    rangeMaxCol: "P", // last needed column (P in your sheet)
    maxEmptyRunToFindEnd: 50, // auto-detect end: stop scanning after 50 empty rows
    maxRowsHardCap: 20000, // safety cap so huge files don't freeze the page
    endRowBuffer: 200, // buffer beyond used range (helps when !ref is short)

    // Column letter mapping
    col: {
      io: "F",
      desc: "G",
      budget: "H",
      openpo: "I",
      invoiced: "J",
      inflight: "K",
      exceptions: "L",
      committed: "M",
      remaining: "N",
      pct: "O",
      checkpoint: "P",
    },
  };

  // =========================
  // Formatting helpers
  // =========================
  const toDash = (v) => {
    // treat 0 and "0" as dash
    if (v === 0) return "-";
    const s = String(v ?? "").trim();
    if (s === "" || s === "0") return "-";
    return s;
  };

  function cleanMoneyLike(v) {
    const s = String(v ?? "").trim();
    if (s === "" || s === "-" || s === "0") return "-";
    const raw = s.replace(/,/g, "").replace(/\s+/g, "");
    if (raw !== "" && !Number.isNaN(Number(raw))) {
      const n = Number(raw);
      return n === 0 ? "-" : n.toLocaleString();
    }
    return s;
  }

  function cleanPercent(v) {
    const s = String(v ?? "").trim();
    if (s === "" || s === "-" || s === "0") return "-";
    if (s.includes("%")) return s === "0%" ? "-" : s;
    const raw = s.replace(/\s+/g, "");
    if (raw !== "" && !Number.isNaN(Number(raw))) {
      const n = Number(raw);
      return n === 0 ? "-" : `${n}%`;
    }
    return s;
  }

  // =========================
  // Excel helpers
  // =========================
  function colLetterToIndex(letter) {
    let n = 0;
    const s = String(letter || "")
      .toUpperCase()
      .trim();
    for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1; // 0-based
  }

  function pickLargestSheet(wb) {
    let bestName = wb.SheetNames[0];
    let bestRows = -1;

    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const ref = ws && ws["!ref"];
      if (!ref) continue;

      const range = XLSX.utils.decode_range(ref);
      const rows = range.e.r - range.s.r + 1;
      if (rows > bestRows) {
        bestRows = rows;
        bestName = name;
      }
    }
    return wb.Sheets[bestName];
  }

  function isRowEmptyByCols(rowArr, colIdxs) {
    return colIdxs.every((idx) => String(rowArr?.[idx] ?? "").trim() === "");
  }

  function mapRowArrayToTableRow(rowArr, idx) {
    const get = (key) => rowArr?.[idx[key]] ?? "";
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

  // =========================
  // Fast + reliable parser
  // - Reads only needed columns (F..P)
  // - Detects end row by scanning empty runs
  // - Returns JSON (aoa) + tableRows
  // =========================
  async function excelFileToIoJson(file, cfg = CONFIG) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const ws = pickLargestSheet(wb);

    const startRow = Math.max(1, Number(cfg.displayRange?.startRow) || 1); // 1-based
    const startColIdx = colLetterToIndex(cfg.rangeMinCol || cfg.col.io); // F
    const endColIdx = colLetterToIndex(cfg.rangeMaxCol || "P"); // P

    // Used range end row (often wrong / too short)
    const baseRef = ws["!ref"] || "A1";
    const baseRange = XLSX.utils.decode_range(baseRef);
    const usedEndRow1 = baseRange.e.r + 1; // 1-based

    // Guess end row: used end + small buffer, then hard cap
    const hardCap = Number(cfg.maxRowsHardCap) || 20000;
    const buffer = Number(cfg.endRowBuffer) || 200;

    let endRowGuess = Math.max(usedEndRow1 + buffer, startRow);
    endRowGuess = Math.min(endRowGuess, startRow + hardCap - 1);

    // Read only the needed range (F..P and rows startRow..endRowGuess)
    const range = {
      s: { r: startRow - 1, c: startColIdx },
      e: { r: endRowGuess - 1, c: endColIdx },
    };

    let aoa = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: true,
      range,
    });

    // Indices relative to the read range (since we start at column F)
    const keys = Object.keys(cfg.col);
    const usedIdxsRel = keys.map(
      (k) => colLetterToIndex(cfg.col[k]) - startColIdx
    );

    // Detect the real last data row by scanning for empty runs
    const maxEmptyRun = Number(cfg.maxEmptyRunToFindEnd ?? 50);
    let emptyRun = 0;
    let lastNonEmpty = -1;

    for (let i = 0; i < aoa.length; i++) {
      const rowArr = aoa[i] || [];
      const empty = isRowEmptyByCols(rowArr, usedIdxsRel);

      if (empty) emptyRun++;
      else {
        emptyRun = 0;
        lastNonEmpty = i;
      }

      if (emptyRun >= maxEmptyRun) break;
    }

    // Keep up to lastNonEmpty (if everything empty, keep 0 rows)
    const finalLen = Math.max(0, Math.min(aoa.length, lastNonEmpty + 1));
    aoa = aoa.slice(0, finalLen);

    // Build JSON source-of-truth
    const ioExcelJson = {
      aoa, // ONLY columns F..P, ONLY rows starting at startRow
      meta: {
        fileName: file.name,
        parsedAt: new Date().toISOString(),
        sheetRefOriginal: baseRef,
        note: "AOA limited to needed columns + detected end",
        startRow,
        rangeMinCol: cfg.rangeMinCol,
        rangeMaxCol: cfg.rangeMaxCol,
      },
    };

    // Build mapping indices (relative to the F..P range)
    const idxRel = {};
    for (const k of keys)
      idxRel[k] = colLetterToIndex(cfg.col[k]) - startColIdx;

    // Enforce endRow if user provided it (absolute Excel row number)
    let maxRows = aoa.length;
    if (cfg.displayRange?.endRow != null) {
      const endRow = Number(cfg.displayRange.endRow);
      maxRows = Math.min(maxRows, Math.max(0, endRow - startRow + 1));
    }

    // Build tableRows
    const tableRows = [];
    let stopEmpty = 0;

    for (let i = 0; i < maxRows; i++) {
      const rowArr = aoa[i] || [];
      const empty = isRowEmptyByCols(rowArr, usedIdxsRel);

      if (empty) stopEmpty++;
      else stopEmpty = 0;

      if (stopEmpty >= (cfg.stopAfterEmptyRun ?? Infinity)) break;

      tableRows.push(mapRowArrayToTableRow(rowArr, idxRel));
    }

    return { ioExcelJson, tableRows };
  }

  // =========================
  // Expose globally
  // =========================
  window.IoExcelUtils = {
    CONFIG,
    toDash,
    cleanMoneyLike,
    cleanPercent,
    colLetterToIndex,
    pickLargestSheet,
    isRowEmptyByCols,
    mapRowArrayToTableRow,
    excelFileToIoJson,
  };
})();
