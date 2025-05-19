const fs = require('fs');
const path = require('path');
const fbx2gltf = require('fbx2gltf');

const sourceDirArg = process.argv[2];
const outputDirArg = process.argv[3];

if (!sourceDirArg || !outputDirArg) {
  console.error('Usage: node convert-fbx-to-glb.js <source_directory> <output_directory>');
  console.error('Example: node convert-fbx-to-glb.js ../glos ../glos_glb');
  process.exit(1);
}

// Resolve paths relative to the script's execution directory (react/)
const baseDir = process.cwd(); // This will be the 'react' directory when run via npm script
const sourceDir = path.resolve(baseDir, sourceDirArg);
const outputDir = path.resolve(baseDir, outputDirArg);

if (!fs.existsSync(sourceDir)) {
  console.error(`Source directory ${sourceDir} does not exist.`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  console.log(`Output directory ${outputDir} does not exist. Creating it...`);
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Scanning ${sourceDir} for .fbx files...`);
let fbxFileCount = 0;
const conversionPromises = [];

fs.readdirSync(sourceDir).forEach(file => {
  if (path.extname(file).toLowerCase() === '.fbx') {
    fbxFileCount++;
    const inputFile = path.join(sourceDir, file);
    const outputFileName = path.basename(file, '.fbx') + '.glb';
    const outputFile = path.join(outputDir, outputFileName);
    
    console.log(`Queueing conversion for "${inputFile}" to "${outputFile}"...`);
    
    // Pass options as an array of strings, e.g., ['--binary', '--embed'] for GLB output with embedded resources
    const promise = fbx2gltf(inputFile, outputFile, ['--binary', '--embed'])
      .then(() => {
        console.log(`Successfully converted "${file}" to "${outputFileName}"`);
      })
      .catch((error) => {
        console.error(`Failed to convert "${file}". Error: ${error.message || error}`);
      });
    conversionPromises.push(promise);
  }
});

if (fbxFileCount === 0) {
  console.log(`No .fbx files found in ${sourceDir}.`);
} else {
  console.log(`Waiting for ${fbxFileCount} conversions to complete...`);
  Promise.all(conversionPromises)
    .then(() => {
      console.log('All conversions finished.');
    })
    .catch(err => {
      console.error('An error occurred during the batch conversion process. Check individual file errors above.');
    });
}
