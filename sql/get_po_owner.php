<?php
declare(strict_types=1);

/**
 * get_po_owner.php (Azure SQL / PDO)
 * - Reads from dbo.PODATA
 * - Returns { values, articles, links }
 * - Safe dynamic SELECT (only selects columns that exist)
 * - Robust matching for Country/Category (handles tabs + extra spaces)
 * - Optional debug=1 adds diagnostics
 */

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

// -----------------------
// Columns used by UI
// -----------------------
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

// -----------------------
// Helpers
// -----------------------
function out(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Normalizes SQL strings for matching:
 * - trims
 * - removes tabs
 * - removes spaces (so "Philippines 1047" == "Philippines1047")
 *
 * NOTE: removing spaces is intentional because your DB has mixed formats
 * (e.g., "Philippines1047", "Japan 1079", "Singapore\t1290").
 */
function normExpr(string $sqlIdentOrParamExpr): string {
    // Replace TAB with '' then remove spaces then TRIM.
    // Use nested REPLACE to normalize.
    return "REPLACE(REPLACE(LTRIM(RTRIM($sqlIdentOrParamExpr)), CHAR(9), ''), ' ', '')";
}

$countryColNorm  = normExpr('[Country]');
$countryParamNorm = normExpr('?');
$countryMatch    = "$countryColNorm = $countryParamNorm";

$catColNorm      = normExpr('[CategoryName]');
$catParamNorm    = normExpr('?');
$categoryMatch   = "$catColNorm = $catParamNorm";

// -----------------------
// 1) Discover existing columns
// -----------------------
try {
    $colStmt = $pdo->prepare("
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ");
    $colStmt->execute([$schema, $table]);
    $existingCols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
    $existingSet = array_flip($existingCols);
} catch (Throwable $e) {
    out(['error' => 'Failed reading table metadata', 'detail' => $e->getMessage()], 500);
}

// -----------------------
// 2) Build SELECT list only from columns that exist
// -----------------------
$selectCols = [];

foreach ($baseColumns as $col) {
    if (isset($existingSet[$col])) {
        $selectCols[] = "[$col]";
    }

    $friendly = ($col === 'DeliveryDate_EndDate')
        ? 'DeliveryDate_FriendlyName'
        : $col . '_FriendlyName';

    if (isset($existingSet[$friendly])) {
        $selectCols[] = "[$friendly] AS [{$col}_FriendlyMapped]";
    }

    $kb = ($col === 'DeliveryDate_EndDate')
        ? 'DeliveryDate_KB'
        : $col . '_KB';

    if (isset($existingSet[$kb])) {
        $selectCols[] = "[$kb] AS [{$col}_KBMapped]";
    }
}

if (!$selectCols) {
    out(['error' => "No matching columns found in {$schema}.{$table}"], 500);
}

$colStr = implode(', ', $selectCols);

// -----------------------
// 3) Queries
// -----------------------
$rowCountry = [];
$rowBoth = [];

try {
    // Country-only fallback
    $stmt1 = $pdo->prepare("
        SELECT TOP 1 $colStr
        FROM [$schema].[$table]
        WHERE $countryMatch
    ");
    $stmt1->execute([$country]);
    $rowCountry = $stmt1->fetch() ?: [];

    // Country + Category override
    if ($category !== '' && $category !== '#') {
        $stmt2 = $pdo->prepare("
            SELECT TOP 1 $colStr
            FROM [$schema].[$table]
            WHERE $countryMatch AND $categoryMatch
        ");
        $stmt2->execute([$country, $category]);
        $rowBoth = $stmt2->fetch() ?: [];
    }
} catch (Throwable $e) {
    out(['error' => 'Query failed', 'detail' => $e->getMessage()], 500);
}

// -----------------------
// 4) Build output
// -----------------------
$final = ['values' => [], 'articles' => [], 'links' => []];

foreach ($baseColumns as $col) {
    $final['values'][$col] =
        $rowBoth[$col] ?? $rowCountry[$col] ?? 'Not Found';

    $final['articles'][$col] =
        $rowBoth[$col . '_FriendlyMapped'] ?? $rowCountry[$col . '_FriendlyMapped'] ?? 'Not Found';

    $final['links'][$col] =
        $rowBoth[$col . '_KBMapped'] ?? $rowCountry[$col . '_KBMapped'] ?? '#';
}

// -----------------------
// 5) Debug info
// -----------------------
if ($debug === 1) {
    try {
        $dbg = [];
        $dbg['received'] = ['country' => $country, 'category' => $category];

        $dbg['whoami'] = $pdo->query("
            SELECT @@SERVERNAME AS server_name, DB_NAME() AS database_name, SUSER_SNAME() AS login_name
        ")->fetch();

        $dbg['row_count'] = $pdo->query("
            SELECT COUNT(*) AS cnt FROM [$schema].[$table]
        ")->fetch();

        $stmt = $pdo->prepare("
            SELECT COUNT(*) AS cnt
            FROM [$schema].[$table]
            WHERE $countryMatch
        ");
        $stmt->execute([$country]);
        $dbg['matches_country'] = $stmt->fetch();

        if ($category !== '' && $category !== '#') {
            $stmt = $pdo->prepare("
                SELECT COUNT(*) AS cnt
                FROM [$schema].[$table]
                WHERE $countryMatch AND $categoryMatch
            ");
            $stmt->execute([$country, $category]);
            $dbg['matches_country_category'] = $stmt->fetch();
        }

        // Show normalized view to catch whitespace/tab issues quickly
        $dbg['sample_countries'] = $pdo->query("
            SELECT TOP 20
                [Country] AS raw_country,
                $countryColNorm AS normalized_country,
                COUNT(*) AS cnt
            FROM [$schema].[$table]
            GROUP BY [Country]
            ORDER BY cnt DESC
        ")->fetchAll();

        $dbg['sample_categories'] = $pdo->query("
            SELECT TOP 20
                [CategoryName] AS raw_category,
                $catColNorm AS normalized_category,
                COUNT(*) AS cnt
            FROM [$schema].[$table]
            GROUP BY [CategoryName]
            ORDER BY cnt DESC
        ")->fetchAll();

        $final['_debug'] = $dbg;
    } catch (Throwable $e) {
        // Don't fail the main response if debug fails
        $final['_debug_error'] = $e->getMessage();
    }
}

echo json_encode($final, JSON_UNESCAPED_UNICODE);
