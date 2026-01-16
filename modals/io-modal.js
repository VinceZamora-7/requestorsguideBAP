// /js/io-modal.js
document.addEventListener("DOMContentLoaded", async () => {
  // Inject modal HTML
  const res = await fetch("modals/io-modal.html");
  const html = await res.text();
  document.body.insertAdjacentHTML("beforeend", html);

  // Elements
  const openBtn = document.getElementById("internalOrderBtn");
  const modal = document.getElementById("ioModal");
  const backdrop = document.getElementById("ioBackdrop");
  const closeBtn = document.getElementById("ioClose");
  const cancelBtn = document.getElementById("ioCancel");
  const search = document.getElementById("ioSearch");
  const tbody = document.getElementById("ioTableBody");
  const scrollWrap = modal?.querySelector(".io-scroll");

  const fileInput = document.getElementById("ioExcelFile");
  const clearBtn = document.getElementById("ioClearData");
  const fileHint = document.getElementById("ioFileHint");

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

  // ✅ Ensure utils loaded
  if (!window.IoExcelUtils) {
    console.error(
      "IoExcelUtils not found. Make sure io-excel-utils.js loads BEFORE io-modal.js"
    );
    return;
  }

  // You can edit config here (optional)
  const CFG = window.IoExcelUtils.CONFIG;

  // State
  let ioExcelJson = null;
  let tableRows = [];

  // Sticky columns
  function syncFrozenOffsets() {
    const th1 = modal.querySelector("thead th.sticky-col-1");
    if (!th1) return;
    const w1 = Math.round(th1.getBoundingClientRect().width);
    scrollWrap.style.setProperty("--io-col1", w1 + "px");
  }

  // Render
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
      .map(
        (r) => `
        <tr class="excel-zebra cursor-pointer" data-io="${r.io || ""}">
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
      `
      )
      .join("");

    requestAnimationFrame(syncFrozenOffsets);
  }

  // Modal open/close
  function openModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    scrollWrap.scrollTop = 0;
    scrollWrap.scrollLeft = 0;
    search.value = "";
    render(tableRows);
    requestAnimationFrame(() => {
      syncFrozenOffsets();
      search.focus();
    });
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  // Events
  openBtn.addEventListener("click", openModal);
  backdrop.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });

  scrollWrap.addEventListener("scroll", syncFrozenOffsets);
  window.addEventListener(
    "resize",
    () => !modal.classList.contains("hidden") && syncFrozenOffsets()
  );

  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    if (!q) return render(tableRows);
    render(
      tableRows.filter((r) =>
        `${r.io} ${r.desc} ${r.checkpoint}`.toLowerCase().includes(q)
      )
    );
  });

  tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const io = tr.getAttribute("data-io") || "";
    if (!io || io === "-") return;
    openBtn.textContent = io;
    closeModal();
  });

  // Upload
  fileInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (fileHint) fileHint.textContent = "Reading file...";

      const result = await window.IoExcelUtils.excelFileToIoJson(file, CFG);
      ioExcelJson = result.ioExcelJson;
      tableRows = result.tableRows;

      render(tableRows);
      search.value = "";

      const endTxt =
        CFG.displayRange.endRow == null ? "end" : CFG.displayRange.endRow;
      if (fileHint) {
        fileHint.textContent = `Loaded: ${file.name} | Rows shown: ${tableRows.length} | Range: ${CFG.displayRange.startRow} → ${endTxt}`;
      }

      window.ioExcelJson = ioExcelJson;
      console.log("ioExcelJson:", ioExcelJson);
    } catch (err) {
      console.error(err);
      ioExcelJson = null;
      tableRows = [];
      render(tableRows);
      alert("Failed to read the Excel file.");
      if (fileHint)
        fileHint.textContent = "Upload an Excel file to populate the table.";
    }
  });

  // Clear
  clearBtn?.addEventListener("click", () => {
    ioExcelJson = null;
    tableRows = [];
    search.value = "";
    render(tableRows);
    if (fileInput) fileInput.value = "";
    if (fileHint)
      fileHint.textContent = "Upload an Excel file to populate the table.";
    window.ioExcelJson = null;
  });

  render(tableRows);
});
