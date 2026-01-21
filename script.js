document.addEventListener("DOMContentLoaded", () => {
  // ========================
  // HELPERS
  // ========================
  const $ = (id) => document.getElementById(id);

  const show = (el, display = "block") => {
    if (!el) return;
    el.style.display = display;
  };

  const hide = (el) => {
    if (!el) return;
    el.style.display = "none";
  };

  const debounce = (fn, delay = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  const formatWithCommas = (n) => {
    if (n === null || n === undefined || n === "") return "";
    const s = String(n);
    const [intPart, decPart] = s.split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart ? `${formattedInt}.${decPart}` : formattedInt;
  };

  const toNumber = (s) => {
    const cleaned = String(s ?? "")
      .replace(/,/g, "")
      .trim();
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
  };

  // ========================
  // DOM ELEMENTS
  // ========================
  const darkToggle = $("darkToggle");
  const container = $("rowsContainer");

  const countryDropdown = $("country");
  const categoryInput = $("categoryName");
  const categoryList = $("categoryList");

  const saveBtn = $("saveBtn");
  const refreshSidebar = $("refreshSidebar");

  const localCurrencyInput = $("localCurrency");
  const usdAmountInput = $("usdAmount");
  const localCurrencyContainer = $("localCurrencyContainer");
  const usdAmountContainer = $("usdAmountContainer");
  const currencyWrapper = $("currencyWrapper");

  const feedbackRow = $("feedback-row");
  const feedbackIcon = $("feedback-icon");
  const feedbackMessage = $("feedback-message");

  const govCheckbox = $("govOfficialCheckbox");

  const pcDropdown = $("pcInfo");
  const pcFeedbackRow = $("pc-feedback-row");
  const pcFeedbackIcon = $("pc-feedback-icon");
  const pcFeedbackMessage = $("pc-feedback-message");

  const collapseBtn = $("collapseBtn");
  const sidebar = document.querySelector(".sidebar");
  const content = document.querySelector(".content");

  // Guard (if page is incomplete)
  if (!container || !countryDropdown || !categoryInput || !categoryList) return;

  // ========================
  // DATA (MUST MATCH HTML option values)
  // ========================
  // Normalizes: removes spaces + tabs so "Brunei 1720" == "Brunei\t1720" == "Brunei1720"
  const normKey = (v) =>
    String(v ?? "")
      .replace(/\s+/g, "")
      .replace(/\t/g, "");

  const countryCurrencyMap = {
    Brunei1720: "BND",
    China1107: "CNY",
    HongKong1089: "HKD",
    Indonesia1046: "IDR",
    Japan1079: "JPY",
    Korea1056: "KRW",
    Malaysia1037: "MYR",
    Philippines1047: "PHP",
    Singapore1290: "SGD",
    Singapore1291: "SGD",
    Taiwan1058: "TWD",
    Thailand1021: "THB",
    Vietnam1714: "VND",

    // ✅ add this
    Myanmar1224: "MMK",
  };

  const currencyData = {
    BND: { rate: 0.7758253, precision: 7 },
    CNY: { rate: 0.13907, precision: 5 },
    HKD: { rate: 0.12757, precision: 5 },
    IDR: { rate: 0.00006139, precision: 8 },
    INR: { rate: 0.0117154, precision: 7 },
    JPY: { rate: 0.0069, precision: 5 },
    KRW: { rate: 0.000726665, precision: 9 },
    MMK: { rate: 0.0004762, precision: 7 },
    MYR: { rate: 0.23669, precision: 5 },
    PHP: { rate: 0.01802, precision: 5 },
    SGD: { rate: 0.77583, precision: 5 },
    THB: { rate: 0.03066, precision: 5 },
    TWD: { rate: 0.03343, precision: 5 },
    VND: { rate: 0.000038506, precision: 9 },
    MMK: { rate: 0.0004762, precision: 7 },
  };

  const rows = [
    "Microsoft Legal Entity Name",
    "Start Date",
    "SSPA Requirements",
    "TGH Approval",
    "Mandatory Document/Requirement",
    "Safe Approver",
    "MS Signatory",
    "Local Area Business Rule",
  ];

  const rowToColumnMap = {
    "Microsoft Legal Entity Name": "Microsoft_Legal_Entity_Name",
    "Start Date": "StartDatetext",
    "SSPA Requirements": "Supplier",
    "TGH Approval": "TGHApproval",
    "Mandatory Document/Requirement": "MandatoryDocsThreshold",
    "Safe Approver": "SafeApprover",
    "MS Signatory": "MSSignatory",
    "Local Area Business Rule": "BusinessJustification",
  };

  const iconLinks = {
    "TGH Approval":
      "https://apps.powerapps.com/play/e/2d348acc-9c71-48b0-875d-8dc6b6be961c/a/d5855fec-5c0f-40ba-8d4c-c8971f5aa083?&hidenavbar=true",
    "Safe Approver": "https://msauthorize.microsoft.com/#/home",
    "MS Signatory":
      "https://apps.powerapps.com/play/e/6001c084-a24e-ea83-88d7-7d2bd4f6410f/a/a0eb7e59-1410-4cfb-a097-13178603f059",
    "SSPA Requirements":
      "https://msit.powerbi.com/groups/me/apps/b0462f25-687a-4bdc-a2ff-aeaaaf24847f/reports/1ea75c26-ea3d-4418-a9d0-d92eb9b09efd/ReportSection4dbddf00c9e2db980242",
  };

  const elements = {}; // colId -> value element

  // ========================
  // TABLE HELPERS
  // ========================
  const findRowByLabel = (labelText) =>
    Array.from(container.children).find(
      (child) =>
        child.classList.contains("row") &&
        child.querySelector(".label")?.textContent.includes(labelText),
    );

  // ========================
  // COUNTRY/CURRENCY
  // ========================
  const getSelectedCurrency = () => {
    const key = normKey(countryDropdown.value);
    return countryCurrencyMap[key] || "USD";
  };

  // Track which field user last edited so we can recalc correctly on country change
  let lastAmountSource = null; // "local" | "usd" | null

  const setLocalCurrencyLabel = (text) => {
    if (!localCurrencyContainer) return;
    const img = localCurrencyContainer.querySelector("img");
    localCurrencyContainer.innerHTML = "";
    if (img) localCurrencyContainer.appendChild(img);
    if (text)
      localCurrencyContainer.insertAdjacentText("beforeend", ` ${text}`);
  };

  const enableCurrency = (enabled) => {
    if (!localCurrencyInput || !usdAmountInput || !currencyWrapper) return;

    localCurrencyInput.disabled = !enabled;
    usdAmountInput.disabled = !enabled;

    if (enabled) {
      currencyWrapper.classList.remove("disabled");
      currencyWrapper.removeAttribute("title");
      currencyWrapper.setAttribute("aria-disabled", "false");
    } else {
      localCurrencyInput.value = "";
      usdAmountInput.value = "";
      currencyWrapper.classList.add("disabled");
      currencyWrapper.setAttribute("title", "Choose a country first");
      currencyWrapper.setAttribute("aria-disabled", "true");
      lastAmountSource = null;
    }

    // Keep your icon and show currency text
    setLocalCurrencyLabel(enabled ? getSelectedCurrency() : "");
    if (usdAmountContainer) usdAmountContainer.textContent = "$";
  };

  const convertLocalToUSD = () => {
    const ccy = getSelectedCurrency();
    const meta = currencyData[ccy];
    const localVal = toNumber(localCurrencyInput?.value);

    if (localVal !== null && meta) {
      usdAmountInput.value = formatWithCommas(
        (localVal * meta.rate).toFixed(2),
      );
    } else {
      usdAmountInput.value = "";
    }

    checkApprovalRequirement();
  };

  const convertUSDToLocal = () => {
    const ccy = getSelectedCurrency();
    const meta = currencyData[ccy];
    const usdVal = toNumber(usdAmountInput?.value);

    if (usdVal !== null && meta) {
      localCurrencyInput.value = formatWithCommas(
        (usdVal / meta.rate).toFixed(meta.precision),
      );
    } else {
      localCurrencyInput.value = "";
    }

    checkApprovalRequirement();
  };

  // ✅ Recalculate amounts when country changes
  const recalcOnCountryChange = () => {
    const valid = countryDropdown.value && countryDropdown.value !== "#";

    enableCurrency(valid);

    if (!valid) {
      hide(feedbackRow);
      return;
    }

    const localHas = localCurrencyInput?.value?.trim() !== "";
    const usdHas = usdAmountInput?.value?.trim() !== "";

    // Use lastAmountSource if we know it, otherwise infer.
    const source =
      lastAmountSource ||
      (usdHas && !localHas ? "usd" : localHas ? "local" : null);

    if (source === "usd" && usdHas) {
      convertUSDToLocal();
    } else if (source === "local" && localHas) {
      convertLocalToUSD();
    } else if (localHas) {
      convertLocalToUSD();
    } else if (usdHas) {
      convertUSDToLocal();
    }

    checkApprovalRequirement();
  };

  // ========================
  // NUMERIC INPUT VALIDATION
  // ========================
  const allowOnlyNumbers = (e) => {
    const input = e.target;
    const key = e.key;

    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(key) ||
      ((e.ctrlKey || e.metaKey) &&
        ["a", "c", "v", "x"].includes(key.toLowerCase()))
    ) {
      return;
    }

    if (key >= "0" && key <= "9") return;
    if (key === "." && !input.value.includes(".")) return;

    e.preventDefault();
  };

  const handlePaste = (e) => {
    const paste = (e.clipboardData || window.clipboardData).getData("text");
    if (!/^\d*\.?\d*$/.test(paste.trim())) e.preventDefault();
  };

  [localCurrencyInput, usdAmountInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("keydown", allowOnlyNumbers);
    input.addEventListener("paste", handlePaste);
  });

  // ========================
  // FEEDBACK: Mandatory Docs + Procurement + SOW
  // ========================
  const checkApprovalRequirement = () => {
    const usdVal = toNumber(usdAmountInput?.value);

    const mandatoryRow = findRowByLabel("Mandatory Document/Requirement");
    const mandatoryColId = rowToColumnMap["Mandatory Document/Requirement"];

    if (usdVal === null) {
      hide(feedbackRow);
      if (mandatoryRow) hide(mandatoryRow);
      if (elements[mandatoryColId]) elements[mandatoryColId].textContent = "";
      return;
    }

    let threshold = 100000;
    const cKey = normKey(countryDropdown.value);
    if (cKey === "Singapore1290" || cKey === "Singapore1291")
      threshold = 500000;

    const exceeded = usdVal > threshold;

    if (exceeded) {
      show(feedbackRow);
      if (feedbackMessage) {
        feedbackMessage.innerHTML = `
    <div class="flex items-start gap-2">
      <i class="fas fa-exclamation-circle text-red-600 mt-0.5" aria-hidden="true"></i>
      <span class="font-semibold text-red-600">Procurement approval is required!</span>
    </div>

    <div class="mt-1 flex items-start gap-2">
      <i class="fas fa-file-signature text-red-600 mt-0.5" aria-hidden="true"></i>
      <span class="font-semibold text-red-600">SOW is required!</span>
    </div>
  `;
      }

      if (mandatoryRow) {
        mandatoryRow.style.display = "grid";
        const valueDiv = mandatoryRow.querySelector(".value");
        if (valueDiv) {
          valueDiv.textContent =
            "If PO Amount is 100,000+, SOW and Procurement Approval is required";
        }
      }
    } else {
      hide(feedbackRow);
      if (mandatoryRow) hide(mandatoryRow);
      if (elements[mandatoryColId]) elements[mandatoryColId].textContent = "";
    }
  };

  // ========================
  // TABLE CREATION
  // ========================
  const header = document.createElement("div");
  header.className = "header-row";
  header.innerHTML = `<div>Field Name</div><div>Description</div>`;
  container.appendChild(header);

  rows.forEach((label, index) => {
    const row = document.createElement("div");
    row.className = "row";

    const colId = rowToColumnMap[label] || `value-${index}`;
    const url = iconLinks[label];
    const iconHTML = url
      ? `<span class="info-icon" data-tooltip="Click here for the tool">
          <a href="${url}" target="_blank" rel="noopener">
            <img src="https://bapprguide.infinityfree.me/img/tool-link.png" alt="tool link">
          </a>
        </span>`
      : "";

    row.innerHTML = `
      <div class="label">${label}${iconHTML}</div>
      <div class="value" id="${colId}">
        ${
          label === "TGH Approval"
            ? "Spend per GO exceeds the country threshold, TGH approval is a mandatory requirement in submitting a service request"
            : "Please select an option"
        }
      </div>
    `;

    // Hide by default
    if (
      label === "TGH Approval" ||
      label === "Mandatory Document/Requirement"
    ) {
      hide(row);
    }

    container.appendChild(row);
    elements[colId] = row.querySelector(`#${CSS.escape(colId)}`);
  });

  // ========================
  // TGH Approval row toggle (checkbox)
  // ========================
  const tghApprovalRow = findRowByLabel("TGH Approval");
  if (govCheckbox && tghApprovalRow) {
    govCheckbox.addEventListener("change", () => {
      if (govCheckbox.checked) show(tghApprovalRow, "grid");
      else hide(tghApprovalRow);
    });
  }

  // ========================
  // CATEGORY DROPDOWN (filter + a11y)
  // ========================
  const positionCategoryList = () => {
    const rect = categoryInput.getBoundingClientRect();
    categoryList.style.top = `${rect.bottom + window.scrollY}px`;
    categoryList.style.left = `${rect.left + window.scrollX}px`;
    categoryList.style.width = `${rect.width}px`;
  };

  const openCategoryList = () => {
    positionCategoryList();
    categoryList.style.display = "block";
    categoryInput.setAttribute("aria-expanded", "true");
  };

  const closeCategoryList = () => {
    categoryList.style.display = "none";
    categoryInput.setAttribute("aria-expanded", "false");
  };

  categoryInput.addEventListener("input", () => {
    const filter = categoryInput.value.toLowerCase();
    const items = categoryList.querySelectorAll("li[role='option']");
    let hasMatch = false;

    items.forEach((li) => {
      const text = li.textContent.toLowerCase();
      const ok = text.includes(filter);
      li.style.display = ok ? "" : "none";
      if (ok) hasMatch = true;
    });

    // Out of Scope item
    let outOfScope = categoryList.querySelector("li.out-of-scope");
    if (!hasMatch) {
      if (!outOfScope) {
        outOfScope = document.createElement("li");
        outOfScope.textContent = "Out of Scope";
        outOfScope.classList.add("out-of-scope");
        outOfScope.setAttribute("role", "option");
        categoryList.appendChild(outOfScope);
      }
      outOfScope.style.display = "";
    } else if (outOfScope) {
      outOfScope.style.display = "none";
    }

    openCategoryList();
  });

  categoryList.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    categoryInput.value = li.textContent.trim();
    closeCategoryList();
    fetchData();
  });

  document.addEventListener("click", (e) => {
    if (!categoryInput.contains(e.target) && !categoryList.contains(e.target)) {
      closeCategoryList();
    }
  });

  window.addEventListener("resize", () => {
    if (categoryList.style.display === "block") positionCategoryList();
  });

  // ========================
  // DATA FETCH (from PHP)
  // ========================
  const setAllValues = (data = {}) => {
    const countrySelected =
      countryDropdown.value && countryDropdown.value !== "#";

    rows.forEach((label) => {
      if (label === "TGH Approval" || label === "SSPA Requirements") return;

      const col = rowToColumnMap[label];
      if (!elements[col]) return;

      if (!countrySelected) {
        elements[col].textContent = "Please select an option";
      } else {
        elements[col].textContent =
          data?.values?.[col] || "Please select Category Name";
      }
    });
  };

  const fetchData = async () => {
    const countryValue = countryDropdown.value;
    const categoryValue = categoryInput.value.trim();

    if (!countryValue || countryValue === "#" || !categoryValue) {
      setAllValues();
      return;
    }

    try {
      const url = `sql/get_po_owner.php?country=${encodeURIComponent(
        countryValue,
      )}&category=${encodeURIComponent(categoryValue)}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      setAllValues(json);
    } catch (err) {
      console.error("Fetch error:", err);
      setAllValues();
    }
  };

  const fetchDataDebounced = debounce(fetchData, 250);

  // ========================
  // SSPA Requirements (depends on P&C selection only)
  // ========================
  const updateSSPARequirement = () => {
    const label = "SSPA Requirements";
    let row = findRowByLabel(label);
    if (!row) return;

    const valueDiv = row.querySelector(".value");
    if (!valueDiv) return;

    const val = pcDropdown?.value;

    if (val === "With Personal and Confidential Information") {
      row.style.display = "grid";
      valueDiv.textContent =
        "If PO involves gathering of Personal and Confidential Information, vendor must be SSPA Compliant";
    } else if (val === "Without Personal and Confidential Information") {
      row.style.display = "grid";
      valueDiv.textContent =
        "If PO doesn't involve gathering of Personal and Confidential Information, vendor does not need to be SSPA Compliant";
    } else {
      hide(row);
    }
  };

  // ========================
  // EVENT WIRES
  // ========================
  enableCurrency(false);

  localCurrencyInput?.addEventListener("input", () => {
    lastAmountSource = "local";
    convertLocalToUSD();
  });

  usdAmountInput?.addEventListener("input", () => {
    lastAmountSource = "usd";
    convertUSDToLocal();
  });

  // ✅ Country change now ALSO recalculates conversion properly
  countryDropdown.addEventListener("change", () => {
    recalcOnCountryChange();
    fetchDataDebounced();
    // Recompute based on what the user already typed
    if (localCurrencyInput.value) convertLocalToUSD();
    else if (usdAmountInput.value) convertUSDToLocal();
  });

  categoryInput.addEventListener("change", fetchDataDebounced);

  pcDropdown?.addEventListener("change", () => {
    if (pcDropdown.value === "With Personal and Confidential Information") {
      pcFeedbackIcon.className = "icon fas fa-exclamation-circle red-feedback";
      pcFeedbackMessage.textContent = "Vendor should be SSPA Compliant";
      pcFeedbackMessage.className = "red-feedback";
      show(pcFeedbackRow);
    } else {
      hide(pcFeedbackRow);
    }
    updateSSPARequirement();
  });

  updateSSPARequirement();

  // ========================
  // CSV EXPORT
  // ========================
  const escapeCSV = (str) => {
    const s = String(str ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  saveBtn?.addEventListener("click", () => {
    const csvRows = [];

    const generalInfoRows = document.querySelectorAll(".sidebar-block .sb-row");
    csvRows.push("General Information");
    csvRows.push(["Field", "Value"].join(","));

    generalInfoRows.forEach((row) => {
      const label = row.querySelector("label")?.textContent.trim() || "";
      const input = row.querySelector("input")?.value || "";
      const select = row.querySelector("select")?.value || "";
      const value = input || select;
      csvRows.push([escapeCSV(label), escapeCSV(value)].join(","));
    });

    csvRows.push("");
    csvRows.push("Output");
    csvRows.push(["Field Name", "Description"].join(","));

    container.querySelectorAll(".row").forEach((row) => {
      const field = row.querySelector(".label")?.textContent.trim() || "";
      const desc = row.querySelector(".value")?.textContent.trim() || "";
      csvRows.push([escapeCSV(field), escapeCSV(desc)].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "po_guide_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // ========================
  // DARK MODE + SIDEBAR
  // ========================
  darkToggle?.addEventListener("change", () => {
    document.body.classList.toggle("dark", darkToggle.checked);
    document.body.classList.toggle("light", !darkToggle.checked);
  });

  collapseBtn?.addEventListener("click", () => {
    sidebar?.classList.toggle("collapsed");
    content?.classList.toggle("expanded");
  });

  // ========================
  // REFRESH / RESET
  // ========================
  refreshSidebar?.addEventListener("click", () => {
    document
      .querySelectorAll(".sidebar select")
      .forEach((select) => (select.selectedIndex = 0));
    document
      .querySelectorAll(".sidebar input[type='text']")
      .forEach((input) => (input.value = ""));
    document
      .querySelectorAll(".sidebar input[type='checkbox']")
      .forEach((cb) => (cb.checked = false));

    enableCurrency(false);
    hide(feedbackRow);
    hide(pcFeedbackRow);

    const sspaRow = findRowByLabel("SSPA Requirements");
    if (sspaRow) hide(sspaRow);

    const mandatoryRow = findRowByLabel("Mandatory Document/Requirement");
    if (mandatoryRow) hide(mandatoryRow);

    const tghRow = findRowByLabel("TGH Approval");
    if (tghRow) hide(tghRow);

    setAllValues();
    lastAmountSource = null;
  });

  // ========================
  // INITIAL STATE
  // ========================
  hide(feedbackRow);
  hide(pcFeedbackRow);
  checkApprovalRequirement();
  setAllValues();
});
