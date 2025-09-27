
<?php
/**
 * Add Veterinary Services
 * Updates schema and adds the 12 veterinary services requested by user
 */

require_once '../db/database.php';

try {
    // Get database instance
    $db = getDB();
    $pdo = $db->getConnection();

    echo "<h1>Adding Veterinary Services</h1>";

    // Step 1: Check and update schema
    echo "<h2>Step 1: Checking and updating database schema</h2>";

    // Check current columns
    $columns = $pdo->query("PRAGMA table_info(services)")->fetchAll(PDO::FETCH_ASSOC);
    $columnNames = array_column($columns, 'name');

    echo "<p>Current columns: " . implode(', ', $columnNames) . "</p>";

    // Add missing columns
    $missingColumns = [];

    if (!in_array('duration', $columnNames)) {
        $missingColumns[] = 'duration INTEGER DEFAULT 0';
    }

    if (!in_array('price', $columnNames)) {
        $missingColumns[] = 'price REAL DEFAULT 0.00';
    }

    if (!in_array('category', $columnNames)) {
        $missingColumns[] = 'category TEXT';
    }

    if (!empty($missingColumns)) {
        foreach ($missingColumns as $columnDef) {
            $columnName = trim(explode(' ', $columnDef)[0]);
            try {
                $pdo->exec("ALTER TABLE services ADD COLUMN {$columnDef}");
                echo "<p>✅ Added column: {$columnName}</p>";
            } catch (Exception $e) {
                echo "<p>⚠️  Could not add column {$columnName}: " . $e->getMessage() . "</p>";
            }
        }
    } else {
        echo "<p>✅ All required columns already exist!</p>";
    }

    // Step 2: Clear existing services and add new ones
    echo "<h2>Step 2: Adding veterinary services</h2>";

    // Clear all existing services
    $pdo->exec("DELETE FROM services");
    echo "<p>🗑️ Cleared existing services</p>";

    // Insert the 12 veterinary services requested by user
    $services = [
        [
            'name' => 'BASIC OBEDIENCE TRAINING',
            'description' => 'Basic obedience training for dogs including sit, stay, come, and leash walking',
            'duration' => 60,
            'price' => 1500.00,
            'category' => 'training'
        ],
        [
            'name' => 'DEWORMING',
            'description' => 'Internal parasite treatment and prevention for dogs and cats',
            'duration' => 30,
            'price' => 800.00,
            'category' => 'medical'
        ],
        [
            'name' => 'MICROCHIP IMPLANTING',
            'description' => 'Permanent identification microchip implantation for pets',
            'duration' => 15,
            'price' => 1200.00,
            'category' => 'medical'
        ],
        [
            'name' => 'VACCINATION',
            'description' => 'Annual vaccinations and boosters for dogs and cats',
            'duration' => 30,
            'price' => 950.00,
            'category' => 'medical'
        ],
        [
            'name' => 'PET BOARDING',
            'description' => 'Safe and comfortable boarding services for dogs and cats',
            'duration' => 1440, // 24 hours
            'price' => 500.00,
            'category' => 'boarding'
        ],
        [
            'name' => 'EXTERNAL PARASITE PREVENTION',
            'description' => 'Flea and tick prevention treatment and products',
            'duration' => 30,
            'price' => 650.00,
            'category' => 'medical'
        ],
        [
            'name' => 'EUTHANASIA',
            'description' => 'Compassionate euthanasia services with grief support',
            'duration' => 60,
            'price' => 2500.00,
            'category' => 'medical'
        ],
        [
            'name' => 'COMPREHENSIVE GENERAL CHECK UP',
            'description' => 'Complete physical examination and health assessment',
            'duration' => 45,
            'price' => 1200.00,
            'category' => 'medical'
        ],
        [
            'name' => 'GROOMING',
            'description' => 'Professional grooming services including bath, brush, and nail trim',
            'duration' => 90,
            'price' => 850.00,
            'category' => 'grooming'
        ],
        [
            'name' => 'DENTAL SURGERY',
            'description' => 'Dental cleaning, extractions, and oral surgery procedures',
            'duration' => 120,
            'price' => 3500.00,
            'category' => 'surgery'
        ],
        [
            'name' => 'SURGERY',
            'description' => 'General surgical procedures including spay, neuter, and other operations',
            'duration' => 180,
            'price' => 4500.00,
            'category' => 'surgery'
        ],
        [
            'name' => 'HOME SERVICE BY APPOINTMENT',
            'description' => 'Veterinary services provided in the comfort of your home',
            'duration' => 60,
            'price' => 2000.00,
            'category' => 'home_service'
        ]
    ];

    $insertStmt = $pdo->prepare("INSERT INTO services (name, description, duration, price, category, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))");

    foreach ($services as $service) {
        $insertStmt->execute([
            $service['name'],
            $service['description'],
            $service['duration'],
            $service['price'],
            $service['category']
        ]);
        echo "<p>✅ Added: {$service['name']}</p>";
    }

    // Step 3: Verify the services were inserted
    echo "<h2>Step 3: Verification</h2>";

    $countStmt = $pdo->query("SELECT COUNT(*) as count FROM services");
    $result = $countStmt->fetch(PDO::FETCH_ASSOC);

    echo "<p>Total services in database: " . $result['count'] . "</p>";

    // Show all services
    $allServicesStmt = $pdo->query("SELECT * FROM services ORDER BY name");
    $allServices = $allServicesStmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr style='background-color: #f0f0f0;'>";
    echo "<th style='padding: 8px;'>Name</th>";
    echo "<th style='padding: 8px;'>Description</th>";
    echo "<th style='padding: 8px;'>Duration (min)</th>";
    echo "<th style='padding: 8px;'>Price</th>";
    echo "<th style='padding: 8px;'>Category</th>";
    echo "</tr>";

    foreach ($allServices as $service) {
        echo "<tr>";
        echo "<td style='padding: 8px;'>{$service['name']}</td>";
        echo "<td style='padding: 8px;'>{$service['description']}</td>";
        echo "<td style='padding: 8px; text-align: center;'>{$service['duration']}</td>";
        echo "<td style='padding: 8px; text-align: right;'>₱" . number_format($service['price'], 2) . "</td>";
        echo "<td style='padding: 8px;'>{$service['category']}</td>";
        echo "</tr>";
    }

    echo "</table>";

    echo "<p>The services include training, medical treatments, grooming, surgery, and home services as requested.</p>";

} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ Error: " . $e->getMessage() . "</h2>";
    echo "<p>Please check the error details above and try again.</p>";
}
?>