<?php
// Include database configuration
require_once('../mysql_config_test.php');

// Set headers to allow cross-origin requests and JSON content type
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Get glossId from query parameters
$glossId = isset($_GET['glossId']) ? $_GET['glossId'] : '';

// Return error if glossId is not provided
if (empty($glossId)) {
    echo json_encode(['error' => 'Missing glossId parameter']);
    exit;
}

try {
    // Create database connection
    $conn = new mysqli($servername, $username, $password, $database);

    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }

    // Prepare SQL query to find filename by glossId
    $stmt = $conn->prepare("SELECT filename FROM mocap_files WHERE glos = ?");
    $stmt->bind_param("s", $glossId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // Get the filename
        $row = $result->fetch_assoc();
        $filename = $row['filename'];
        
        // Replace .fbx extension with .glb if it exists
        $glbFilename = str_replace('.fbx', '.glb', $filename);
        
        // Include debug info
        echo json_encode([
            'success' => true, 
            'filename' => $glbFilename,
            'originalFilename' => $filename,
            'glossId' => $glossId
        ]);
    } else {
        echo json_encode(['error' => 'No filename found for glossId: ' . $glossId]);
    }

    // Close connection
    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
