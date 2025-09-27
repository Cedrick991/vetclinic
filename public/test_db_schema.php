<?php
/**
 * Test Database Schema (Web Version)
 * Check if products table has image column
 */

require_once '../db/database.php';

try {
    $db = VetDatabase::getInstance();

    echo "<h2>🔍 Database Schema Test</h2>\n";

    // Check products table structure
    echo "<h3>Products Table Structure:</h3>\n";
    $columns = $db->query("PRAGMA table_info(products)")->fetchAll(PDO::FETCH_ASSOC);

    echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>\n";
    echo "<tr style='background: #f0f0f0;'><th>Column Name</th><th>Type</th><th>Nullable</th><th>Default</th><th>Primary Key</th></tr>\n";

    foreach ($columns as $column) {
        echo "<tr>\n";
        echo "<td>{$column['name']}</td>\n";
        echo "<td>{$column['type']}</td>\n";
        echo "<td>" . ($column['notnull'] ? 'NOT NULL' : 'NULL') . "</td>\n";
        echo "<td>{$column['dflt_value']}</td>\n";
        echo "<td>" . ($column['pk'] ? 'YES' : 'NO') . "</td>\n";
        echo "</tr>\n";
    }
    echo "</table>\n";

    // Test a simple query
    echo "<h3>Testing Query:</h3>\n";
    try {
        $testQuery = $db->execute("UPDATE products SET image = 'test.jpg' WHERE id = 1");
        echo "<p style='color: green;'>✅ Test query successful</p>\n";
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Test query failed: " . $e->getMessage() . "</p>\n";
    }

    // Check database file info
    echo "<h3>Database Information:</h3>\n";
    $dbInfo = $db->getDatabaseInfo();
    echo "<p><strong>Database Path:</strong> {$dbInfo['path']}</p>\n";
    echo "<p><strong>Database Size:</strong> " . number_format($dbInfo['size']) . " bytes</p>\n";
    echo "<p><strong>Tables:</strong> " . implode(', ', $dbInfo['tables']) . "</p>\n";

    echo "<h2>🎉 Schema test completed!</h2>\n";

} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ Database connection failed</h2>\n";
    echo "<p>Error: " . $e->getMessage() . "</p>\n";
}
?>