<?php
/**
 * Debug Products - Check what products exist and their image paths
 */

require_once 'db/database.php';

try {
    $db = VetDatabase::getInstance();

    echo "<h2>🔍 Products Debug</h2>\n";

    // Get all products
    $products = $db->fetchAll('SELECT * FROM products WHERE is_active = 1 ORDER BY name');

    if (empty($products)) {
        echo "<p style='color: red;'>❌ No products found in database!</p>\n";
        echo "<p>You need to add some products first.</p>\n";
        exit;
    }

    echo "<h3>Found " . count($products) . " products:</h3>\n";

    echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>\n";
    echo "<tr style='background: #f0f0f0;'><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Image Path</th><th>Image Exists</th></tr>\n";

    foreach ($products as $product) {
        $imagePath = $product['image'] ?? '';
        $imageExists = '';

        if (!empty($imagePath)) {
            $fullPath = __DIR__ . '/assets/images/products/' . $imagePath;
            $imageExists = file_exists($fullPath) ? '✅' : '❌';
        } else {
            $imageExists = 'No image';
        }

        echo "<tr>\n";
        echo "<td>{$product['id']}</td>\n";
        echo "<td>{$product['name']}</td>\n";
        echo "<td>{$product['category']}</td>\n";
        echo "<td>₱" . number_format($product['price'], 2) . "</td>\n";
        echo "<td>{$product['stock']}</td>\n";
        echo "<td>" . ($imagePath ?: 'No image path') . "</td>\n";
        echo "<td>{$imageExists}</td>\n";
        echo "</tr>\n";
    }
    echo "</table>\n";

    // Check if products directory exists
    $productsDir = __DIR__ . '/assets/images/products/';
    echo "<h3>Products Directory Check:</h3>\n";
    echo "<p><strong>Directory:</strong> {$productsDir}</p>\n";
    echo "<p><strong>Exists:</strong> " . (is_dir($productsDir) ? '✅' : '❌') . "</p>\n";

    if (is_dir($productsDir)) {
        $files = scandir($productsDir);
        $imageFiles = array_filter($files, function($file) {
            return preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $file);
        });

        echo "<p><strong>Image files found:</strong> " . count($imageFiles) . "</p>\n";
        if (!empty($imageFiles)) {
            echo "<ul>\n";
            foreach ($imageFiles as $file) {
                echo "<li>{$file}</li>\n";
            }
            echo "</ul>\n";
        }
    }

    echo "<h2>🎉 Debug completed!</h2>\n";

} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ Database connection failed</h2>\n";
    echo "<p>Error: " . $e->getMessage() . "</p>\n";
}
?>
