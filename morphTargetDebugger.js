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
     * Tests all possible morph target combinations to help diagnose mapping issues
     * @param {Object} targetMeshAsset - The mesh asset
     * @param {String} animationTarget - Name of the morph target in the animation (e.g., "morphTarget38")
     */
    testMorphTargetMapping: function(targetMeshAsset, animationTarget) {
        console.group(`🧪 MorphTarget Mapping Test for "${animationTarget}"`);
        
        if (!targetMeshAsset || !targetMeshAsset.fetched || !targetMeshAsset.fetched.meshes) {
            console.error("Invalid mesh asset provided");
            console.groupEnd();
            return;
        }
        
        // First check if the map has a direct entry
        const map = glassesGuyMap();
        const mappedName = map[animationTarget];
        console.log(`Map entry: ${animationTarget} → ${mappedName || "NOT FOUND"}`);
        
        // Search for morph targets in all meshes
        let found = false;
        targetMeshAsset.fetched.meshes.forEach((mesh, meshIndex) => {
            if (mesh.morphTargetManager) {
                for (let i = 0; i < mesh.morphTargetManager.numTargets; i++) {
                    const target = mesh.morphTargetManager.getTarget(i);
                    
                    if (target.name === animationTarget) {
                        console.log(`✅ Direct match found in mesh ${meshIndex} (${mesh.name}), target ${i}`);
                        found = true;
                    }
                    
                    if (target.name === mappedName) {
                        console.log(`✅ Mapped match found in mesh ${meshIndex} (${mesh.name}), target ${i}`);
                        found = true;
                    }
                }
            }
        });
        
        if (!found) {
            console.warn(`❌ No matching morph target found for "${animationTarget}" or its mapped name "${mappedName}"`);
        }
        
        console.groupEnd();
    }
};

// Add to window global for easy access from console
window.MorphTargetDebugger = MorphTargetDebugger;
