// /js/io-excel-utils.js
// Requires SheetJS loaded first:
// <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>

(function () {
  // =========================
  // CONFIG (EDIT THESE)
  // =========================
  const CONFIG = {
    displayRange: { startRow: 3, endRow: null },
    stopAfterEmptyRun: Infinity,

    // Performance + reliability
    rangeMinCol: "F",
    rangeMaxCol: "P",
    maxEmptyRunToFindEnd: 50,
    maxRowsHardCap: 20000,
    endRowBuffer: 200,

    // Column letter mapping (your sheet)
    col: {
      io: "F",
      desc: "G",
      budget: "H", // H
      openpo: "I",
      invoiced: "J",
      inflight: "K",
      exceptions: "L",
      committed: "M", // M
      remaining: "N",
      pct: "O", // (we will IGNORE this and compute pct from M/H)
      checkpoint: "P",
    },
  };

  // =========================
  // Formatting helpers
  // =========================
  const toDash = (v) => {
    if (v === 0) return "-";
    const s = String(v ?? "").trim();
    if (s === "" || s === "0") return "-";
    return s;
  };

  function parseNumber(v) {
    if (v === null || v === undefined) return null;

    // If already a number
    if (typeof v === "number") return Number.isFinite(v) ? v : null;

    const s0 = String(v).trim();
    if (s0 === "" || s0 === "-" || s0 === "0") return 0;

    // Remove commas/spaces
    const s = s0.replace(/,/g, "").replace(/\s+/g, "");

    // Strip trailing percent sign if present (we want numeric)
    const sNoPct = s.endsWith("%") ? s.slice(0, -1) : s;

    const n = Number(sNoPct);
    return Number.isFinite(n) ? n : null;
  }

  function cleanMoneyLike(v) {
    const n = parseNumber(v);
    if (n === null) return toDash(v);
    if (n === 0) return "-";
    return n.toLocaleString();
  }

  function computePercentFromCommittedAndBudget(committedVal, budgetVal) {
    const committed = parseNumber(committedVal);
    const budget = parseNumber(budgetVal);

    // If budget is missing/0, can't divide
    if (!budget || budget === 0) return "-";

    // If committed missing/0, show dash
    if (!committed || committed === 0) return "-";

    const pct = (committed / budget) * 100;

    // Format nicely: drop trailing .0
    const rounded = Math.round(pct);
    return `${rounded}%`;
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
    return n - 1;
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

  // ✅ pct computed from committed/budget (M/H)
  function mapRowArrayToTableRow(rowArr, idx) {
    const get = (key) => rowArr?.[idx[key]] ?? "";

    const budgetRaw = get("budget");
    const committedRaw = get("committed");

    return {
      group: false,
      io: toDash(get("io")),
      desc: toDash(get("desc")),
      budget: cleanMoneyLike(budgetRaw),
      openpo: cleanMoneyLike(get("openpo")),
      invoiced: cleanMoneyLike(get("invoiced")),
      inflight: cleanMoneyLike(get("inflight")),
      exceptions: cleanMoneyLike(get("exceptions")),
      committed: cleanMoneyLike(committedRaw),
      remaining: cleanMoneyLike(get("remaining")),

      // IMPORTANT: ignore column O and compute:
      pct: computePercentFromCommittedAndBudget(committedRaw, budgetRaw),

      checkpoint: toDash(get("checkpoint")),
    };
  }

  // =========================
  // Fast parser
  // =========================
  async function excelFileToIoJson(file, cfg = CONFIG) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const ws = pickLargestSheet(wb);

    const startRow = Math.max(1, Number(cfg.displayRange?.startRow) || 1);
    const startColIdx = colLetterToIndex(cfg.rangeMinCol || cfg.col.io);
    const endColIdx = colLetterToIndex(cfg.rangeMaxCol || "P");

    const baseRef = ws["!ref"] || "A1";
    const baseRange = XLSX.utils.decode_range(baseRef);
    const usedEndRow1 = baseRange.e.r + 1;

    const hardCap = Number(cfg.maxRowsHardCap) || 20000;
    const buffer = Number(cfg.endRowBuffer) || 200;

    let endRowGuess = Math.max(usedEndRow1 + buffer, startRow);
    endRowGuess = Math.min(endRowGuess, startRow + hardCap - 1);

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

    const keys = Object.keys(cfg.col);
    const usedIdxsRel = keys.map(
      (k) => colLetterToIndex(cfg.col[k]) - startColIdx
    );

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

    const finalLen = Math.max(0, Math.min(aoa.length, lastNonEmpty + 1));
    aoa = aoa.slice(0, finalLen);

    const ioExcelJson = {
      aoa,
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

    const idxRel = {};
    for (const k of keys)
      idxRel[k] = colLetterToIndex(cfg.col[k]) - startColIdx;

    let maxRows = aoa.length;
    if (cfg.displayRange?.endRow != null) {
      const endRow = Number(cfg.displayRange.endRow);
      maxRows = Math.min(maxRows, Math.max(0, endRow - startRow + 1));
    }

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
    colLetterToIndex,
    pickLargestSheet,
    isRowEmptyByCols,
    mapRowArrayToTableRow,
    excelFileToIoJson,
  };
})();
