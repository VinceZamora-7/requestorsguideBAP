<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// ✅ shared connection
require_once __DIR__ . '/db.php';

require_once __DIR__ . '/../vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

// ✅ COLUMN MAP (unchanged content, just keep it)
$columnMap = [
    "Country" => "Country",
    "With PII" => "With_PII",

    // NOTE: your map has duplicates like "" / " " / "  " etc.
    // In PHP arrays, duplicate keys overwrite earlier ones.
    // If you truly need multiple blank columns, you must use UNIQUE keys.
    // For now, keep only the real headers used in Excel.
    "PO Owner" => "PO_Owner",
    "Friendly name" => "PO_Owner_FriendlyName",
    "KB" => "PO_Owner_KB",
    "Global Policy" => "PO_Owner_GlobalPolicy",

    "Company Code" => "CompanyCode",
    "Friendly name2" => "CompanyCode_FriendlyName",
    "KB2" => "CompanyCode_KB",
    "Global Policy2" => "CompanyCode_GlobalPolicy",

    "Tier" => "Tier",
    "Tier KB" => "Tier_KB",

    "Shipping Location" => "ShippingLocation",
    "Friendly name3" => "ShippingLocation_FriendlyName",
    "KB3" => "ShippingLocation_KB",
    "Global Policy3" => "ShippingLocation_GlobalPolicy",

    "PO Title" => "POTitle",
    "Friendly name4" => "POTitle_FriendlyName",
    "KB4" => "POTitle_KB",
    "Global Policy4" => "POTitle_GlobalPolicy",

    "PO Description" => "PODescription",
    "Friendly name5" => "PODescription_FriendlyName",
    "KB5" => "PODescription_KB",
    "Global Policy5" => "PODescription_GlobalPolicy",

    "Invoice Approver" => "InvoiceApprover",
    "Friendly name6" => "InvoiceApprover_FriendlyName",
    "KB6" => "InvoiceApprover_KB",
    "Global Policy6" => "InvoiceApprover_GlobalPolicy",

    "Start Date" => "StartDate",
    "Friendly name7" => "StartDate_FriendlyName",
    "KB7" => "StartDate_KB",
    "Global Policy7" => "StartDate_GlobalPolicy",

    "Category Name" => "CategoryName",

    "Supplier" => "Supplier",

    "Line Item Description" => "LineItemDescription",
    "Friendly name8" => "LineItemDescription_FriendlyName",
    "KB8" => "LineItemDescription_KB",
    "Global Policy8" => "LineItemDescription_GlobalPolicy",

    "Delivery Date / End Date" => "DeliveryDate_EndDate",
    "Friendly name9" => "DeliveryDate_FriendlyName",
    "KB9" => "DeliveryDate_KB",
    "Global Policy9" => "DeliveryDate_GlobalPolicy",

    "Currency" => "Currency",
    "Friendly name10" => "Currency_FriendlyName",
    "KB10" => "Currency_KB",
    "Global Policy10" => "Currency_GlobalPolicy",

    "Account Code" => "AccountCode",
    "Friendly name11" => "AccountCode_FriendlyName",
    "KB11" => "AccountCode_KB",
    "Global Policy11" => "AccountCode_GlobalPolicy",

    "IO Status" => "IOStatus",
    "Helper" => "IOStatus_Helper",
    "Friendly name12" => "IOStatus_FriendlyName",
    "BR" => "IOStatus_BR",
    "Global Policy12" => "IOStatus_GlobalPolicy",

    "Pre-Payment" => "PrePayment",
    "Friendly name13" => "PrePayment_FriendlyName",
    "BR13" => "PrePayment_BR",
    "Global Policy13" => "PrePayment_GlobalPolicy",

    "Mandatory Docs" => "MandatoryDocs",
    "Friendly name14" => "MandatoryDocs_FriendlyName",
    "BR14" => "MandatoryDocs_BR",
    "Global Policy14" => "MandatoryDocs_GlobalPolicy",

    "Treshold per Category" => "ThresholdPerCategory",
    "Friendly name15" => "ThresholdPerCategory_FriendlyName",
    "BR15" => "ThresholdPerCategory_BR",
    "Global Policy15" => "ThresholdPerCategory_GlobalPolicy",

    "Mandatory Docs as per Threshold" => "MandatoryDocsThreshold",
    "Friendly name16" => "MandatoryDocsThreshold_FriendlyName",
    "BR16" => "MandatoryDocsThreshold_BR",
    "Global Policy16" => "MandatoryDocsThreshold_GlobalPolicy",

    "Tax" => "Tax",
    "Friendly name17" => "Tax_FriendlyName",
    "KB17" => "Tax_KB",
    "Global Policy17" => "Tax_GlobalPolicy",

    "POE Review and Validation" => "POEReviewValidation",
    "Friendly name18" => "POEReviewValidation_FriendlyName",
    "KB18" => "POEReviewValidation_KB",
    "Global Policy18" => "POEReviewValidation_GlobalPolicy",

    "Email Notification list" => "EmailNotificationList",
    "Friendly name19" => "EmailNotificationList_FriendlyName",
    "KB19" => "EmailNotificationList_KB",
    "Global Policy19" => "EmailNotificationList_GlobalPolicy",

    "Interim Approver" => "InterimApprover",
    "Friendly name20" => "InterimApprover_FriendlyName",
    "KB20" => "InterimApprover_KB",
    "Global Policy20" => "InterimApprover_GlobalPolicy",

    "Safe Approver" => "SafeApprover",
    "Friendly name21" => "SafeApprover_FriendlyName",
    "KB21" => "SafeApprover_KB",
    "Global Policy21" => "SafeApprover_GlobalPolicy",

    "MS Signatory" => "MSSignatory",
    "Friendly name22" => "MSSignatory_FriendlyName",
    "KB22" => "MSSignatory_KB",
    "Global Policy22" => "MSSignatory_GlobalPolicy",

    "Business Justification" => "BusinessJustification",
    "Friendly name23" => "BusinessJustification_FriendlyName",
    "KB23" => "BusinessJustification_KB",

    "GO" => "GO",
    "Friendly name24" => "GO_FriendlyName",
    "KB24" => "GO_KB",
    "Global Policy24" => "GOG_GlobalPolicy"
];

$message = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_FILES['excel']) || $_FILES['excel']['error'] !== 0) {
        $message = "Please upload a valid Excel file.";
    } else {
        $filePath = $_FILES['excel']['tmp_name'];

        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        if (count($rows) < 2) {
            $message = "Excel file has no data rows.";
        } else {
            $headers = $rows[1]; // first row is header

            // Build mapping: Excel column letter => DB column name
            $excelToDb = [];
            foreach ($headers as $colLetter => $excelHeader) {
                $excelHeader = trim((string)$excelHeader);
                if ($excelHeader === "") continue;
                if (!isset($columnMap[$excelHeader])) continue;

                $dbCol = $columnMap[$excelHeader];
                $excelToDb[$colLetter] = $dbCol;
            }

            if (empty($excelToDb)) {
                $message = "No matching headers found. Check your Excel header row.";
            } else {

                // Prepared insert for each row (dynamic columns per row)
                $conn->begin_transaction();

                try {
                    for ($i = 2; $i <= count($rows); $i++) {
                        $row = $rows[$i];

                        $cols = [];
                        $placeholders = [];
                        $values = [];

                        foreach ($excelToDb as $colLetter => $dbCol) {
                            $cols[] = "`$dbCol`";
                            $placeholders[] = "?";

                            $cellVal = $row[$colLetter] ?? "";
                            if (is_array($cellVal)) $cellVal = ""; // safety
                            $values[] = (string)$cellVal;
                        }

                        // skip if entire row is empty
                        $allEmpty = true;
                        foreach ($values as $v) {
                            if (trim($v) !== "") { $allEmpty = false; break; }
                        }
                        if ($allEmpty) continue;

                        $sql = "INSERT INTO compliance_rules (" . implode(",", $cols) . ")
                                VALUES (" . implode(",", $placeholders) . ")";

                        $stmt = $conn->prepare($sql);
                        if (!$stmt) {
                            throw new Exception("Prepare failed: " . $conn->error);
                        }

                        $types = str_repeat("s", count($values));
                        $stmt->bind_param($types, ...$values);

                        if (!$stmt->execute()) {
                            throw new Exception("Insert failed (row $i): " . $stmt->error);
                        }

                        $stmt->close();
                    }

                    $conn->commit();
                    $message = "Import complete! Rows inserted successfully.";
                } catch (Exception $e) {
                    $conn->rollback();
                    $message = "Import failed: " . $e->getMessage();
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Excel Import</title>
    <meta charset="utf-8">
</head>
<body>
<h1>Upload Excel File</h1>

<?php if ($message): ?>
    <p><strong><?= htmlspecialchars($message) ?></strong></p>
<?php endif; ?>

<form action="" method="POST" enctype="multipart/form-data">
    <input type="file" name="excel" accept=".xlsx,.xls" required>
    <button type="submit">Import</button>
</form>
</body>
</html>
