<?php
header('Content-Type: application/json');

// Determine the requested folder, default to 'zin_glb' if not specified.
$folder = isset($_GET['folder']) ? $_GET['folder'] : 'zin_glb';

// Whitelist of allowed folder names to prevent directory traversal issues.
$allowedFolders = ['zin_glb', 'glos_glb']; 

if (!in_array($folder, $allowedFolders)) {
    echo json_encode(['success' => false, 'error' => 'Invalid folder specified. Allowed folders are: ' . implode(', ', $allowedFolders)]);
    exit;
}

// Construct the full path to the directory.
// Assumes this PHP script is in the root of the slat2025 directory,
// and zin_glb, glos_glb are direct subdirectories.
$baseDir = __DIR__; // Gets the directory of the current script.
$dirPath = $baseDir . DIRECTORY_SEPARATOR . $folder;

$files = [];

if (is_dir($dirPath)) {
    if ($dh = opendir($dirPath)) {
        while (($file = readdir($dh)) !== false) {
            // Filter for .glb files, excluding . and ..
            if ($file != "." && $file != ".." && strtolower(pathinfo($file, PATHINFO_EXTENSION)) == "glb") {
                // Return the path relative to the web root (e.g., "zin_glb/animation.glb")
                // This makes it directly usable in client-side fetch/ImportMeshAsync calls.
                $files[] = $folder . "/" . $file;
            }
        }
        closedir($dh);
        sort($files); // Sort files alphabetically for consistent ordering.
        echo json_encode(['success' => true, 'files' => $files, 'folder' => $folder, 'path_used' => $dirPath]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Could not open directory: ' . $dirPath]);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Directory not found: ' . $dirPath . ' (Script location: ' . __DIR__ . ')']);
}
?>