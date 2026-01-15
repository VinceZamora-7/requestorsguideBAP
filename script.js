document.addEventListener("DOMContentLoaded", () => {
  // ========================
  // DOM ELEMENTS
  // ========================
  const darkToggle = document.getElementById("darkToggle");
  const container = document.getElementById("rowsContainer");
  const countryDropdown = document.getElementById("country");
  const categoryInput = document.getElementById("categoryName");
  const categoryList = document.getElementById("categoryList");
  const saveBtn = document.getElementById("saveBtn");

  // Currency Inputs & Containers
  const localCurrencyInput = document.getElementById("localCurrency");
  const usdAmountInput = document.getElementById("usdAmount");
  const localCurrencyContainer = document.getElementById(
    "localCurrencyContainer"
  );
  const usdAmountContainer = document.getElementById("usdAmountContainer");

  // Feedback elements
  const feedbackRow = document.getElementById("feedback-row");
  const feedbackIcon = document.getElementById("feedback-icon");
  const feedbackMessage = document.getElementById("feedback-message");

  // TGH Approval Checkbox
  const govCheckbox = document.getElementById("govOfficialCheckbox");

  // P&C Info Feedback
  const pcDropdown = document.getElementById("pcInfo");
  const pcFeedbackRow = document.getElementById("pc-feedback-row");
  const pcFeedbackIcon = document.getElementById("pc-feedback-icon");
  const pcFeedbackMessage = document.getElementById("pc-feedback-message");

  // Sidebar toggle
  const collapseBtn = document.getElementById("collapseBtn");
  const sidebar = document.querySelector(".sidebar");
  const content = document.querySelector(".content");

  // ========================
  // DATA
  // ========================

  // Country → Currency mapping
  const countryCurrencyMap = {
    "Brunei 1720": "BND",
    "China 1107": "CNY",
    "Hong Kong 1089": "HKD",
    "Indonesia 1046": "IDR",
    "Japan 1079": "JPY",
    "Korea 1056": "KRW",
    "Malaysia 1037": "MYR",
    "Philippines 1047": "PHP",
    "Singapore 1290": "SGD",
    "Singapore 1291": "SGD",
    "Taiwan 1058": "TWD",
    "Thailand 1021": "THB",
    "Vietnam 1714": "VND",
  };

  // Currency Exchange Rates and Precision
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
  };

  // Table rows
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
    "Start Date": "StartDate",
    "SSPA Requirements": "Supplier",
    "TGH Approval": "TGHApproval",
    "Mandatory Document/Requirement": "MandatoryDocsThreshold",
    "Safe Approver": "SafeApprover",
    "MS Signatory": "MSSignatory",
    "Local Area Business Rule": "BusinessJustification",
  };

  const iconLinks = {
    "TGH Approval":
      "https://apps.powerapps.com/play/e/2d348acc-9c71-48b0-875d-8dc6b6be961c/a/d5855fec-5c0f-40ba-8d4c-c8971f5aa083?&hidenavbar=true#webPlayerSession=d74b113a-a774-4246-8dad-3eb65470a1a4",
    "Safe Approver": "https://msauthorize.microsoft.com/#/home",
    "MS Signatory":
      "https://apps.powerapps.com/play/e/6001c084-a24e-ea83-88d7-7d2bd4f6410f/a/a0eb7e59-1410-4cfb-a097-13178603f059",
    "SSPA Requirements":
      "https://msit.powerbi.com/groups/me/apps/b0462f25-687a-4bdc-a2ff-aeaaaf24847f/reports/1ea75c26-ea3d-4418-a9d0-d92eb9b09efd/ReportSection4dbddf00c9e2db980242?ctid=72f988bf-86f1-41af-91ab-2d7cd011db47&experience=power-bi",
  };

  const elements = {}; // row elements for easy access

  // ========================
  // UTILITY FUNCTIONS
  // ========================

  // Get selected currency
  function getSelectedCurrency() {
    const selectedCountry = countryDropdown.value;
    return countryCurrencyMap[selectedCountry] || "USD";
  }

  // Format numbers with commas
  function formatWithCommas(n) {
    if (!n) return "";
    const [intPart, decimalPart] = n.split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimalPart ? `${formattedInt}.${decimalPart}` : formattedInt;
  }

  // ========================
  // CURRENCY CONVERSION
  // ========================

  function convertLocalToUSD() {
    const currency = getSelectedCurrency();
    const data = currencyData[currency];
    const cleanedLocal = localCurrencyInput.value.replace(/,/g, "");
    const localValue = parseFloat(cleanedLocal);

    if (!isNaN(localValue) && data) {
      const result = (localValue * data.rate).toFixed(2);
      usdAmountInput.value = formatWithCommas(result);
    } else {
      usdAmountInput.value = "";
    }

    checkApprovalRequirement();
  }

  function convertUSDToLocal() {
    const currency = getSelectedCurrency();
    const data = currencyData[currency];
    const cleanedUSD = usdAmountInput.value.replace(/,/g, "");
    const usdValue = parseFloat(cleanedUSD);

    if (!isNaN(usdValue) && data) {
      const result = (usdValue / data.rate).toFixed(data.precision);
      localCurrencyInput.value = formatWithCommas(result);
    } else {
      localCurrencyInput.value = "";
    }

    checkApprovalRequirement();
  }

  function checkApprovalRequirement() {
    const usdValue = parseFloat(usdAmountInput.value.replace(/,/g, ""));

    // Find the Mandatory Docs row
    const mandatoryRow = Array.from(container.children).find(
      (child) =>
        child.classList.contains("row") &&
        child
          .querySelector(".label")
          ?.textContent.includes("Mandatory Document/Requirement")
    );
    const mandatoryColId = rowToColumnMap["Mandatory Document/Requirement"];

    if (!usdValue || isNaN(usdValue)) {
      feedbackRow.style.display = "none";
      if (mandatoryRow) mandatoryRow.style.display = "none";
      if (elements[mandatoryColId]) elements[mandatoryColId].textContent = "";
      return;
    }

    // Default threshold
    let threshold = 100000;

    // Special threshold for Singapore
    const selectedCountry = countryDropdown.value;
    if (
      selectedCountry === "Singapore 1290" ||
      selectedCountry === "Singapore 1291"
    ) {
      threshold = 500000; // 500,000 USD
    }

    if (usdValue > threshold) {
      // Show feedback
      feedbackRow.style.display = "block";
      feedbackRow.innerHTML = "";

      // Procurement approval
      const procurementMsg = document.createElement("div");
      procurementMsg.className = "red-feedback";
      procurementMsg.innerHTML =
        '<i class="fas fa-exclamation-circle"></i> Procurement approval is required!';
      feedbackRow.appendChild(procurementMsg);

      // SOW requirement
      const sowMsg = document.createElement("div");
      sowMsg.className = "red-feedback";
      sowMsg.style.marginTop = "4px";
      sowMsg.innerHTML =
        '<i class="fas fa-exclamation-circle"></i> SOW is required!';
      feedbackRow.appendChild(sowMsg);

      // Show Mandatory Docs row
      if (mandatoryRow) {
        mandatoryRow.style.display = "grid"; // same as other rows

        // Set label and value correctly
        const labelDiv = mandatoryRow.querySelector(".label");
        const valueDiv = mandatoryRow.querySelector(".value");
        if (labelDiv) labelDiv.textContent = "Mandatory Document/Requirement";
        if (valueDiv)
          valueDiv.textContent =
            "If PO Amount is 100,000+, SOW and Procurement Approval is required";
      }
    } else {
      // Hide feedback and Mandatory Docs row
      feedbackRow.style.display = "none";
      if (mandatoryRow) mandatoryRow.style.display = "none";
      if (elements[mandatoryColId]) elements[mandatoryColId].textContent = "";
    }
  }

  // ========================
  // CURRENCY INPUT LISTENERS
  // ========================

  // Initially disable inputs
  localCurrencyInput.disabled = true;
  usdAmountInput.disabled = true;

  // Add conversion listeners
  localCurrencyInput.addEventListener("input", () => {
    convertLocalToUSD();
    checkApprovalRequirement();
  });

  usdAmountInput.addEventListener("input", () => {
    convertUSDToLocal();
    checkApprovalRequirement();
  });

  // ========================
  // NUMERIC INPUT VALIDATION
  // ========================
  function allowOnlyNumbers(e) {
    const input = e.target;
    const key = e.key;

    // Allow control keys: backspace, delete, tab, escape, enter
    if (
      [46, 8, 9, 27, 13].includes(e.keyCode) ||
      ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) ||
      (e.keyCode >= 35 && e.keyCode <= 39)
    ) {
      return;
    }

    // Allow digits
    if (key >= "0" && key <= "9") return;

    // Allow one decimal point
    if (key === "." && !input.value.includes(".")) return;

    // Prevent all other input
    e.preventDefault();
  }

  // Handle pasted content
  function handlePaste(e) {
    const paste = (e.clipboardData || window.clipboardData).getData("text");
    if (!/^\d*\.?\d*$/.test(paste)) {
      e.preventDefault();
    }
  }

  // Apply numeric restriction to currency inputs
  [localCurrencyInput, usdAmountInput].forEach((input) => {
    input.addEventListener("keydown", allowOnlyNumbers);
    input.addEventListener("paste", handlePaste);
  });

  // Country dropdown change
  countryDropdown.addEventListener("change", () => {
    const selectedCountry = countryDropdown.value;
    const currencyWrapper = document.getElementById("currencyWrapper");

    if (selectedCountry && selectedCountry !== "#") {
      // Enable inputs
      localCurrencyInput.disabled = false;
      usdAmountInput.disabled = false;

      // Remove disabled styling and tooltip
      currencyWrapper.classList.remove("disabled");
      currencyWrapper.removeAttribute("title");
    } else {
      // Disable inputs and reset values
      localCurrencyInput.disabled = true;
      usdAmountInput.disabled = true;
      localCurrencyInput.value = "";
      usdAmountInput.value = "";

      // Restore disabled styling and tooltip
      currencyWrapper.classList.add("disabled");
      currencyWrapper.setAttribute("title", "Choose a country first");
    }

    // Update currency display
    const currency = getSelectedCurrency();
    localCurrencyContainer.textContent = currency;
    usdAmountContainer.textContent = "$";

    // Recalculate conversion if needed
    if (localCurrencyInput.value) {
      convertLocalToUSD();
    } else if (usdAmountInput.value) {
      convertUSDToLocal();
    }

    // Trigger approval check
    checkApprovalRequirement();
  });

  // ========================
  // TABLE CREATION
  // ========================

  // Header row
  const header = document.createElement("div");
  header.className = "header-row";
  header.innerHTML = `<div>Field Name</div><div>Description</div>`;
  container.appendChild(header);

  // Data rows
  rows.forEach((label, index) => {
    const row = document.createElement("div");
    row.className = "row";

    const colId = rowToColumnMap[label] || `value-${index}`;
    const url = iconLinks[label];
    const iconHTML = url
      ? `<span class="info-icon" data-tooltip="Click here for the tool">
          <a href="${url}" target="_blank">
            <img src="https://bapprguide.infinityfree.me/img/tool-link.png">
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

    if (
      label === "TGH Approval" ||
      label === "Mandatory Document/Requirement"
    ) {
      row.style.display = "none";
    }

    container.appendChild(row);
    elements[colId] = document.getElementById(colId);
  });

  // TGH Approval visibility toggle
  const tghApprovalRow = Array.from(container.children).find(
    (child) =>
      child.classList.contains("row") &&
      child.querySelector(".label")?.textContent.includes("TGH Approval")
  );

  if (govCheckbox && tghApprovalRow) {
    govCheckbox.addEventListener("change", () => {
      tghApprovalRow.style.display = govCheckbox.checked ? "" : "none";
    });
  }

  // ========================
  // CATEGORY DROPDOWN
  // ========================

  categoryInput.addEventListener("input", () => {
    const filter = categoryInput.value.toLowerCase();
    const items = categoryList.querySelectorAll("li");
    let hasMatch = false;

    items.forEach((li) => {
      const text = li.textContent.toLowerCase();
      li.style.display = text.includes(filter) ? "" : "none";
      if (text.includes(filter)) hasMatch = true;
    });

    // Handle "Out of Scope"
    let outOfScope = categoryList.querySelector("li.out-of-scope");
    if (!hasMatch) {
      if (!outOfScope) {
        outOfScope = document.createElement("li");
        outOfScope.textContent = "Out of Scope";
        outOfScope.classList.add("out-of-scope");
        categoryList.appendChild(outOfScope);
      }
    } else if (outOfScope) {
      categoryList.removeChild(outOfScope);
    }

    // Position dropdown
    const rect = categoryInput.getBoundingClientRect();
    categoryList.style.top = `${rect.bottom + window.scrollY}px`;
    categoryList.style.left = `${rect.left + window.scrollX}px`;
    categoryList.style.display = "block";
  });

  categoryList.addEventListener("click", (e) => {
    if (e.target.tagName.toLowerCase() !== "li") return;
    categoryInput.value = e.target.textContent.trim();
    categoryList.style.display = "none";
    fetchData();
  });

  document.addEventListener("click", (e) => {
    if (!categoryInput.contains(e.target) && !categoryList.contains(e.target)) {
      categoryList.style.display = "none";
    }
  });

  // ========================
  // DATA FETCH
  // ========================

  function setAllValues(data = {}) {
    const countrySelected =
      countryDropdown.value && countryDropdown.value !== "#";

    rows.forEach((label) => {
      if (label === "TGH Approval" || label === "SSPA Requirements") return; // <-- exclude SSPA
      const col = rowToColumnMap[label];
      if (!elements[col]) return;

      if (!countrySelected) {
        elements[col].textContent = "Please select an option";
      } else {
        elements[col].textContent =
          data?.values?.[col] || "Please select Category Name";
      }
    });
  }

  function fetchData() {
    const countryValue = countryDropdown.value;
    const categoryValue = categoryInput.value;

    if (!countryValue || countryValue === "#" || !categoryValue) {
      setAllValues();
      return;
    }

    fetch(
      `sql/get_po_owner.php?country=${encodeURIComponent(
        countryValue
      )}&category=${encodeURIComponent(categoryValue)}`
    )
      .then((res) => res.json())
      .then(setAllValues)
      .catch((err) => {
        console.error("Fetch error:", err);
        setAllValues();
      });
  }

  countryDropdown.addEventListener("change", fetchData);
  categoryInput.addEventListener("change", fetchData);

  // ========================
  // CSV EXPORT
  // ========================

  saveBtn.addEventListener("click", () => {
    const csvRows = [];

    // General Information
    const generalInfoRows = document.querySelectorAll(".sidebar-block .sb-row");
    csvRows.push(["General Information"], ["Field", "Value"]);

    generalInfoRows.forEach((row) => {
      const label = row.querySelector("label")?.textContent.trim() || "";
      const input = row.querySelector("input")?.value || "";
      const select = row.querySelector("select")?.value || "";
      const value = input || select;

      const escapeCSV = (str) =>
        /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;

      csvRows.push([escapeCSV(label), escapeCSV(value)].join(","));
    });

    // Output table
    csvRows.push("", "Output");
    csvRows.push(["Field Name", "Description"].join(","));
    container.querySelectorAll(".row").forEach((row) => {
      const cols = [
        row.querySelector(".label")?.textContent.trim() || "",
        row.querySelector(".value")?.textContent.trim() || "",
      ];
      csvRows.push(
        cols
          .map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
          .join(",")
      );
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
  // DARK MODE
  // ========================
  darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", darkToggle.checked);
    document.body.classList.toggle("light", !darkToggle.checked);
  });

  // ========================
  // SIDEBAR TOGGLE
  // ========================
  collapseBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    content.classList.toggle("expanded");
  });

  // ========================
  // P&C INFO FEEDBACK
  // ========================
  pcDropdown.addEventListener("change", () => {
    if (pcDropdown.value === "With Personal and Confidential Information") {
      pcFeedbackIcon.className = "icon fas fa-exclamation-circle red-feedback";
      pcFeedbackMessage.textContent = "Vendor should be SSPA Compliant";
      pcFeedbackMessage.className = "red-feedback";
      pcFeedbackRow.style.display = "block";
    } else {
      pcFeedbackRow.style.display = "none";
    }
  });
  // Inside your DOMContentLoaded listener, after defining pcDropdown and pcFeedbackRow

  function updateSSPARequirement() {
    const sspaRowLabel = "SSPA Requirements";
    const sspaColId = rowToColumnMap[sspaRowLabel];

    // Find the SSPA Requirement row
    let sspaRow = Array.from(container.children).find(
      (child) =>
        child.classList.contains("row") &&
        child.querySelector(".label")?.textContent.includes(sspaRowLabel)
    );

    if (!sspaRow) {
      // If row doesn't exist, create it
      sspaRow = document.createElement("div");
      sspaRow.className = "row";
      sspaRow.innerHTML = `
      <div class="label">${sspaRowLabel}</div>
      <div class="value" id="${sspaColId}">Please select an option</div>
    `;
      container.appendChild(sspaRow);
      elements[sspaColId] = document.getElementById(sspaColId);
    }

    const valueDiv = sspaRow.querySelector(".value");

    if (pcDropdown.value === "With Personal and Confidential Information") {
      sspaRow.style.display = "grid";
      if (valueDiv)
        valueDiv.textContent =
          "If PO involves gathering of Personal and Confidential Information, vendor must be SSPA Compliant";
    } else if (
      pcDropdown.value === "Without Personal and Confidential Information"
    ) {
      sspaRow.style.display = "grid";
      if (valueDiv)
        valueDiv.textContent =
          "If PO doesn't involve gathering of Personal and Confidential Information, vendor does not need to be SSPA Compliant";
    } else {
      sspaRow.style.display = "none"; // Hide if nothing is selected
    }
  }

  // Trigger only when the dropdown changes
  pcDropdown.addEventListener("change", updateSSPARequirement);

  // Initialize on page load
  updateSSPARequirement();
  const refreshSidebar = document.getElementById("refreshSidebar");

  refreshSidebar.addEventListener("click", () => {
    // Reset all dropdowns
    document.querySelectorAll(".sidebar select").forEach((select) => {
      select.selectedIndex = 0; // reset to first option
    });

    // Reset all text inputs
    document
      .querySelectorAll(".sidebar input[type='text']")
      .forEach((input) => {
        input.value = "";
      });

    // Reset checkboxes
    document
      .querySelectorAll(".sidebar input[type='checkbox']")
      .forEach((cb) => {
        cb.checked = false;
      });

    // Reset currency inputs
    localCurrencyInput.value = "";
    usdAmountInput.value = "";
    localCurrencyInput.disabled = true;
    usdAmountInput.disabled = true;
    document.getElementById("currencyWrapper").classList.add("disabled");
    document
      .getElementById("currencyWrapper")
      .setAttribute("title", "Choose a country first");
    localCurrencyContainer.textContent = "";
    usdAmountContainer.textContent = "$";

    // Hide feedback rows
    feedbackRow.style.display = "none";
    pcFeedbackRow.style.display = "none";

    // Reset SSPA and Mandatory Docs rows
    const sspaRow = Array.from(container.children).find(
      (child) =>
        child.classList.contains("row") &&
        child.querySelector(".label")?.textContent.includes("SSPA Requirements")
    );
    if (sspaRow) sspaRow.style.display = "none";

    const mandatoryRow = Array.from(container.children).find(
      (child) =>
        child.classList.contains("row") &&
        child
          .querySelector(".label")
          ?.textContent.includes("Mandatory Document/Requirement")
    );
    if (mandatoryRow) mandatoryRow.style.display = "none";

    // Hide TGH Approval row
    const tghRow = Array.from(container.children).find(
      (child) =>
        child.classList.contains("row") &&
        child.querySelector(".label")?.textContent.includes("TGH Approval")
    );
    if (tghRow) tghRow.style.display = "none";

    // Reset all table values to default
    setAllValues();
  });
});
