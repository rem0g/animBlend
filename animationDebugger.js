/**
 * Animation Debugger and Fixer Utility
 * This utility helps identify and fix common animation issues
 */
const AnimationDebugger = {
    /**
     * Find and log all null targets in an animation group
     * @param {BABYLON.AnimationGroup} animGroup - The animation group to inspect
     * @returns {Array} - List of indices with null targets
     */
    findNullTargets: function(animGroup) {
        if (!animGroup || !animGroup.targetedAnimations) {
            console.error("Invalid animation group provided");
            return [];
        }
        
        const nullTargets = [];
        animGroup.targetedAnimations.forEach((ta, index) => {
            if (!ta.target) {
                nullTargets.push(index);
            }
        });
        
        console.log(`Found ${nullTargets.length} null targets in ${animGroup.name}`);
        return nullTargets;
    },
    
    /**
     * Remove all targeted animations with null targets from an animation group
     * @param {BABYLON.AnimationGroup} animGroup - The animation group to clean
     * @returns {number} - Number of removed targets
     */
    removeNullTargets: function(animGroup) {
        if (!animGroup || !animGroup.targetedAnimations) {
            console.error("Invalid animation group provided");
            return 0;
        }
        
        const originalLength = animGroup.targetedAnimations.length;
        animGroup.targetedAnimations = animGroup.targetedAnimations.filter(ta => ta.target !== null);
        const removedCount = originalLength - animGroup.targetedAnimations.length;
        
        console.log(`Removed ${removedCount} null targets from ${animGroup.name}`);
        return removedCount;
    },
    
    /**
     * Fix common animation issues in the scene
     * @param {BABYLON.Scene} scene - The Babylon.js scene
     */
    fixAnimations: function(scene) {
        if (!scene) {
            console.error("No scene provided");
            return;
        }
        
        console.log(`Checking ${scene.animationGroups.length} animation groups for issues`);
        
        let totalFixed = 0;
        scene.animationGroups.forEach(group => {
            totalFixed += this.removeNullTargets(group);
        });
        
        console.log(`Fixed ${totalFixed} animation issues in total`);
    },
    
    /**
     * Inspect keyframe data for an animation to help diagnose issues
     * @param {BABYLON.Animation} animation - The animation to inspect
     */
    inspectKeyframes: function(animation) {
        if (!animation || !animation.getKeys) {
            console.error("Invalid animation provided");
            return;
        }
        
        const keys = animation.getKeys();
        console.group(`Keyframes for ${animation.name || 'unnamed animation'}`);
        console.log(`Total keyframes: ${keys.length}`);
        console.log(`Property: ${animation.targetProperty}`);
        console.log(`Data type: ${animation.dataType}`);
        
        if (keys.length > 0) {
            console.log("First keyframe:", keys[0]);
            console.log("Last keyframe:", keys[keys.length - 1]);
            console.log(`Animation range: ${keys[0].frame} to ${keys[keys.length - 1].frame}`);
        }
        
        console.groupEnd();
    },
    
    /**
     * Add enableBlending method to all animation groups in a scene
     * @param {BABYLON.Scene} scene - The Babylon.js scene
     */
    addBlendingToAllGroups: function(scene) {
        if (!scene) {
            console.error("No scene provided");
            return;
        }
        
        scene.animationGroups.forEach(group => {
            if (!group.enableBlending) {
                group.enableBlending = function(blendingSpeed) {
                    const speedValue = typeof blendingSpeed === "number" ? blendingSpeed : 0.1;
                    
                    // Enable blending on all animatables in this group
                    this.reset();
                    this.setWeightForAllAnimatables(0);
                    
                    for (let i = 0; i < this._targetedAnimations.length; i++) {
                        const targetedAnim = this._targetedAnimations[i];
                        if (targetedAnim && targetedAnim.animation) {
                            targetedAnim.animation.enableBlending = true;
                            targetedAnim.animation.blendingSpeed = speedValue;
                        }
                    }
                    
                    console.log(`Added blending to ${this.name} with speed ${speedValue}`);
                    return this;
                };
                
                console.log(`Added enableBlending method to ${group.name}`);
            }
        });
    }
};

// Make the debugger available globally
window.AnimationDebugger = AnimationDebugger;
