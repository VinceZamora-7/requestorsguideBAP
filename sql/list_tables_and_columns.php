<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/db.php';

try {
    $schema = isset($_GET['schema']) ? trim((string)$_GET['schema']) : 'dbo';
    $table  = isset($_GET['table'])  ? trim((string)$_GET['table'])  : '';

    if ($table === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Missing parameter: table'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Allow-list validation (prevents injection)
    if (!preg_match('/^[A-Za-z0-9_]+$/', $schema) || !preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid schema/table'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $serverInfo = $pdo->query("SELECT @@SERVERNAME AS server_name, DB_NAME() AS database_name")->fetch();

    // Columns meta
    $colStmt = $pdo->prepare("
        SELECT
            COLUMN_NAME   AS name,
            DATA_TYPE     AS type,
            CHARACTER_MAXIMUM_LENGTH AS char_max_len,
            NUMERIC_PRECISION AS numeric_precision,
            NUMERIC_SCALE AS numeric_scale,
            IS_NULLABLE   AS is_nullable,
            ORDINAL_POSITION AS position
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
    ");
    $colStmt->execute([$schema, $table]);
    $columns = $colStmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$columns) {
        http_response_code(404);
        echo json_encode(['error' => "Table not found or no columns: $schema.$table"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // All rows
    $sql = "SELECT * FROM [$schema].[$table]";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'server' => $serverInfo,
        'schema' => $schema,
        'table'  => $table,
        'count'  => count($rows),
        'columns'=> $columns,
        'rows'   => $rows,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'  => 'Server error',
        'detail' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
