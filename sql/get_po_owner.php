<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

$host = "localhost";
$username = "root";
$password = "";
$dbname = "pocsv_db";

$conn = new mysqli($host, $username, $password, $dbname);
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    die(json_encode(['error' => 'DB Connection failed']));
}

if (!isset($_GET['country']) || !isset($_GET['category'])) {
    die(json_encode(['error' => 'Missing parameters']));
}

$country  = trim($_GET['country']);
$category = trim($_GET['category']);

// ------------------------------------------------------------------
// 1️⃣ Get all real columns from database so we don't select missing ones
// ------------------------------------------------------------------
$existingCols = [];
$colResult = $conn->query("SHOW COLUMNS FROM compliance_rules");

while ($row = $colResult->fetch_assoc()) {
    $existingCols[] = $row['Field'];
}

// ------------------------------------------------------------------
// 2️⃣ Main fields used by your UI
// ------------------------------------------------------------------
$baseColumns = [
    'PO_Owner',
    'CompanyCode',
    'Microsoft_Legal_Entity_Name',
    'POTitle',
    'PODescription',
    'InvoiceApprover',
    'StartDate',
    'Supplier',
    'LineItemDescription',
    'DeliveryDate_EndDate',
    'Currency',
    'AccountCode',
    'IOStatus',
    'PrePayment',
    'MandatoryDocs',
    'ThresholdPerCategory',
    'MandatoryDocsThreshold',
    'Tax',
    'POEReviewValidation',
    'EmailNotificationList',
    'InterimApprover',
    'SafeApprover',
    'MSSignatory',
    'BusinessJustification',
    'TGHApproval'
];

// ------------------------------------------------------------------
// 3️⃣ Build SELECT columns dynamically based on what exists in DB
// ------------------------------------------------------------------
$selectCols = [];

foreach ($baseColumns as $col) {

    // Always include the main value column
    if (in_array($col, $existingCols)) {
        $selectCols[] = $col;
    }

    // Friendly name column
    $friendly = ($col === "DeliveryDate_EndDate")
        ? "DeliveryDate_FriendlyName"
        : $col . "_FriendlyName";

    if (in_array($friendly, $existingCols)) {
        $selectCols[] = "$friendly AS {$col}_FriendlyMapped";
    }

    // KB Column
    $kb = ($col === "DeliveryDate_EndDate")
        ? "DeliveryDate_KB"
        : $col . "_KB";

    if (in_array($kb, $existingCols)) {
        $selectCols[] = "$kb AS {$col}_KBMapped";
    }
}

$colStr = implode(",", $selectCols);

// ------------------------------------------------------------------
// 4️⃣ Run queries
// ------------------------------------------------------------------
$stmt1 = $conn->prepare("
    SELECT $colStr
    FROM compliance_rules
    WHERE TRIM(Country) = TRIM(?)
    LIMIT 1
");
$stmt1->bind_param("s", $country);
$stmt1->execute();
$rowCountry = $stmt1->get_result()->fetch_assoc() ?: [];

$stmt2 = $conn->prepare("
    SELECT $colStr
    FROM compliance_rules
    WHERE TRIM(Country) = TRIM(?) 
      AND TRIM(CategoryName) = TRIM(?)
    LIMIT 1
");
$stmt2->bind_param("ss", $country, $category);
$stmt2->execute();
$rowBoth = $stmt2->get_result()->fetch_assoc() ?: [];

// ------------------------------------------------------------------
// 5️⃣ Build final JSON output
// ------------------------------------------------------------------
$final = [
    'values'   => [],
    'articles' => [],
    'links'    => []
];

foreach ($baseColumns as $col) {

    $valueKey     = $col;
    $friendlyKey  = $col . "_FriendlyMapped";
    $kbKey        = $col . "_KBMapped";

    // Value
    $final['values'][$col] =
        $rowBoth[$valueKey] ??
        $rowCountry[$valueKey] ??
        "Not Found";

    // Friendly Name
    $final['articles'][$col] =
        $rowBoth[$friendlyKey] ??
        $rowCountry[$friendlyKey] ??
        "Not Found";

    // KB link
    $final['links'][$col] =
        $rowBoth[$kbKey] ??
        $rowCountry[$kbKey] ??
        "#";
}

echo json_encode($final, JSON_UNESCAPED_UNICODE);
