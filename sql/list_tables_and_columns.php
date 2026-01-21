<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/db.php';

try {
    $serverInfo = $pdo->query("
        SELECT @@SERVERNAME AS server_name, DB_NAME() AS database_name
    ")->fetch();

    // Pull everything in one query (fast)
    $stmt = $pdo->query("
        SELECT
            TABLE_SCHEMA  AS schema_name,
            TABLE_NAME    AS table_name,
            COLUMN_NAME   AS column_name,
            DATA_TYPE     AS data_type,
            CHARACTER_MAXIMUM_LENGTH AS char_max_len,
            NUMERIC_PRECISION AS numeric_precision,
            NUMERIC_SCALE AS numeric_scale,
            IS_NULLABLE   AS is_nullable,
            ORDINAL_POSITION AS ordinal_position
        FROM INFORMATION_SCHEMA.COLUMNS
        ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Group results: schema.table -> columns[]
    $grouped = [];
    foreach ($rows as $r) {
        $key = $r['schema_name'] . '.' . $r['table_name'];
        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'schema' => $r['schema_name'],
                'table'  => $r['table_name'],
                'columns' => []
            ];
        }
        $grouped[$key]['columns'][] = [
            'name' => $r['column_name'],
            'type' => $r['data_type'],
            'char_max_len' => $r['char_max_len'],
            'numeric_precision' => $r['numeric_precision'],
            'numeric_scale' => $r['numeric_scale'],
            'nullable' => $r['is_nullable'],
            'position' => $r['ordinal_position'],
        ];
    }

    // Convert map to list
    $tables = array_values($grouped);

    echo json_encode([
        'server' => $serverInfo,
        'table_count' => count($tables),
        'tables' => $tables,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'detail' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
