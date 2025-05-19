/**
 * Animation Blending Utility
 * 
 * This utility provides functions to blend multiple animations together
 * in a single animation group, allowing for smooth transitions and
 * combinations of animations with different weights.
 */

// Global object for animation blending operations
window.AnimationBlender = {
    /**
     * Creates a blended animation group from multiple source animation groups
     * 
     * @param {String} name - Name for the new blended animation group
     * @param {BABYLON.Scene} scene - The Babylon.js scene
     * @param {Array} animations - Array of animation objects with format {animGroup: BABYLON.AnimationGroup, weight: number}
     * @returns {BABYLON.AnimationGroup} - New animation group with blended animations
     */
    createBlendedAnimation: function(name, scene, animations) {
        if (!scene || !animations || !animations.length) {
            console.error("[AnimationBlender] Missing required parameters");
            return null;
        }

        // Create a new animation group for the blended result
        const blendedGroup = new BABYLON.AnimationGroup(name, scene);
        
        // Track unique targets to avoid duplicates
        const processedTargets = new Map();
        
        // First, collect all unique animation targets and their animations
        animations.forEach(anim => {
            if (!anim.animGroup || !anim.weight) return;
            
            anim.animGroup.targetedAnimations.forEach(targetedAnim => {
                const target = targetedAnim.target;
                const targetId = this._getTargetId(target);
                
                if (!targetId) return;
                
                // Initialize target entry if it doesn't exist
                if (!processedTargets.has(targetId)) {
                    processedTargets.set(targetId, {
                        target: target,
                        animations: [],
                        properties: new Set()
                    });
                }
                
                const targetEntry = processedTargets.get(targetId);
                const property = targetedAnim.animation.targetProperty;
                
                // Skip if we already have this property for this target
                if (targetEntry.properties.has(property)) return;
                
                targetEntry.properties.add(property);
                targetEntry.animations.push({
                    animation: targetedAnim.animation,
                    weight: anim.weight
                });
            });
        });
        
        // Create blended animations for each unique target and property
        processedTargets.forEach(targetEntry => {
            const target = targetEntry.target;
            
            // For each property that has animations
            targetEntry.properties.forEach(property => {
                // Get all animations for this target and property
                const propertyAnimations = targetEntry.animations
                    .filter(anim => anim.animation.targetProperty === property);
                
                if (propertyAnimations.length === 0) return;
                
                if (propertyAnimations.length === 1) {
                    // If only one animation for this property, just clone it
                    const singleAnim = propertyAnimations[0].animation.clone();
                    blendedGroup.addTargetedAnimation(singleAnim, target);
                } else {
                    // Blend multiple animations for this property
                    const blendedAnimation = this._blendAnimations(
                        property, 
                        propertyAnimations,
                        target
                    );
                    
                    if (blendedAnimation) {
                        blendedGroup.addTargetedAnimation(blendedAnimation, target);
                    }
                }
            });
        });

        console.log(`[AnimationBlender] Created blended animation '${name}' with ${blendedGroup.targetedAnimations.length} targeted animations`);
        return blendedGroup;
    },

    /**
     * Blend multiple animations affecting the same property on the same target
     * 
     * @param {String} property - Property being animated (e.g. "position", "rotationQuaternion")
     * @param {Array} animations - Array of {animation, weight} objects to blend
     * @param {Object} target - The target object
     * @returns {BABYLON.Animation} - New blended animation
     */
    _blendAnimations: function(property, animations, target) {
        if (animations.length === 0) return null;
        
        // Determine animation type based on the first animation
        const firstAnim = animations[0].animation;
        const dataType = firstAnim.dataType;
        const loopMode = firstAnim.loopMode;
        const frameRate = firstAnim.frameRate || 30;
        
        // Create a new animation for the blend result
        const blendedAnimation = new BABYLON.Animation(
            `blended_${property}_${Date.now()}`,
            property,
            frameRate,
            dataType,
            loopMode
        );
        
        // Find the global frame range across all animations
        let minFrame = Number.MAX_VALUE;
        let maxFrame = Number.MIN_VALUE;
        
        animations.forEach(anim => {
            const keys = anim.animation.getKeys();
            if (keys.length > 0) {
                minFrame = Math.min(minFrame, keys[0].frame);
                maxFrame = Math.max(maxFrame, keys[keys.length - 1].frame);
            }
        });
        
        if (minFrame === Number.MAX_VALUE || maxFrame === Number.MIN_VALUE) {
            return null; // No valid frames found
        }
        
        // Normalize weights to sum to 1.0
        const totalWeight = animations.reduce((sum, anim) => sum + anim.weight, 0);
        animations.forEach(anim => {
            anim.normalizedWeight = anim.weight / totalWeight;
        });
        
        // Generate keys at each unique frame point
        const allFrames = new Set();
        animations.forEach(anim => {
            anim.animation.getKeys().forEach(key => {
                allFrames.add(key.frame);
            });
        });
        
        // Create blended keys for each unique frame
        const blendedKeys = [];
        const sortedFrames = Array.from(allFrames).sort((a, b) => a - b);
        
        // Process based on data type
        switch (dataType) {
            case BABYLON.Animation.ANIMATIONTYPE_VECTOR3:
                this._blendVector3Animations(sortedFrames, animations, blendedKeys);
                break;
                
            case BABYLON.Animation.ANIMATIONTYPE_QUATERNION:
                this._blendQuaternionAnimations(sortedFrames, animations, blendedKeys);
                break;
                
            case BABYLON.Animation.ANIMATIONTYPE_FLOAT:
                this._blendFloatAnimations(sortedFrames, animations, blendedKeys);
                break;
                
            case BABYLON.Animation.ANIMATIONTYPE_COLOR3:
                this._blendColor3Animations(sortedFrames, animations, blendedKeys);
                break;
                
            case BABYLON.Animation.ANIMATIONTYPE_COLOR4:
                this._blendColor4Animations(sortedFrames, animations, blendedKeys);
                break;
                
            case BABYLON.Animation.ANIMATIONTYPE_VECTOR2:
                this._blendVector2Animations(sortedFrames, animations, blendedKeys);
                break;
                
            default:
                console.warn(`[AnimationBlender] Unsupported data type: ${dataType}`);
                return null;
        }
        
        blendedAnimation.setKeys(blendedKeys);
        return blendedAnimation;
    },
    
    /**
     * Helper to blend Vector3 animations
     */
    _blendVector3Animations: function(frames, animations, blendedKeys) {
        frames.forEach(frame => {
            const blendedValue = new BABYLON.Vector3(0, 0, 0);
            let totalWeight = 0;
            
            animations.forEach(anim => {
                const value = this._getValueAtFrame(anim.animation, frame);
                if (value) {
                    blendedValue.addInPlace(value.scale(anim.normalizedWeight));
                    totalWeight += anim.normalizedWeight;
                }
            });
            
            if (totalWeight > 0) {
                // Rescale if some animations didn't have values at this frame
                if (totalWeight < 1) {
                    blendedValue.scaleInPlace(1 / totalWeight);
                }
                blendedKeys.push({ frame, value: blendedValue });
            }
        });
    },
    
    /**
     * Helper to blend Quaternion animations (used for rotations)
     */
    _blendQuaternionAnimations: function(frames, animations, blendedKeys) {
        frames.forEach(frame => {
            // For quaternions, we need SLERP (spherical linear interpolation)
            let resultQuat = null;
            let remainingWeight = 1.0;
            
            // Sort by weight, descending
            const sortedAnims = [...animations].sort((a, b) => b.normalizedWeight - a.normalizedWeight);
            
            sortedAnims.forEach(anim => {
                const value = this._getValueAtFrame(anim.animation, frame);
                if (!value) return;
                
                if (!resultQuat) {
                    // First quaternion becomes the starting point
                    resultQuat = value.clone();
                    remainingWeight -= anim.normalizedWeight;
                } else if (remainingWeight > 0) {
                    // Calculate how much this quaternion should contribute to the remainder
                    const proportionalWeight = anim.normalizedWeight / remainingWeight;
                    
                    // Use SLERP to blend the quaternions
                    BABYLON.Quaternion.SlerpToRef(
                        resultQuat,
                        value,
                        proportionalWeight,
                        resultQuat
                    );
                    
                    remainingWeight -= anim.normalizedWeight;
                }
            });
            
            if (resultQuat) {
                blendedKeys.push({ frame, value: resultQuat });
            }
        });
    },
    
    /**
     * Helper to blend float animations
     */
    _blendFloatAnimations: function(frames, animations, blendedKeys) {
        frames.forEach(frame => {
            let blendedValue = 0;
            let totalWeight = 0;
            
            animations.forEach(anim => {
                const value = this._getValueAtFrame(anim.animation, frame);
                if (value !== null && value !== undefined) {
                    blendedValue += value * anim.normalizedWeight;
                    totalWeight += anim.normalizedWeight;
                }
            });
            
            if (totalWeight > 0) {
                // Rescale if some animations didn't have values at this frame
                if (totalWeight < 1) {
                    blendedValue /= totalWeight;
                }
                blendedKeys.push({ frame, value: blendedValue });
            }
        });
    },
    
    /**
     * Helper to blend Color3 animations
     */
    _blendColor3Animations: function(frames, animations, blendedKeys) {
        frames.forEach(frame => {
            const blendedValue = new BABYLON.Color3(0, 0, 0);
            let totalWeight = 0;
            
            animations.forEach(anim => {
                const value = this._getValueAtFrame(anim.animation, frame);
                if (value) {
                    blendedValue.r += value.r * anim.normalizedWeight;
                    blendedValue.g += value.g * anim.normalizedWeight;
                    blendedValue.b += value.b * anim.normalizedWeight;
                    totalWeight += anim.normalizedWeight;
                }
            });
            
            if (totalWeight > 0) {
                // Rescale if some animations didn't have values at this frame
                if (totalWeight < 1) {
                    blendedValue.r /= totalWeight;
                    blendedValue.g /= totalWeight;
                    blendedValue.b /= totalWeight;
                }
                blendedKeys.push({ frame, value: blendedValue });
            }
        });
    },
    
    /**
     * Helper to blend Color4 animations
     */
    _blendColor4Animations: function(frames, animations, blendedKeys) {
        frames.forEach(frame => {
            const blendedValue = new BABYLON.Color4(0, 0, 0, 0);
            let totalWeight = 0;
            
            animations.forEach(anim => {
                const value = this._getValueAtFrame(anim.animation, frame);
                if (value) {
                    blendedValue.r += value.r * anim.normalizedWeight;
                    blendedValue.g += value.g * anim.normalizedWeight;
                    blendedValue.b += value.b * anim.normalizedWeight;
                    blendedValue.a += value.a * anim.normalizedWeight;
                    totalWeight += anim.normalizedWeight;
                }
            });
            
            if (totalWeight > 0) {
                // Rescale if some animations didn't have values at this frame
                if (totalWeight < 1) {
                    blendedValue.r /= totalWeight;
                    blendedValue.g /= totalWeight;
                    blendedValue.b /= totalWeight;
                    blendedValue.a /= totalWeight;
                }
                blendedKeys.push({ frame, value: blendedValue });
            }
        });
    },
    
    /**
     * Helper to blend Vector2 animations
     */
    _blendVector2Animations: function(frames, animations, blendedKeys) {
        frames.forEach(frame => {
            const blendedValue = new BABYLON.Vector2(0, 0);
            let totalWeight = 0;
            
            animations.forEach(anim => {
                const value = this._getValueAtFrame(anim.animation, frame);
                if (value) {
                    blendedValue.x += value.x * anim.normalizedWeight;
                    blendedValue.y += value.y * anim.normalizedWeight;
                    totalWeight += anim.normalizedWeight;
                }
            });
            
            if (totalWeight > 0) {
                // Rescale if some animations didn't have values at this frame
                if (totalWeight < 1) {
                    blendedValue.x /= totalWeight;
                    blendedValue.y /= totalWeight;
                }
                blendedKeys.push({ frame, value: blendedValue });
            }
        });
    },
    
    /**
     * Get the value of an animation at a specific frame
     * Using interpolation if the frame is between keyframes
     * 
     * @param {BABYLON.Animation} animation - The animation to get the value from
     * @param {number} frame - The frame to get the value at
     * @returns {any} The value at the frame
     */
    _getValueAtFrame: function(animation, frame) {
        const keys = animation.getKeys();
        if (keys.length === 0) return null;
        
        // If frame is before or at first keyframe
        if (frame <= keys[0].frame) return keys[0].value;
        
        // If frame is after or at last keyframe
        if (frame >= keys[keys.length - 1].frame) return keys[keys.length - 1].value;
        
        // Find the two keyframes surrounding the frame
        let lowerKeyIndex = 0;
        for (let i = 0; i < keys.length - 1; i++) {
            if (frame >= keys[i].frame && frame < keys[i + 1].frame) {
                lowerKeyIndex = i;
                break;
            }
        }
        
        const lowerKey = keys[lowerKeyIndex];
        const upperKey = keys[lowerKeyIndex + 1];
        
        // Calculate the interpolation factor (0-1)
        const range = upperKey.frame - lowerKey.frame;
        const delta = frame - lowerKey.frame;
        const gradient = range === 0 ? 0 : delta / range;
        
        // Interpolate based on the animation's data type
        const dataType = animation.dataType;
        
        switch (dataType) {
            case BABYLON.Animation.ANIMATIONTYPE_FLOAT:
                return lowerKey.value + (upperKey.value - lowerKey.value) * gradient;
                
            case BABYLON.Animation.ANIMATIONTYPE_VECTOR3:
                return BABYLON.Vector3.Lerp(lowerKey.value, upperKey.value, gradient);
                
            case BABYLON.Animation.ANIMATIONTYPE_VECTOR2:
                return BABYLON.Vector2.Lerp(lowerKey.value, upperKey.value, gradient);
                
            case BABYLON.Animation.ANIMATIONTYPE_QUATERNION:
                return BABYLON.Quaternion.Slerp(lowerKey.value, upperKey.value, gradient);
                
            case BABYLON.Animation.ANIMATIONTYPE_COLOR3:
                return BABYLON.Color3.Lerp(lowerKey.value, upperKey.value, gradient);
                
            case BABYLON.Animation.ANIMATIONTYPE_COLOR4:
                return BABYLON.Color4.Lerp(lowerKey.value, upperKey.value, gradient);
                
            default:
                console.warn(`[AnimationBlender] Interpolation for data type ${dataType} not implemented`);
                return lowerKey.value;
        }
    },
    
    /**
     * Generate a unique ID for a target to track it in our maps
     * 
     * @param {Object} target - Animation target (could be a mesh, bone, etc.)
     * @returns {String} A unique identifier for the target
     */
    _getTargetId: function(target) {
        if (!target) return null;
        
        // Different types of targets need different ID strategies
        if (target instanceof BABYLON.TransformNode) {
            return `node_${target.uniqueId}`;
        } else if (target instanceof BABYLON.Mesh) {
            return `mesh_${target.uniqueId}`;
        } else if (target instanceof BABYLON.Bone) {
            return `bone_${target.uniqueId}`;
        } else if (target.name && target.influence !== undefined) {
            // Likely a morph target
            return `morph_${target.name}`;
        }
        
        // Last resort - use the uniqueId if available or a random ID
        return target.uniqueId ? `obj_${target.uniqueId}` : `unknown_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Dynamically update the weights of animations in a blended group
     * Creates a new animation group with the updated weights
     * 
     * @param {BABYLON.AnimationGroup} blendedGroup - Original blended animation group
     * @param {BABYLON.Scene} scene - The Babylon.js scene
     * @param {Array} animations - Array of animation objects with format {animGroup: BABYLON.AnimationGroup, weight: number}
     * @returns {BABYLON.AnimationGroup} - New animation group with updated weights
     */
    updateBlendWeights: function(blendedGroup, scene, animations) {
        if (!blendedGroup || !scene || !animations || !animations.length) {
            console.error("[AnimationBlender] Missing required parameters for updateBlendWeights");
            return null;
        }
        
        // Create a new blended group with updated weights
        const updatedGroup = this.createBlendedAnimation(
            blendedGroup.name + "_updated",
            scene,
            animations
        );
        
        // Copy playback state from original group
        if (blendedGroup.isPlaying) {
            const currentFrame = blendedGroup.targetedAnimations[0]?.animation?.currentFrame;
            updatedGroup.play(blendedGroup.loopAnimation);
            
            // Try to maintain the current frame position
            if (currentFrame !== undefined && updatedGroup.targetedAnimations.length > 0) {
                updatedGroup.goToFrame(currentFrame);
            }
        }
        
        return updatedGroup;
    }
};

/**
 * Extends the window.animationPlayer with blending capabilities
 */
if (window.animationPlayer) {
    // Add new methods to the existing animation player
    Object.assign(window.animationPlayer, {
        /**
         * Creates a blended animation from multiple animations with weights
         * 
         * @param {String} name - Name for the blended animation
         * @param {BABYLON.Scene} scene - The Babylon.js scene
         * @param {Array} animations - Array of {animGroup, weight} objects
         * @param {Boolean} autoPlay - Whether to play the animation immediately
         * @param {Boolean} loop - Whether the animation should loop
         * @returns {BABYLON.AnimationGroup} - The blended animation group
         */
        createBlendedAnimation: function(name, scene, animations, autoPlay = false, loop = false) {
            if (!scene || !animations || animations.length === 0) {
                console.error("[animationPlayer.createBlendedAnimation] Missing required parameters");
                return null;
            }
            
            // Create blended animation using the AnimationBlender
            const blendedGroup = window.AnimationBlender.createBlendedAnimation(name, scene, animations);
            
            if (blendedGroup) {
                blendedGroup.loopAnimation = loop;
                
                // Store as current if requested
                if (autoPlay) {
                    // Stop any current animation
                    this.stop();
                    
                    // Set and play the new blended animation
                    this.currentAnimation = blendedGroup;
                    blendedGroup.play(loop);
                    this.isPlaying = true;
                }
            }
            
            return blendedGroup;
        },
        
        /**
         * Load multiple animations and blend them together
         * 
         * @param {Array} animationsToBlend - Array of objects with {filename, folder, weight} 
         * @param {BABYLON.Scene} scene - The Babylon.js scene
         * @param {String} targetMeshName - Name of the target mesh
         * @param {String} blendedName - Name for the blended animation
         * @param {Boolean} autoPlay - Whether to play immediately
         * @param {Boolean} loop - Whether to loop the animation
         * @returns {Promise<BABYLON.AnimationGroup>} - Promise resolving to the blended animation group
         */
        loadAndBlendAnimations: async function(animationsToBlend, scene, targetMeshName, 
            blendedName = "blended_animation", autoPlay = false, loop = false) {
            
            if (!animationsToBlend || !Array.isArray(animationsToBlend) || animationsToBlend.length === 0) {
                console.error("[animationPlayer.loadAndBlendAnimations] No animations specified to blend");
                return null;
            }
            
            try {
                // Load all animations in parallel
                const loadPromises = animationsToBlend.map(animInfo => 
                    this.loadAnimation(
                        animInfo.filename, 
                        animInfo.folder, 
                        scene, 
                        targetMeshName, 
                        false, // Don't loop individual animations
                        true   // Use cache
                    )
                );
                
                // Wait for all animations to load
                const loadedAnimGroups = await Promise.all(loadPromises);
                
                // Check if all loaded successfully
                if (loadedAnimGroups.some(group => !group)) {
                    console.error("[animationPlayer.loadAndBlendAnimations] Some animations failed to load");
                    return null;
                }
                
                // Map loaded groups with weights
                const animationsWithWeights = loadedAnimGroups.map((group, index) => ({
                    animGroup: group,
                    weight: animationsToBlend[index].weight || 1.0
                }));
                
                // Create and return the blended animation
                return this.createBlendedAnimation(blendedName, scene, animationsWithWeights, autoPlay, loop);
                
            } catch (error) {
                console.error("[animationPlayer.loadAndBlendAnimations] Error blending animations:", error);
                return null;
            }
        },
        
        /**
         * Update the weights of a blended animation
         * 
         * @param {BABYLON.AnimationGroup} blendedGroup - The blended animation group to update
         * @param {BABYLON.Scene} scene - The Babylon.js scene
         * @param {Array} animations - Array of {animGroup, weight} objects with new weights
         * @returns {BABYLON.AnimationGroup} - Updated blended animation group
         */
        updateBlendWeights: function(blendedGroup, scene, animations) {
            if (!blendedGroup || !scene || !animations) {
                console.error("[animationPlayer.updateBlendWeights] Missing required parameters");
                return blendedGroup;
            }
            
            // Use the AnimationBlender to update weights
            const updatedGroup = window.AnimationBlender.updateBlendWeights(blendedGroup, scene, animations);
            
            // If this was the current animation, update the reference
            if (this.currentAnimation === blendedGroup) {
                this.currentAnimation = updatedGroup;
            }
            
            return updatedGroup;
        }
    });
}