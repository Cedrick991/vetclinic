<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Sample Products</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        .product-list { margin: 20px 0; }
        .product-item { padding: 10px; border: 1px solid #ddd; margin: 5px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🛍️ Add Sample Products to Store</h1>

    <?php
    /**
     * Add Sample Products to Database
     */

    require_once '../db/database.php';

    try {
        $db = VetDatabase::getInstance();

        echo "<h2>Database Connection: ✅ SUCCESS</h2>\n";

        // Sample products data
        $sampleProducts = [
            [
                'name' => 'Premium Dog Food 5kg',
                'description' => 'High-quality dry dog food with balanced nutrition',
                'category' => 'Food',
                'price' => 1200.00,
                'stock' => 50
            ],
            [
                'name' => 'Cat Food Wet 400g',
                'description' => 'Nutritious wet cat food with real meat',
                'category' => 'Food',
                'price' => 180.00,
                'stock' => 100
            ],
            [
                'name' => 'Dog Toy Ball',
                'description' => 'Durable rubber ball for active dogs',
                'category' => 'Toys',
                'price' => 250.00,
                'stock' => 30
            ],
            [
                'name' => 'Pet Shampoo',
                'description' => 'Gentle shampoo for dogs and cats',
                'category' => 'Grooming',
                'price' => 220.00,
                'stock' => 25
            ],
            [
                'name' => 'Pet Collar',
                'description' => 'Adjustable collar with safety buckle',
                'category' => 'Accessories',
                'price' => 180.00,
                'stock' => 40
            ],
            [
                'name' => 'Dog Chew Bones',
                'description' => 'Natural beef-flavored chew bones',
                'category' => 'Food',
                'price' => 150.00,
                'stock' => 60
            ],
            [
                'name' => 'Cat Scratching Post',
                'description' => 'Sturdy scratching post with sisal rope',
                'category' => 'Accessories',
                'price' => 850.00,
                'stock' => 15
            ],
            [
                'name' => 'Flea Treatment',
                'description' => 'Monthly flea prevention treatment',
                'category' => 'Medicine',
                'price' => 450.00,
                'stock' => 20
            ]
        ];

        echo "<h3>Adding " . count($sampleProducts) . " sample products...</h3>\n";

        $addedCount = 0;
        foreach ($sampleProducts as $product) {
            try {
                $db->execute(
                    'INSERT INTO products (name, description, category, price, stock, is_active) VALUES (?, ?, ?, ?, ?, 1)',
                    [$product['name'], $product['description'], $product['category'], $product['price'], $product['stock']]
                );
                $addedCount++;
                echo "<div class='product-item'>";
                echo "<strong>✅ {$product['name']}</strong><br>";
                echo "Category: {$product['category']} | Price: ₱" . number_format($product['price'], 2) . " | Stock: {$product['stock']}";
                echo "</div>\n";
            } catch (Exception $e) {
                echo "<div class='product-item'>";
                echo "<strong>❌ {$product['name']}</strong><br>";
                echo "<span class='error'>Error: " . $e->getMessage() . "</span>";
                echo "</div>\n";
            }
        }

        echo "<h3 class='success'>✅ Successfully added {$addedCount} products!</h3>\n";

        // Show current products
        $products = $db->fetchAll('SELECT * FROM products WHERE is_active = 1 ORDER BY name');

        echo "<h3>Current Products in Database:</h3>\n";
        echo "<div class='product-list'>\n";

        foreach ($products as $product) {
            echo "<div class='product-item'>";
            echo "<strong>{$product['name']}</strong><br>";
            echo "ID: {$product['id']} | Category: {$product['category']} | Price: ₱" . number_format($product['price'], 2) . " | Stock: {$product['stock']}";
            if ($product['image']) {
                echo " | Image: {$product['image']}";
            }
            echo "</div>\n";
        }

        echo "</div>\n";

        echo "<h3 class='success'>🎉 Sample products added successfully!</h3>\n";
        echo "<p><a href='staff.html'>Go to Staff Dashboard</a> | <a href='client.html'>Go to Client Dashboard</a></p>\n";

    } catch (Exception $e) {
        echo "<h2 class='error'>❌ Database connection failed</h2>\n";
        echo "<p class='error'>Error: " . $e->getMessage() . "</p>\n";
    }
    ?>
</body>
</html>