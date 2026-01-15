<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BAP Task Guide</title>

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Optional: Tailwind config (dark mode, fonts, theme tweaks) -->
    <script>
      tailwind.config = {
        darkMode: "class", // allows body.dark
        theme: {
          extend: {
            fontFamily: {
              sans: ["Inter", "ui-sans-serif", "system-ui"],
            },
            colors: {
              primary: "#16a34a", // matches your green
            },
          },
        },
      };
    </script>

    <link rel="stylesheet" href="style.css" />
    <link rel="stylesheet" href="modals/io-modal.css" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
    />
    <link
      rel="icon"
      href="https://eventsprguide.infinityfree.me/img/dashboard.png"
      type="image/svg+xml"
    />

    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
  </head>

  <body class="light">
    <div class="app">
      <!-- Sidebar -->
      <aside class="sidebar" aria-label="Requestor guide sidebar">
        <button
          id="collapseBtn"
          class="collapse-btn"
          type="button"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
        </button>

        <div class="sidebar-inner">
          <!-- General Information -->
          <section class="sidebar-block" aria-labelledby="generalInfoTitle">
            <div class="sidebar-title" id="generalInfoTitle">
              Requestor's Guide
            </div>

            <div class="sb-heading">
              <h3>General Information</h3>

              <button
                id="refreshSidebar"
                type="button"
                class="icon-btn"
                title="Reset all inputs"
                aria-label="Reset all inputs"
              >
                <i class="fas fa-sync-alt" aria-hidden="true"></i>
              </button>
            </div>

            <!-- Service Type -->
            <div class="sb-row">
              <label for="poManagement">Service Type</label>
              <select class="dropdown" id="poManagement">
                <option value="#" selected>-- Select --</option>
                <option>PO Creation</option>
                <option>PO Extension</option>
              </select>
            </div>

            <!-- P&C -->
            <div class="sb-row">
              <label for="pcInfo">P&amp;C Information</label>
              <select class="dropdown" id="pcInfo">
                <option value="#" selected>-- Select --</option>
                <option>With Personal and Confidential Information</option>
                <option>Without Personal and Confidential Information</option>
              </select>
            </div>

            <!-- P&C feedback -->
            <div class="sb-row" id="pc-feedback-row" style="display: none">
              <div class="feedback" role="status" aria-live="polite">
                <i id="pc-feedback-icon" class="icon" aria-hidden="true"></i>
                <span id="pc-feedback-message"></span>
              </div>
            </div>

            <!-- Country -->
            <div class="sb-row">
              <label for="country">Country</label>
              <select class="dropdown" id="country">
                <option value="#" selected>-- Select --</option>
                <option value="Brunei 1720">Brunei 1720</option>
                <option value="China 1107">China 1107</option>
                <option value="Hong Kong 1089">Hong Kong 1089</option>
                <option value="Indonesia 1046">Indonesia 1046</option>
                <option value="Japan 1079">Japan 1079</option>
                <option value="Korea 1056">Korea 1056</option>
                <option value="Malaysia 1037">Malaysia 1037</option>
                <option value="Philippines 1047">Philippines 1047</option>
                <option value="Singapore 1290">Singapore 1290</option>
                <option value="Singapore 1291">Singapore 1291</option>
                <option value="Taiwan 1058">Taiwan 1058</option>
                <option value="Thailand 1021">Thailand 1021</option>
                <option value="Vietnam 1714">Vietnam 1714</option>
              </select>
            </div>

            <!-- Category -->
            <div class="sb-row" id="categoryList-div">
              <label for="categoryName">Category Name</label>
              <input
                type="text"
                id="categoryName"
                placeholder="Start typing..."
                class="dropdown noArrow"
                autocomplete="off"
                aria-autocomplete="list"
                aria-controls="categoryList"
                aria-expanded="false"
              />
              <ul
                id="categoryList"
                role="listbox"
                aria-label="Category suggestions"
              >
                <li role="option">3rd Party Ad Serving</li>
                <li role="option">Academic Institutions</li>
                <li role="option">Advertising & Media</li>
                <li role="option">Agency Temps</li>
                <li role="option">Associations: Membership & Dues</li>
                <li role="option">
                  Back-office Services: Finance, Ops & Procurement
                </li>
                <li role="option">Cargo, Parcel, and Postal Shipping</li>
                <li role="option">Construction & Project Management</li>
                <li role="option">Consulting Services</li>
                <li role="option">Contact Centers</li>
                <li role="option">Content Services</li>
                <li role="option">Contract Manufacturing & Components</li>
                <li role="option">
                  Contractor & Freelance Services (Procurement Only)
                </li>
                <li role="option">Contributions</li>
                <li role="option">Corporate Financial/Banking Services</li>
                <li role="option">Customer, Partner & Reseller Payments</li>
                <li role="option">Data Management & Analytics</li>
                <li role="option">
                  Development Funds (Mktg Dev, Co-Mktg, & Bus Dev)
                </li>
                <li role="option">Employee Services</li>
                <li role="option">
                  End-Customer Investment Fund (formerly BIF)
                </li>
                <li role="option">Enterprise Services (MCS & Premier)</li>
                <li role="option">Environmental Sustainability</li>
                <li role="option">Event Creative & Production</li>
                <li role="option">
                  Event Demand Generation & Sponsorship Sales
                </li>
                <li role="option">Event Logistics & Management</li>
                <li role="option">
                  Event Tools, Registration and Technical Services
                </li>
                <li role="option">
                  Event Venues, Site Selection, Food & Beverage
                </li>
                <li role="option">Facility Lease, Rent & Utilities</li>
                <li role="option">Facility Management</li>
                <li role="option">Garnishments</li>
                <li role="option">Hardware</li>
                <li role="option">Hardware Development Lifecycle</li>
                <li role="option">Incubation Projects</li>
                <li role="option">Learning</li>
                <li role="option">Legal Services</li>
                <li role="option">Localization</li>
                <li role="option">Market Research</li>
                <li role="option">Marketing Services</li>
                <li role="option">Microsoft Internal Entities</li>
                <li role="option">
                  Microsoft Samples / Internal Product Ordering (IPO)
                </li>
                <li role="option">Partners in Learning</li>
                <li role="option">Product Packaging Services</li>
                <li role="option">Public Relations</li>
                <li role="option">Real Estate Brokerage</li>
                <li role="option">
                  Rebates, Refunds & Other Customer Payments
                </li>
                <li role="option">Repair & Refurbishment</li>
                <li role="option">Retail Services</li>
                <li role="option">
                  Security & Investigation Services & Equipment
                </li>
                <li role="option">Service Engineering (DevOps)</li>
                <li role="option">Software & Cloud Services</li>
                <li role="option">Sponsorships</li>
                <li role="option">Supplier Chain Operations</li>
                <li role="option">Supplier Travel & Expenses</li>
                <li role="option">Tax</li>
                <li role="option">Technical Development</li>
                <li role="option">Telecommunications</li>
                <li role="option">Telesales</li>
                <li role="option">Test & Lab Operations</li>
                <li role="option">Travel & Entertainment</li>
                <li role="option">Vehicles & Fleet Management</li>
                <li role="option">Video Production Services</li>
              </ul>
            </div>

            <!-- Government Official -->
            <div class="sb-row go-checkbox">
              <input type="checkbox" id="govOfficialCheckbox" />
              <label for="govOfficialCheckbox">
                Is there Government Official attending to this event?
              </label>
            </div>

            <!-- Internal Order -->
            <div class="sb-row">
              <label for="internalOrderBtn">Internal Order Number</label>
              <button id="internalOrderBtn" class="btn btn-secondary">
                Select Internal Order Number
              </button>
            </div>
          </section>

          <!-- Currency Converter -->
          <section class="sidebar-block" aria-label="Currency converter">
            <!-- Card: Glass header -->
            <div
              class="rounded-2xl border border-white/10 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:bg-slate-900/50 dark:border-white/10"
            >
              <div class="flex items-center justify-between">
                <h3
                  class="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-200"
                >
                  Currency Converter
                </h3>

                <!-- Optional: tiny hint badge -->
                <span
                  class="rounded-full border border-white/20 bg-white/60 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300"
                >
                  Powered
                </span>
              </div>

              <!-- Converter "glass" body -->
              <div
                id="currencyWrapper"
                class="mt-4 rounded-2xl border border-white/20 bg-white/50 p-4 shadow-sm backdrop-blur-xl dark:bg-white/5 dark:border-white/10"
                title="Choose a country first"
                aria-disabled="true"
              >
                <!-- Disabled state (keeps your existing class hook too) -->
                <div class="currency-wrapper disabled">
                  <!-- Local currency card -->
                  <div
                    class="rounded-xl border border-white/20 bg-white/60 p-3 shadow-sm dark:bg-white/5 dark:border-white/10"
                  >
                    <div class="flex items-center justify-between">
                      <label
                        for="localCurrency"
                        class="text-[11px] font-semibold text-black dark:text-slate-300"
                      >
                        PO in Local Currency
                      </label>

                      <div
                        id="localCurrencyContainer"
                        class="inline-flex items-center gap-2 text-xs text-black dark:text-slate-300"
                        aria-hidden="true"
                      >
                        <img
                          width="18"
                          class="opacity-80"
                          src="https://bapprguide.infinityfree.me/img/exchange.png"
                          alt=""
                        />
                      </div>
                    </div>

                    <div class="mt-2 relative">
                      <input
                        type="text"
                        class="w-full rounded-lg border border-black bg-white/70 px-3 py-2 text-sm shadow-inner outline-none placeholder:text-slate-800 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        id="localCurrency"
                        disabled
                        placeholder="—"
                      />
                    </div>
                  </div>

                  <!-- USD card -->
                  <div
                    class="mt-3 rounded-xl border border-white/20 bg-white/60 p-3 shadow-sm dark:bg-white/5 dark:border-white/10"
                  >
                    <div class="flex items-center justify-between">
                      <label
                        for="usdAmount"
                        class="text-[11px] font-semibold text-black dark:text-slate-300"
                      >
                        PO Amount in USD
                      </label>

                      <div
                        id="usdAmountContainer"
                        class="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-300"
                        aria-hidden="true"
                      >
                        $
                      </div>
                    </div>

                    <div class="mt-2 relative">
                      <input
                        type="text"
                        class="w-full rounded-lg border border-black bg-white/70 px-3 py-2 text-sm text-black shadow-inner outline-none placeholder:text-slate-800 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        id="usdAmount"
                        disabled
                        placeholder="—"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Feedback (unchanged IDs) -->
              <div class="mt-3 hidden" id="feedback-row">
                <div
                  class="rounded-xl border border-white/20 bg-white/60 px-3 py-2 text-sm text-slate-700 shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-slate-200"
                  role="status"
                  aria-live="polite"
                >
                  <div class="flex items-start gap-2">
                    <i
                      id="feedback-icon"
                      class="icon mt-0.5"
                      aria-hidden="true"
                    ></i>
                    <span id="feedback-message"></span>
                  </div>
                </div>
              </div>

              <!-- Footer area -->
              <div class="mt-4 flex items-center justify-between">
                <div
                  class="poweredby flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400"
                  aria-hidden="true"
                >
                  <span>Powered by</span>
                  <span
                    class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/60 px-2 py-1 dark:bg-white/10 dark:border-white/10"
                  >
                    <img
                      width="16"
                      src="img/CGlogo.png"
                      alt=""
                      class="opacity-80"
                    />
                    <span class="font-semibold">CodeGen</span>
                  </span>
                </div>

                <div class="sidebar-footer flex items-center gap-3">
                  <span
                    class="text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                    >Dark Mode</span
                  >
                  <label class="switch" aria-label="Toggle dark mode">
                    <input type="checkbox" id="darkToggle" />
                    <span class="slider" aria-hidden="true"></span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="content" aria-label="Main content">
        <header class="topbar">
          <div class="page-title" aria-live="polite"></div>
          <div class="actions">
            <button class="btn btn-primary" id="saveBtn" type="button">
              Save
            </button>
          </div>
        </header>

        <div class="page-area">
          <section class="block">
            <div id="rowsContainer"></div>
          </section>
        </div>
      </main>
    </div>

    <!-- Your existing main script -->
    <script src="script.js"></script>
    <script src="modals/io-modal.js"></script>
  </body>
</html>
