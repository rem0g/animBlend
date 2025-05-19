/**
 * Animation Export Utility
 * 
 * This utility allows exporting animations to various formats
 */

window.AnimationExporter = {
    /**
     * Export an animation to a new GLTF/GLB file
     * 
     * @param {BABYLON.Scene} scene - The Babylon scene
     * @param {BABYLON.AnimationGroup} animation - The animation group to export
     * @param {BABYLON.AbstractMesh} mesh - The mesh with the animation
     * @param {String} filename - The filename to export to
     */
    exportToGLB: function(scene, animation, mesh, filename = "exported_animation.glb") {
        if (!scene || !animation || !mesh) {
            console.error("[AnimationExporter] Missing required parameters");
            return;
        }
        
        try {
            // Make sure GLTF exporter is available
            if (!BABYLON.GLTF2Export) {
                console.error("[AnimationExporter] GLTF Exporter not available");
                return;
            }
            
            // Clone the mesh to avoid modifying the original
            const clonedMesh = mesh.clone("export_" + mesh.name);
            
            // Create a new animation group with just this animation
            const exportAnimGroup = new BABYLON.AnimationGroup("export_" + animation.name, scene);
            
            // Add all targeted animations to the export group
            animation.targetedAnimations.forEach(targetedAnim => {
                // Find the corresponding target in the cloned mesh
                let target;
                
                if (targetedAnim.target === mesh) {
                    // If the target is the mesh itself, use the cloned mesh
                    target = clonedMesh;
                } else if (targetedAnim.target.name && targetedAnim.target.parent) {
                    // Try to find the corresponding bone or transform node
                    const targetName = targetedAnim.target.name;
                    
                    // Check if it's a bone
                    if (clonedMesh.skeleton) {
                        const bone = clonedMesh.skeleton.bones.find(b => b.name === targetName);
                        if (bone) {
                            target = bone;
                        }
                    }
                    
                    // If not found as a bone, look for transform nodes
                    if (!target) {
                        scene.transformNodes.forEach(node => {
                            if (node.name === targetName && node.parent === clonedMesh) {
                                target = node;
                            }
                        });
                    }
                }
                
                // If we found a corresponding target, add the animation
                if (target) {
                    const anim = targetedAnim.animation.clone();
                    exportAnimGroup.addTargetedAnimation(anim, target);
                }
            });
            
            // Create export options
            const options = {
                animationSampleRate: 30,
                exportWithoutWaitingForScene: true
            };
            
            // Export the scene with the animation
            BABYLON.GLTF2Export.GLBAsync(scene, filename, options).then(glb => {
                // Create download link
                const blob = new Blob([glb.glTFFiles.binary], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                
                // Clean up
                exportAnimGroup.dispose();
                clonedMesh.dispose();
                
                console.log(`[AnimationExporter] Exported animation as ${filename}`);
            }).catch(error => {
                console.error("[AnimationExporter] Export failed:", error);
                exportAnimGroup.dispose();
                clonedMesh.dispose();
            });
            
        } catch (error) {
            console.error("[AnimationExporter] Export failed:", error);
        }
    }
};
