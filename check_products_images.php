
<?php
/**
 * Check and fix product image paths
 */

require_once 'db/database.php';

try {
    $db = VetDatabase::getInstance();

    echo "<h2>🔍 Product Images Check</h2>\n";

    // Get all products with images
    $products = $db->fetchAll('SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != ""');

    echo "<h3>Products with images in database:</h3>\n";
    echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>\n";
    echo "<tr style='background: #f0f0f0;'><th>ID</th><th>Name</th><th>Database Image Path</th><th>Status</th></tr>\n";

    $actualFiles = scandir('assets/images/products');
    $actualFiles = array_filter($actualFiles, function($file) {
        return $file !== '.' && $file !== '..' && $file !== '.gitkeep';
    });

    foreach ($products as $product) {
        $imagePath = $product['image'];
        $exists = in_array($imagePath, $actualFiles) ? '✅' : '❌';

        echo "<tr>\n";
        echo "<td>{$product['id']}</td>\n";
        echo "<td>{$product['name']}</td>\n";
        echo "<td>{$imagePath}</td>\n";
        echo "<td>{$exists}</td>\n";
        echo "</tr>\n";
    }
    echo "</table>\n";

    echo "<h3>Actual files in assets/images/products/:</h3>\n";
    echo "<ul>\n";
    foreach ($actualFiles as $file) {
        echo "<li>{$file}</li>\n";
    }
    echo "</ul>\n";

    // Fix mismatched paths
    echo "<h3>Fixing image paths...</h3>\n";
    $fixed = 0;
    foreach ($products as $product) {
        $imagePath = $product['image'];
        if (!in_array($imagePath, $actualFiles)) {
            // Try to find a matching file
            $found = false;
            foreach ($actualFiles as $actualFile) {
                // Check if the filename matches (ignoring path)
                $imageFilename = basename($imagePath);
                $actualFilename = basename($actualFile);

                if ($imageFilename === $actualFilename) {
                    echo "<p>Fixing product {$product['id']} ({$product['name']}): '{$imagePath}' → '{$actualFile}'</p>\n";

                    $db->execute('UPDATE products SET image = ? WHERE id = ?',
                        [$actualFile, $product['id']]);
                    $fixed++;
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                echo "<p style='color: orange;'>No match found for product {$product['id']} ({$product['name']}): '{$imagePath}'</p>\n";
            }
        }
    }

    echo "<p style='color: green; font-weight: bold;'>Fixed {$fixed} product image paths</p>\n";

    echo "<h2>🎉 Image check completed!</h2>\n";

} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ Error</h2>\n";
