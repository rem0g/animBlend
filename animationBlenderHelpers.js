// Implementation of helper functions for AnimationBlender
// This file will be included at the end of animationBlender.js

// Helper functions implementation
AnimationBlender_Helpers = {
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
    }
};

// Copy the helper methods to window.AnimationBlender
for (const method in AnimationBlender_Helpers) {
    window.AnimationBlender[method] = AnimationBlender_Helpers[method];
}
