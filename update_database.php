<?php
/**
 * Database Update Script
 * Adds email verification columns to existing database
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Database Update Script</h1>";
echo "<p>Updating database schema for email verification...</p>";

try {
    // Include database configuration
    require_once 'db/database.php';

    $db = getDB();
    $pdo = $db->getConnection();

    echo "<h2>Checking existing tables...</h2>";

    // Check current users table structure
    $columns = $pdo->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_ASSOC);
    $existingColumns = array_column($columns, 'name');

    echo "<h3>Current users table columns:</h3>";
    echo "<ul>";
    foreach ($existingColumns as $column) {
        echo "<li>$column</li>";
    }
    echo "</ul>";

    // Add missing columns for email verification and password reset
    $columnsToAdd = [
        'email_verification_token' => 'TEXT',
        'token_expiry' => 'DATETIME',
        'email_verified_at' => 'DATETIME',
        'password_reset_token' => 'TEXT',
        'reset_token_expiry' => 'DATETIME'
    ];

    foreach ($columnsToAdd as $columnName => $columnType) {
        if (!in_array($columnName, $existingColumns)) {
            echo "<p>Adding column: $columnName ($columnType)...</p>";
            try {
                $pdo->exec("ALTER TABLE users ADD COLUMN $columnName $columnType");
                echo "<p style='color: green;'>✅ Successfully added $columnName column</p>";
            } catch (Exception $e) {
                echo "<p style='color: red;'>❌ Failed to add $columnName column: " . $e->getMessage() . "</p>";
            }
        } else {
            echo "<p style='color: blue;'>ℹ️ Column $columnName already exists</p>";
        }
    }

    // Update existing users to be verified (since they were created before email verification)
    echo "<h2>Updating existing users...</h2>";
    try {
        $pdo->exec("UPDATE users SET is_active = 1, email_verified_at = datetime('now') WHERE is_active = 0 OR is_active IS NULL");
        echo "<p style='color: green;'>✅ Updated existing users to verified status</p>";
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Failed to update existing users: " . $e->getMessage() . "</p>";
    }

    // Verify final table structure
    echo "<h2>Final table structure:</h2>";
    $finalColumns = $pdo->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_ASSOC);
    echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>";
    echo "<tr style='background-color: #f0f0f0;'><th>Column</th><th>Type</th><th>Default</th></tr>";
    foreach ($finalColumns as $column) {
        echo "<tr>";
        echo "<td>{$column['name']}</td>";
        echo "<td>{$column['type']}</td>";
        echo "<td>{$column['dflt_value']}</td>";
        echo "</tr>";
    }
    echo "</table>";

    echo "<h2 style='color: green;'>✅ Database update completed successfully!</h2>";
    echo "<p>Email verification system is now ready to use.</p>";
    echo "<p><a href='index.html'>← Back to Homepage</a></p>";

} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ Database update failed:</h2>";
    echo "<p>Error: " . $e->getMessage() . "</p>";
    echo "<p>Please check your database configuration and try again.</p>";
}
?>
