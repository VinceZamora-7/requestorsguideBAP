<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/db.php';

$schema = 'dbo';
$table  = 'PODATA';

$country  = isset($_GET['country']) ? trim((string)$_GET['country']) : '';
$category = isset($_GET['category']) ? trim((string)$_GET['category']) : '';
$debug    = isset($_GET['debug']) ? (int)$_GET['debug'] : 0;

if ($country === '' || $country === '#') {
  http_response_code(400);
  echo json_encode(['error' => 'Missing parameter: country'], JSON_UNESCAPED_UNICODE);
  exit;
}
if ($category === '#') $category = '';

$baseColumns = [
  'PO_Owner',
  'CompanyCode',
  'Microsoft_Legal_Entity_Name',
  'POTitle',
  'PODescription',
  'InvoiceApprover',
  'StartDatetext',
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
  'TGHApproval',
];

function out(array $payload, int $status = 200): void {
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

/**
 * Normalizes SQL strings for matching:
 * - TRIM
 * - remove TAB
 * - remove spaces
 */
function normExpr(string $sqlExpr): string {
  return "REPLACE(REPLACE(LTRIM(RTRIM($sqlExpr)), CHAR(9), ''), ' ', '')";
}

$countryColNorm = normExpr('[Country]');
$catColNorm     = normExpr('[CategoryName]');
$paramNorm      = fn() => normExpr('?');

$countryMatch  = "$countryColNorm = " . $paramNorm();
$categoryMatch = "$catColNorm = " . $paramNorm();

try {
  // columns existing
  $colStmt = $pdo->prepare("
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
  ");
  $colStmt->execute([$schema, $table]);
  $existingCols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
  $existingSet = array_flip($existingCols);

  // build select list
  $selectCols = [];
  foreach ($baseColumns as $col) {
    if (isset($existingSet[$col])) $selectCols[] = "[$col]";

    $friendly = ($col === 'DeliveryDate_EndDate') ? 'DeliveryDate_FriendlyName' : $col . '_FriendlyName';
    if (isset($existingSet[$friendly])) $selectCols[] = "[$friendly] AS [{$col}_FriendlyMapped]";

    $kb = ($col === 'DeliveryDate_EndDate') ? 'DeliveryDate_KB' : $col . '_KB';
    if (isset($existingSet[$kb])) $selectCols[] = "[$kb] AS [{$col}_KBMapped]";
  }

  if (!$selectCols) out(['error' => "No matching columns found in {$schema}.{$table}"], 500);

  $colStr = implode(', ', $selectCols);

  // Country fallback
  $stmt1 = $pdo->prepare("
    SELECT TOP 1 $colStr
    FROM [$schema].[$table]
    WHERE $countryMatch
  ");
  $stmt1->execute([$country]);
  $rowCountry = $stmt1->fetch() ?: [];

  // Country + Category override
  $rowBoth = [];
  if ($category !== '') {
    $stmt2 = $pdo->prepare("
      SELECT TOP 1 $colStr
      FROM [$schema].[$table]
      WHERE $countryMatch AND $categoryMatch
    ");
    $stmt2->execute([$country, $category]);
    $rowBoth = $stmt2->fetch() ?: [];
  }

  $final = ['values' => [], 'articles' => [], 'links' => []];

  foreach ($baseColumns as $col) {
    $final['values'][$col]   = $rowBoth[$col] ?? $rowCountry[$col] ?? 'Not Found';
    $final['articles'][$col] = $rowBoth[$col.'_FriendlyMapped'] ?? $rowCountry[$col.'_FriendlyMapped'] ?? 'Not Found';
    $final['links'][$col]    = $rowBoth[$col.'_KBMapped'] ?? $rowCountry[$col.'_KBMapped'] ?? '#';
  }

  if ($debug === 1) {
    $final['_debug'] = [
      'received' => ['country' => $country, 'category' => $category],
      'row_count' => $pdo->query("SELECT COUNT(*) AS cnt FROM [$schema].[$table]")->fetch(),
    ];
  }

  echo json_encode($final, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  out(['error' => 'Server error', 'detail' => $e->getMessage()], 500);
}
