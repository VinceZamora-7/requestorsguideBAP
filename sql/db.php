<?php
declare(strict_types=1);

/**
 * db.php
 * Shared PDO connection to Azure SQL (SQL Server).
 * IMPORTANT: Do NOT echo HTML here (it breaks JSON endpoints).
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);

$server   = "tcp:requestersguide-db.database.windows.net,1433";
$database = "pocsv_db";
$username = "codegenX";
$password = "microsoft@2026"; // <-- put your Azure SQL user password here


try {
    $pdo = new PDO(
        "sqlsrv:Server=$server;Database=$database;TrustServerCertificate=1",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,

            // Make sure encoding is UTF-8 (helps with special chars)
            PDO::SQLSRV_ATTR_ENCODING => PDO::SQLSRV_ENCODING_UTF8,
        ]
    );
} catch (PDOException $e) {
    // Let the caller decide how to output (JSON or HTML)
    throw $e;
}
