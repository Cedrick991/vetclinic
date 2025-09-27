<?php
/**
 * Fix Products Image Column Migration
 * Adds missing 'image' column to products table
 */

require_once 'db/database.php';

try {
    $db = VetDatabase::getInstance();

    echo "🔧 Checking products table structure...\n";

    // Check current columns in products table
    $columns = $db->query("PRAGMA table_info(products)")->fetchAll(PDO::FETCH_ASSOC);

    echo "Current columns in products table:\n";
    foreach ($columns as $column) {
        echo "- {$column['name']} ({$column['type']})\n";
    }

    // Check if image column exists
    $hasImage = false;
    foreach ($columns as $column) {
        if ($column['name'] === 'image') {
            $hasImage = true;
            break;
        }
    }

    if ($hasImage) {
        echo "✅ Image column already exists in products table\n";
    } else {
        echo "❌ Image column missing. Adding it now...\n";

        // Add the image column
        $db->execute("ALTER TABLE products ADD COLUMN image TEXT");

        echo "✅ Successfully added image column to products table\n";

        // Verify the column was added
        $columns = $db->query("PRAGMA table_info(products)")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($columns as $column) {
            if ($column['name'] === 'image') {
                echo "✅ Verified: image column exists with type {$column['type']}\n";
                break;
            }
        }
    }

    // Check if there are any existing products
    $productCount = $db->query("SELECT COUNT(*) FROM products")->fetchColumn();
    echo "\n📊 Products in database: $productCount\n";

    if ($productCount > 0) {
        echo "ℹ️  Existing products will have NULL image values until updated\n";
    }

    echo "\n🎉 Migration completed successfully!\n";
    echo "You can now upload product images without database errors.\n";

} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>