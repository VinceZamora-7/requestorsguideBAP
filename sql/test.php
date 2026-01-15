<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

$host = "localhost";
$username = "root";
$password = "";
$dbname = "pocsv_db";

$conn = new mysqli($host, $username, $password, $dbname);
if ($conn->connect_error) {
    die(json_encode(['error' => 'DB Connection failed', 'msg' => $conn->connect_error]));
}

echo json_encode(['success' => 'DB Connected']);
$conn->close();
