<?php
// db.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$host     = "localhost";
$username = "root";
$password = "";
$dbname   = "pocsv_db";

$conn = new mysqli($host, $username, $password, $dbname);
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    // Do NOT echo JSON here (some pages are HTML).
    http_response_code(500);
    die("DB Connection failed.");
}
