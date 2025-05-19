/**
 * Animation Normalization Helper
 * 
 * This utility normalizes animations of different lengths to ensure they can be
 * properly blended together.
 */

window.NormalizationHelper = {
    /**
     * Normalizes an animation to match a target length
     * 
     * @param {BABYLON.AnimationGroup} animation - The animation to normalize
     * @param {number} targetLength - The target length in frames
     * @param {BABYLON.Scene} scene - The Babylon scene
     * @returns {BABYLON.AnimationGroup} - A new normalized animation group
     */
    normalizeAnimationLength: function(animation, targetLength, scene) {
        if (!animation || !scene || !targetLength) {
            console.error("[NormalizationHelper] Missing required parameters");
            return null;
        }

        // Create a new animation group
        const normalizedGroup = new BABYLON.AnimationGroup(`normalized_${animation.name}`, scene);
        
        // For each targeted animation
        animation.targetedAnimations.forEach(targetedAnim => {
            const target = targetedAnim.target;
            const originalAnim = targetedAnim.animation;
            
            // Get original keys
            const originalKeys = originalAnim.getKeys();
            if (originalKeys.length === 0) return;
            
            // Calculate the original animation range
            const originalStart = originalKeys[0].frame;
            const originalEnd = originalKeys[originalKeys.length - 1].frame;
            const originalRange = originalEnd - originalStart;
            
            if (originalRange <= 0) return;
            
            // Create a new animation
            const normalized = new BABYLON.Animation(
                `normalized_${originalAnim.name}`,
                originalAnim.targetProperty,
                originalAnim.framePerSecond,
                originalAnim.dataType,
                originalAnim.loopMode
            );
            
            // Create new keys by remapping the frames
            const newKeys = [];
            originalKeys.forEach(key => {
                const normalizedFrame = ((key.frame - originalStart) / originalRange) * targetLength;
                newKeys.push({
                    frame: normalizedFrame,
                    value: key.value
                });
            });
            
            normalized.setKeys(newKeys);
            normalizedGroup.addTargetedAnimation(normalized, target);
        });
        
        return normalizedGroup;
    },
    
    /**
     * Normalize multiple animations to have the same length
     * 
     * @param {Array<BABYLON.AnimationGroup>} animations - Animation groups to normalize
     * @param {BABYLON.Scene} scene - The Babylon scene
     * @returns {Array<BABYLON.AnimationGroup>} - Normalized animation groups
     */
    normalizeAnimationsToSameLength: function(animations, scene) {
        if (!animations || !scene || animations.length < 2) {
            console.error("[NormalizationHelper] Need at least two animations to normalize");
            return animations;
        }
        
        // Find the maximum length
        let maxLength = 0;
        animations.forEach(anim => {
            if (!anim || !anim.targetedAnimations || anim.targetedAnimations.length === 0) return;
            
            const keys = anim.targetedAnimations[0].animation.getKeys();
            if (!keys || keys.length === 0) return;
            
            const animLength = keys[keys.length - 1].frame - keys[0].frame;
            maxLength = Math.max(maxLength, animLength);
        });
        
        if (maxLength <= 0) {
            console.error("[NormalizationHelper] Could not determine maximum animation length");
            return animations;
        }
        
        // Normalize all animations to match the maximum length
        const normalizedAnimations = [];
        animations.forEach(anim => {
            if (!anim) {
                normalizedAnimations.push(null);
                return;
            }
            
            // Check if this animation needs normalization
            if (anim.targetedAnimations.length === 0) {
                normalizedAnimations.push(anim);
                return;
            }
            
            const keys = anim.targetedAnimations[0].animation.getKeys();
            if (keys.length === 0) {
                normalizedAnimations.push(anim);
                return;
            }
            
            const animLength = keys[keys.length - 1].frame - keys[0].frame;
            
            // If the animation already has the max length or is very close, don't normalize
            if (Math.abs(animLength - maxLength) < 0.001) {
                normalizedAnimations.push(anim);
                return;
            }
            
            // Create a normalized version of this animation
            const normalized = this.normalizeAnimationLength(anim, maxLength, scene);
            normalizedAnimations.push(normalized);
        });
        
        return normalizedAnimations;
    }
};
