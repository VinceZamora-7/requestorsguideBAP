<?php
// InfinityFree database connection
$host = "localhost";
$username = "root";
$password = "";
$dbname = "pocsv_db";

// Connect
$conn = new mysqli($host, $username, $password, $dbname);
if ($conn->connect_error) die("DB Connection failed: " . $conn->connect_error);

// -----------------------------------------
require __DIR__ . '/../vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

// COLUMN MAP
$columnMap = [
    "Country" => "Country",
    "With PII" => "With_PII",
    "" => "Blank1",
    " " => "Blank2",
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
    "  " => "Blank3",
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
    "" => "Blank4",
    "  " => "Blank5",
    "Supplier" => "Supplier",
    "" => "Blank6",
    "   " => "Blank7",
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_FILES['excel']) || $_FILES['excel']['error'] !== 0) {
        die("Please upload a valid Excel file.");
    }

    $filePath = $_FILES['excel']['tmp_name'];

    $spreadsheet = IOFactory::load($filePath);
    $sheet = $spreadsheet->getActiveSheet();
    $rows = $sheet->toArray(null, true, true, true);

    $headers = $rows[1];

    for ($i = 2; $i <= count($rows); $i++) {

        $row = $rows[$i];

        $sqlCols = [];
        $sqlVals = [];

        foreach ($headers as $colLetter => $excelHeader) {

            $excelHeader = trim($excelHeader);

            if (!isset($columnMap[$excelHeader])) {
                continue;
            }

            $dbCol = $columnMap[$excelHeader];
            $value = $conn->real_escape_string($row[$colLetter] ?? "");

            if (!in_array("`$dbCol`", $sqlCols)) {
                $sqlCols[] = "`$dbCol`";
                $sqlVals[] = "'$value'";
            }

        }

        if (!empty($sqlCols)) {
            $sql = "INSERT INTO compliance_rules (" . implode(",", $sqlCols) . ")
                    VALUES (" . implode(",", $sqlVals) . ")";
            $conn->query($sql);
        }
    }

    echo "<h2>Import complete! All rows were inserted (including blank cells).</h2>";
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Excel Import</title>
</head>
<body>
<h1>Upload Excel File</h1>
<form action="" method="POST" enctype="multipart/form-data">
    <input type="file" name="excel" accept=".xlsx,.xls" required>
    <button type="submit">Import</button>
</form>
</body>
</html>
