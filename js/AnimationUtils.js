/**
 * Animation utilities for the Sign Language Animation Tool
 * This module contains helper functions for animation loading and management
 */

/**
 * Loads an animation asynchronously and returns a Promise
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {string} folder - The folder containing the animation ('zin_glb' or 'glos_glb')
 * @param {string} filename - The name of the animation file to load
 * @returns {Promise<Object>} A promise resolving to the loaded animation asset
 */
async function loadAnimationAsync(scene, folder, filename) {
    if (!filename) {
        console.warn("[loadAnimationAsync] No filename provided for folder:", folder);
        return null;
    }
    
    // Determine animation type from folder
    const type = folder.startsWith('zin') ? 'zin' : 'glos';
    
    // Get the base mesh asset from the global scope
    const baseMeshAsset = window.baseMeshAsset;
    
    if (!baseMeshAsset) {
        console.error("[loadAnimationAsync] Base mesh asset not available");
        return null;
    }

    // Check if animation is already loaded and cached
    if (window.allRetargetedAnimations && 
        window.allRetargetedAnimations[type] && 
        window.allRetargetedAnimations[type][filename]) {
        
        const cachedAnim = window.allRetargetedAnimations[type][filename];
        // Integrity check for the cached animation group
        if (cachedAnim && cachedAnim instanceof BABYLON.AnimationGroup && 
            typeof cachedAnim.start === 'function' && 
            typeof cachedAnim.enableBlending === 'function') {
            console.log(`[loadAnimationAsync] Returning cached animation ${filename}`);
            return {
                meshes: [],
                animationGroups: [cachedAnim],
                skeletons: []
            };
        } else {
            console.warn(`[loadAnimationAsync] Cached animation ${filename} seems corrupted. Will reload.`);
        }
    }

    const animFileUrl = `${folder}/${filename}`;
    console.log(`[loadAnimationAsync] Loading animation from: ${animFileUrl}`);

    try {
        // Load the animation file
        const loadedAsset = await BABYLON.SceneLoader.ImportMeshAsync("", animFileUrl.substring(0, animFileUrl.lastIndexOf('/') + 1), filename, scene);

        // Hide all meshes except root
        loadedAsset.meshes.forEach(mesh => {
            if (mesh.id !== "__root__" && baseMeshAsset.fetched.meshes.indexOf(mesh) === -1) {
                mesh.isVisible = false;
            }
        });

        // Process animation groups
        if (loadedAsset.animationGroups && loadedAsset.animationGroups.length > 0) {
            const animGroup = loadedAsset.animationGroups[0];
            animGroup.stop();
            console.log(`[loadAnimationAsync] Original AnimationGroup from ${filename}:`, animGroup);

            // Retarget animation with blendshapes
            const retargetedAnim = retargetAnimWithBlendshapes(
                baseMeshAsset,
                animGroup,
                `Retargeted_${type}_${filename.replace(/[^a-zA-Z0-9_]/g, '_')}`
            );

            if (retargetedAnim) {
                console.log(`[loadAnimationAsync] Successfully retargeted animation: ${filename}`);
                
                try {
                    retargetedAnim.name = filename; // Set name for easier identification
                } catch (e) {
                    console.warn(`[loadAnimationAsync] Could not set name on retargetedAnim: ${e.message}`);
                }
                
                // Initialize the animation cache if needed
                if (!window.allRetargetedAnimations) {
                    window.allRetargetedAnimations = {};
                }
                if (!window.allRetargetedAnimations[type]) {
                    window.allRetargetedAnimations[type] = {};
                }
                
                // Cache the retargeted animation
                window.allRetargetedAnimations[type][filename] = retargetedAnim;
                console.log(`[loadAnimationAsync] Stored retargeted animation in cache: ${filename}`);
                
                // Clean up the original animation group
                animGroup.dispose();
                
                // Return in the same format as the original loaded asset
                return {
                    meshes: loadedAsset.meshes,
                    animationGroups: [retargetedAnim],
                    skeletons: loadedAsset.skeletons
                };
            } else {
                console.error(`[loadAnimationAsync] retargetAnimWithBlendshapes returned null for ${filename}`);
                animGroup.dispose();
            }
        } else {
            console.warn(`[loadAnimationAsync] No animation groups found in ${filename}`);
        }
        
        return loadedAsset;
    } catch (error) {
        console.error(`[loadAnimationAsync] Error loading animation ${filename}:`, error);
    }
    
    return null;
}

// Export to window object for global access
window.loadAnimationAsync = loadAnimationAsync;