<?php
/**
 * Test Profile Picture Upload
 * Check if users table has profile_picture column
 */

require_once 'db/database.php';

try {
    $db = VetDatabase::getInstance();

    echo "<h2>🔍 Profile Picture Test</h2>\n";

    // Check users table structure
    echo "<h3>Users Table Structure:</h3>\n";
    $columns = $db->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_ASSOC);

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

    // Check if profile_picture column exists
    $hasProfilePicture = false;
    foreach ($columns as $column) {
        if ($column['name'] === 'profile_picture') {
            $hasProfilePicture = true;
            break;
        }
    }

    if ($hasProfilePicture) {
        echo "<p style='color: green;'>✅ Profile picture column exists in users table</p>\n";

        // Test inserting a profile picture path
        echo "<h3>Testing Profile Picture Update:</h3>\n";
        try {
            // First check if there's a user with ID 1
            $user = $db->fetch("SELECT id FROM users WHERE id = 1");
            if ($user) {
                $db->execute("UPDATE users SET profile_picture = 'assets/images/profiles/test.jpg' WHERE id = 1");
                echo "<p style='color: green;'>✅ Test profile picture update successful</p>\n";
            } else {
                echo "<p style='color: orange;'>⚠️ No user with ID 1 found for testing</p>\n";
            }
        } catch (Exception $e) {
            echo "<p style='color: red;'>❌ Test profile picture update failed: " . $e->getMessage() . "</p>\n";
        }
    } else {
        echo "<p style='color: red;'>❌ Profile picture column does NOT exist in users table</p>\n";
        echo "<p>You need to add the profile_picture column to the users table:</p>\n";
        echo "<code>ALTER TABLE users ADD COLUMN profile_picture TEXT;</code>\n";
    }

    echo "<h2>🎉 Profile picture test completed!</h2>\n";

} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ Database connection failed</h2>\n";
    echo "<p>Error: " . $e->getMessage() . "</p>\n";
}
?>