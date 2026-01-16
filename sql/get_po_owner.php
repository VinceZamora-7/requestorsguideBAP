<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

/**
 * Send JSON response and exit.
 */
function respond(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Require GET param, trimmed.
 */
function getParam(string $key): string {
    if (!isset($_GET[$key])) {
        respond(['error' => "Missing parameter: {$key}"], 400);
    }
    return trim((string)$_GET[$key]);
}

// ✅ Use shared DB connection
require_once __DIR__ . '/db.php';

// db.php currently dies(json_encode(...)) on failure.
// That's OK for JSON endpoints, but we still add a guard:
if (!isset($conn) || !($conn instanceof mysqli)) {
    respond(['error' => 'DB connection not available'], 500);
}
$conn->set_charset('utf8mb4');

// Inputs
$country  = getParam('country');
$category = getParam('category');

// Main fields used by your UI
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

// 1) Get existing columns in table
$existingCols = [];
$colResult = $conn->query("SHOW COLUMNS FROM compliance_rules");
if (!$colResult) {
    respond(['error' => 'Failed to read table columns', 'details' => $conn->error], 500);
}
while ($row = $colResult->fetch_assoc()) {
    $existingCols[] = $row['Field'];
}
$colResult->free();

$exists = array_flip($existingCols);

// 2) Build SELECT columns dynamically
$selectCols = [];

foreach ($baseColumns as $col) {
    // main value column
    if (isset($exists[$col])) {
        $selectCols[] = "`$col`";
    }

    // friendly
    $friendly = ($col === "DeliveryDate_EndDate")
        ? "DeliveryDate_FriendlyName"
        : $col . "_FriendlyName";

    if (isset($exists[$friendly])) {
        $selectCols[] = "`$friendly` AS `{$col}_FriendlyMapped`";
    }

    // KB
    $kb = ($col === "DeliveryDate_EndDate")
        ? "DeliveryDate_KB"
        : $col . "_KB";

    if (isset($exists[$kb])) {
        $selectCols[] = "`$kb` AS `{$col}_KBMapped`";
    }
}

if (empty($selectCols)) {
    respond(['error' => 'No selectable columns found in compliance_rules'], 500);
}

$colStr = implode(", ", $selectCols);

// 3) Query helpers
function fetchOne(mysqli $conn, string $sql, string $country, ?string $category = null): array {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        respond(['error' => 'Prepare failed', 'details' => $conn->error], 500);
    }

    if ($category === null) {
        $stmt->bind_param("s", $country);
    } else {
        $stmt->bind_param("ss", $country, $category);
    }

    if (!$stmt->execute()) {
        $err = $stmt->error;
        $stmt->close();
        respond(['error' => 'Execute failed', 'details' => $err], 500);
    }

    $res = $stmt->get_result();
    $row = $res ? ($res->fetch_assoc() ?: []) : [];
    $stmt->close();

    return $row;
}

// 4) Run queries
$sqlCountry = "
    SELECT $colStr
    FROM compliance_rules
    WHERE TRIM(Country) = TRIM(?)
    LIMIT 1
";

$sqlBoth = "
    SELECT $colStr
    FROM compliance_rules
    WHERE TRIM(Country) = TRIM(?)
      AND TRIM(CategoryName) = TRIM(?)
    LIMIT 1
";

$rowCountry = fetchOne($conn, $sqlCountry, $country);
$rowBoth    = fetchOne($conn, $sqlBoth, $country, $category);

// 5) Build final response
$final = [
    'values'   => [],
    'articles' => [],
    'links'    => []
];

foreach ($baseColumns as $col) {
    $valueKey    = $col;
    $friendlyKey = "{$col}_FriendlyMapped";
    $kbKey       = "{$col}_KBMapped";

    $final['values'][$col] =
        $rowBoth[$valueKey] ?? $rowCountry[$valueKey] ?? "Not Found";

    $final['articles'][$col] =
        $rowBoth[$friendlyKey] ?? $rowCountry[$friendlyKey] ?? "Not Found";

    $final['links'][$col] =
        $rowBoth[$kbKey] ?? $rowCountry[$kbKey] ?? "#";
}

respond($final, 200);
