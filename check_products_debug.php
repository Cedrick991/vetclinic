<?php
/**
 * Debug Products and Images
 * Check products in database and their image paths
 */

require_once 'db/database.php';

try {
    $db = VetDatabase::getInstance();

    echo "<h2>🔍 Products Debug</h2>\n";

    // Get all active products
    $products = $db->fetchAll('SELECT * FROM products WHERE is_active = 1 ORDER BY name');

    echo "<h3>Found " . count($products) . " active products:</h3>\n";

    if (count($products) > 0) {
        echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>\n";
        echo "<tr style='background: #f0f0f0;'><th>ID</th><th>Name</th><th>Category</th><th>Image Path</th><th>Price</th><th>Stock</th></tr>\n";

        foreach ($products as $product) {
            echo "<tr>\n";
            echo "<td>{$product['id']}</td>\n";
            echo "<td>{$product['name']}</td>\n";
            echo "<td>{$product['category']}</td>\n";
            echo "<td>" . ($product['image'] ?: 'No image') . "</td>\n";
            echo "<td>₱" . number_format($product['price'], 2) . "</td>\n";
            echo "<td>{$product['stock']}</td>\n";
            echo "</tr>\n";
        }
        echo "</table>\n";

        // Check if image files exist
        echo "<h3>Image File Existence Check:</h3>\n";
        foreach ($products as $product) {
            if ($product['image']) {
                $imagePath = 'assets/images/products/' . $product['image'];
                $fullPath = __DIR__ . '/' . $imagePath;
                $exists = file_exists($fullPath) ? '✅' : '❌';
                echo "<p>$exists {$product['name']}: $imagePath " . (file_exists($fullPath) ? '(EXISTS)' : '(MISSING)') . "</p>\n";
            }
        }
    } else {
        echo "<p style='color: orange;'>⚠️ No active products found in database</p>\n";
    }

    echo "<h2>🎉 Debug completed!</h2>\n";

} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ Database error</h2>\n";
    echo "<p>Error: " . $e->getMessage() . "</p>\n";
}
?>