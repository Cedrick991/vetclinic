<?php
/**
 * Fix Products Image Column Migration
 * Adds missing 'image' column to products table
 * Web-accessible version
 */

require_once '../db/database.php';

try {
    $db = VetDatabase::getInstance();

    echo "<h2>🔧 Products Table Migration</h2>\n";
    echo "<p>Checking products table structure...</p>\n";

    // Check current columns in products table
    $columns = $db->query("PRAGMA table_info(products)")->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>Current columns in products table:</h3>\n";
    echo "<ul>\n";
    foreach ($columns as $column) {
        echo "<li>{$column['name']} ({$column['type']})</li>\n";
    }
    echo "</ul>\n";

    // Check if image column exists
    $hasImage = false;
    foreach ($columns as $column) {
        if ($column['name'] === 'image') {
            $hasImage = true;
            break;
        }
    }

    if ($hasImage) {
        echo "<p style='color: green;'>✅ Image column already exists in products table</p>\n";
    } else {
        echo "<p style='color: red;'>❌ Image column missing. Adding it now...</p>\n";

        // Add the image column
        $db->execute("ALTER TABLE products ADD COLUMN image TEXT");

        echo "<p style='color: green;'>✅ Successfully added image column to products table</p>\n";

        // Verify the column was added
        $columns = $db->query("PRAGMA table_info(products)")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($columns as $column) {
            if ($column['name'] === 'image') {
                echo "<p style='color: green;'>✅ Verified: image column exists with type {$column['type']}</p>\n";
                break;
            }
        }
    }

    // Check if there are any existing products
    $productCount = $db->query("SELECT COUNT(*) FROM products")->fetchColumn();
    echo "<h3>📊 Products in database: $productCount</h3>\n";

    if ($productCount > 0) {
        echo "<p>ℹ️ Existing products will have NULL image values until updated</p>\n";
    }

    echo "<h2>🎉 Migration completed successfully!</h2>\n";
    echo "<p>You can now upload product images without database errors.</p>\n";

    // Show a link to test the functionality
    echo "<p><a href='../public/staff.html' style='color: blue; text-decoration: none; padding: 10px 20px; background: #007bff; color: white; border-radius: 5px;'>Go to Staff Dashboard</a></p>\n";

} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ Migration failed</h2>\n";
    echo "<p>Error: " . $e->getMessage() . "</p>\n";
    exit(1);
}
?>