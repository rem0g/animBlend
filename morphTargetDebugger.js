/**
 * A utility for diagnosing morph target issues in Babylon.js animations
 */
const MorphTargetDebugger = {
    /**
     * Lists all morph targets present in a mesh asset
     * @param {Object} targetMeshAsset - The asset object containing meshes with morph targets
     */
    listAllMorphTargets: function(targetMeshAsset) {
        console.group("🔍 MorphTarget Debugger - Listing All Morph Targets");
        
        if (!targetMeshAsset || !targetMeshAsset.fetched || !targetMeshAsset.fetched.meshes) {
            console.error("Invalid mesh asset provided");
            console.groupEnd();
            return;
        }
        
        let foundMorphTargets = 0;
        
        // Process each mesh in the asset
        targetMeshAsset.fetched.meshes.forEach((mesh, meshIndex) => {
            if (mesh.morphTargetManager) {
                console.group(`Mesh ${meshIndex}: ${mesh.name}`);
                console.log(`Found ${mesh.morphTargetManager.numTargets} morph targets`);
                
                // List details for each morph target
                for (let i = 0; i < mesh.morphTargetManager.numTargets; i++) {
                    const target = mesh.morphTargetManager.getTarget(i);
                    console.log(`[${i}] ${target.name}, Current influence: ${target.influence}`);
                    foundMorphTargets++;
                }
                
                console.groupEnd();
            }
        });
        
        if (foundMorphTargets === 0) {
            console.warn("No morph targets found in any mesh");
        } else {
            console.log(`Total morph targets found: ${foundMorphTargets}`);
        }
        
        console.groupEnd();
    },
    
    /**
     * Shows all morph targets that are currently being animated
     * @param {BABYLON.AnimationGroup} animationGroup - The animation group to inspect
     */
    showAnimatedMorphTargets: function(animationGroup) {
        console.group(`🎭 MorphTarget Debugger - Animated Targets in ${animationGroup.name}`);
        
        if (!animationGroup || !animationGroup.targetedAnimations) {
            console.error("Invalid animation group provided");
            console.groupEnd();
            return;
        }
        
        let morphTargetAnimations = 0;
        
        // Find all animations targeting morph targets
        animationGroup.targetedAnimations.forEach((targetedAnim, index) => {
            if (targetedAnim.animation.targetProperty === "influence") {
                morphTargetAnimations++;
                
                // Show target details
                console.group(`MorphTarget Animation ${morphTargetAnimations}`);
                console.log(`Target: ${targetedAnim.target ? targetedAnim.target.name : 'null'}`);
                console.log(`Property: ${targetedAnim.animation.targetProperty}`);
                
                // Show some keyframe information
                const keys = targetedAnim.animation.getKeys();
                if (keys && keys.length > 0) {
                    console.log(`Keyframes: ${keys.length}`);
                    console.log(`First keyframe: frame ${keys[0].frame}, value ${keys[0].value}`);
                    console.log(`Last keyframe: frame ${keys[keys.length-1].frame}, value ${keys[keys.length-1].value}`);
                }
                
                console.groupEnd();
            }
        });
        
        console.log(`Found ${morphTargetAnimations} morph target animations out of ${animationGroup.targetedAnimations.length} total animations`);
        console.groupEnd();
    },
    
    /**
     * Creates a mapping between short morph target names (morphTargetX) and mesh-specific morph target names
     * @param {Object} targetMeshAsset - The asset object containing meshes with morph targets
     * @returns {Object} A mapping from short names to actual morph target objects
     */
    createMorphTargetMapping: function(targetMeshAsset) {
        const mapping = {};
        
        console.group("🗺️ MorphTarget Debugger - Creating Morph Target Mapping");
        
        if (!targetMeshAsset || !targetMeshAsset.fetched || !targetMeshAsset.fetched.meshes) {
            console.error("Invalid mesh asset provided");
            console.groupEnd();
            return mapping;
        }
        
        // Process each mesh in the asset
        targetMeshAsset.fetched.meshes.forEach((mesh) => {
            if (mesh.morphTargetManager) {
                // For each morph target in the manager
                for (let i = 0; i < mesh.morphTargetManager.numTargets; i++) {
                    const target = mesh.morphTargetManager.getTarget(i);
                    if (!target || !target.name) continue;
                    
                    // Add the full name to mapping
                    mapping[target.name] = target;
                    
                    // Check if the target name follows patterns like "glassesGuy_mesh_X_Y_MorphTarget"
                    let shortName = null;
                    
                    const pattern1 = /.*_(\d+)_MorphTarget$/;
                    const matches1 = target.name.match(pattern1);
                    if (matches1 && matches1.length === 2) {
                        shortName = `morphTarget${matches1[1]}`;
                    }
                    
                    const pattern2 = /.*_mesh_\d+_(\d+)_MorphTarget$/;
                    const matches2 = target.name.match(pattern2);
                    if (matches2 && matches2.length === 2) {
                        shortName = `morphTarget${matches2[1]}`;
                    }
                    
                    if (shortName) {
                        mapping[shortName] = target;
                        console.log(`Mapped: ${shortName} → ${target.name}`);
                    }
                }
            }
        });
        
        console.log(`Created ${Object.keys(mapping).length} mappings`);
        console.groupEnd();
        
        return mapping;
    }
};

// Add to window global for easy access from console
window.MorphTargetDebugger = MorphTargetDebugger;
