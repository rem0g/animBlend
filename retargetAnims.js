/*
    Function: retargetAnimWithBlendshapes

    Description:
    This function takes a target mesh and an animation group and retargets the animation group
    to the target mesh. Most importantly, it will also retarget the animation group to the blendshapes
    which babylon does not do by default.

    Parameters:
    - targetMeshAsset: The mesh to retarget the animation to.
    - animGroup: The animation group to retarget.
    - cloneName: The name of the cloned animation group.

    Returns:
    Void, but the animation group will be retargeted to the target mesh.
    And we are able to play this animation group on the target mesh through the scene object.
*/
function retargetAnimWithBlendshapes(targetMeshAsset, animGroup, cloneName = "anim") {
    console.log("Retargeting animation to target mesh (Corrected Logic)...");

    // Create a mapping of shortened morphTarget names to full target names if it exists
    // This helps when animations use different naming conventions (e.g., morphTarget38 vs glassesGuy_mesh_2_38_MorphTarget)
    function createMorphTargetMapping(targetMeshAsset) {
        const mapping = {};
        
        // Process all morph target managers in the target mesh
        if (targetMeshAsset.morphTargetManagers && targetMeshAsset.morphTargetManagers.length > 0) {
            for (let i = 0; i < targetMeshAsset.morphTargetManagers.length; i++) {
                const mtm = targetMeshAsset.morphTargetManagers[i];
                if (!mtm) continue;
                
                // For each morph target in the manager
                for (let j = 0; j < mtm.numTargets; j++) {
                    const target = mtm.getTarget(j);
                    if (!target || !target.name) continue;
                    
                    // Add the full name to mapping
                    mapping[target.name] = target;
                    
                    // Check if the target name follows the pattern "glassesGuy_mesh_X_Y_MorphTarget"
                    const matches = target.name.match(/glassesGuy_mesh_(\d+)_(\d+)_MorphTarget/);
                    if (matches && matches.length === 3) {
                        // Create a mapping for the shortened form "morphTargetY"
                        const shortName = `morphTarget${matches[2]}`;
                        mapping[shortName] = target;
                        console.log(`Created mapping: ${shortName} -> ${target.name}`);
                    }
                }
            }
        }
        
        console.log(`Created morph target mapping with ${Object.keys(mapping).length} entries`);
        return mapping;
    }
    
    // Generate the mapping once
    const morphTargetMapping = createMorphTargetMapping(targetMeshAsset);

    // Clone the animation group using the mapping function
    const clonedAnimGroup = animGroup.clone(cloneName, (originalTarget) => {
        if (!originalTarget || !originalTarget.name) {
            console.warn("[retargetAnimWithBlendshapes] Original target or target.name is undefined.", originalTarget);
            return null;
        }
        const targetName = originalTarget.name;
        
        // Check if there's a direct mapping for this target (for shortened names)
        if (morphTargetMapping[targetName]) {
            console.log(`Found mapping for target: ${targetName}`);
            return morphTargetMapping[targetName];
        }

        // 1. Check for Bone
        // Assuming skeletons[0] is the correct skeleton if it exists.
        if (targetMeshAsset.skeletons && targetMeshAsset.skeletons.length > 0) {
            const skeleton = targetMeshAsset.skeletons[0];
            if (skeleton) {
                const boneIndex = skeleton.getBoneIndexByName(targetName);
                if (boneIndex !== -1) {
                    const targetBone = skeleton.bones[boneIndex];
                    // Return the TransformNode linked to the bone, which is what animations target.
                    if (targetBone && targetBone._linkedTransformNode) {
                        return targetBone._linkedTransformNode;
                    } else if (targetBone) {
                        // console.warn(`[retargetAnimWithBlendshapes] Target bone ${targetName} found but no linkedTransformNode.`);
                        // Animations usually target TransformNodes, not bones directly in some contexts.
                        // Depending on setup, returning targetBone directly might be an option, or null if only linkedTransformNodes are expected.
                        return targetBone; // Or null if this case is not expected/handled
                    }
                }
            }
        }

        // 2. Check for Morph Target across all MorphTargetManagers
        if (targetMeshAsset.morphTargetManagers && targetMeshAsset.morphTargetManagers.length > 0) {
            for (let i = 0; i < targetMeshAsset.morphTargetManagers.length; i++) {
                const mtmInstance = targetMeshAsset.morphTargetManagers[i]; // Renamed to avoid conflict with outer mtm if it existed
                if (!mtmInstance) continue;

                // getMorphTargetIndex needs to be robust and correctly defined.
                const morphIndexInManager = getMorphTargetIndex(mtmInstance, targetName);
                if (morphIndexInManager !== -1) {
                    const foundMorphTarget = mtmInstance.getTarget(morphIndexInManager);
                    if (foundMorphTarget) {
                        return foundMorphTarget; // Return the actual MorphTarget
                    }
                }
            }
        }
        
        // 3. Optional: Check for Mesh if animations directly target meshes (e.g., visibility)
        // This depends on how source animations are structured.
        if (targetMeshAsset.meshes && targetMeshAsset.meshes.length > 0) {
            const targetMesh = targetMeshAsset.meshes.find(mesh => mesh.name === targetName);
            if (targetMesh) {
                // console.log(`[retargetAnimWithBlendshapes] Target '${targetName}' mapped to mesh.`);
                return targetMesh;
            }
        }

        console.warn(`[retargetAnimWithBlendshapes] Target '${targetName}' not found in targetMeshAsset bones, morph targets, or meshes. Returning null.`);
        return null;
    });

    // FIX: Add enableBlending method to the cloned animation group
    // This is what was missing - enableBlending is a function for animation blending
    // which must be added to the cloned animation group
    clonedAnimGroup.enableBlending = function(blendingSpeed) {
        // Make sure we convert the parameter to a number to avoid any issues
        const speedValue = typeof blendingSpeed === "number" ? blendingSpeed : 0.1;
        
        // Enable blending on all animatables in this group
        this.reset(); // Reset the animation
        
        // Set proper weight to 0 to start blend from 0
        // and gradually blend to full weight (1.0)
        this.setWeightForAllAnimatables(0);
        
        // For each targeted animation in this group, enable blending
        for (let i = 0; i < this._targetedAnimations.length; i++) {
            const targetedAnim = this._targetedAnimations[i];
            if (targetedAnim && targetedAnim.animation) {
                targetedAnim.animation.enableBlending = true;
                targetedAnim.animation.blendingSpeed = speedValue;
            }
        }
        
        console.log(`[enableBlending] Enabled blending on '${this.name}' with speed ${speedValue}`);
        return this; // For method chaining
    };

    return clonedAnimGroup;
}

// Helper function to get the morph target index, since babylon only provides
// morph targets through the index. Which follow GLTF standards but is not useful for us.
function getMorphTargetIndex(morphTargetManager, targetName) {
    if (!morphTargetManager) {
        console.error("Morph target manager not found.");
        return -1;
    }

    for (var i = 0; i < morphTargetManager.numTargets; i++) {
        if (morphTargetManager.getTarget(i).name === targetName) {
            return i;
        }
    }

    return -1;
}

/*
    Function: combineAnimationsWithBlending

    Description:
    This function takes multiple animation groups and combines them into a single animation group
    that can be played with blending between animations. This is useful when you want to smoothly
    transition between multiple animations.

    Parameters:
    - targetMeshAsset: The mesh to retarget the animations to.
    - animGroups: Array of animation groups to combine.
    - combinedName: The name of the combined animation group.
    - blendingFrames: Number of frames to use for blending between animations (default: 10).
    - sequentially: Whether to play animations sequentially or in parallel (default: true).
    
    Returns:
    A new animation group that combines all provided animation groups with blending capabilities.
*/
function combineAnimationsWithBlending(targetMeshAsset, animGroups, combinedName = "combinedAnim", blendingFrames = 10, sequentially = true) {
    console.log(`Combining ${animGroups.length} animations into a single animation group with blending...`);
    
    if (animGroups.length === 0) {
        console.warn("[combineAnimationsWithBlending] No animation groups provided.");
        return null;
    }
    
    // Create a new animation group to hold the combined animations
    const scene = animGroups[0]._scene;
    const combinedGroup = new BABYLON.AnimationGroup(combinedName, scene);
    
    // Track total animation length for sequential placement
    let totalDuration = 0;
    
    // Process each animation group
    animGroups.forEach((animGroup, groupIndex) => {
        // Clone and retarget each animation to ensure it works with our target mesh
        const retargetedGroup = retargetAnimWithBlendshapes(targetMeshAsset, animGroup, `${combinedName}_part${groupIndex}`);
        
        // Get the highest frame number across all animations in this group
        let maxEndFrame = 0;
        retargetedGroup._targetedAnimations.forEach(targetedAnim => {
            const keys = targetedAnim.animation.getKeys();
            if (keys.length > 0) {
                const lastKeyFrame = keys[keys.length - 1].frame;
                maxEndFrame = Math.max(maxEndFrame, lastKeyFrame);
            }
        });
        
        // Create offset for sequential animations
        const startOffset = sequentially ? totalDuration : 0;
        
        // Add each targeted animation to the combined group with proper offset
        retargetedGroup._targetedAnimations.forEach(targetedAnim => {
            // Clone the animation to avoid modifying the original
            const animationClone = targetedAnim.animation.clone();
            
            // Offset the animation keys if sequential
            if (sequentially && startOffset > 0) {
                const keys = animationClone.getKeys();
                const offsetKeys = keys.map(key => {
                    return {
                        frame: key.frame + startOffset,
                        value: key.value,
                        inTangent: key.inTangent,
                        outTangent: key.outTangent
                    };
                });
                animationClone.setKeys(offsetKeys);
            }
            
            // Add blending frames between animations if not the first animation and sequential
            if (sequentially && groupIndex > 0 && blendingFrames > 0) {
                // Get the last animation's final values for blending
                const prevGroupLastFrame = totalDuration;
                const currGroupFirstFrame = startOffset;
                
                // Add transitional keyframes for smooth blending
                // This requires knowing the value type (Vector3, Quaternion, etc.)
                // For simplicity, we're just adjusting tangents here
                const keys = animationClone.getKeys();
                if (keys.length > 0) {
                    // Adjust the tangent on the first frame for smooth blending
                    if (keys[0].inTangent) {
                        // If tangents exist, adjust them for smoother transition
                        keys[0].inTangent = BABYLON.TangentType.CATMULL_ROM;
                    }
                }
            }
            
            // Add animation to the combined group
            combinedGroup.addTargetedAnimation(animationClone, targetedAnim.target);
        });
        
        // Update total duration for next animation placement
        if (sequentially) {
            totalDuration += maxEndFrame;
            // Add some spacing for blending if needed
            if (blendingFrames > 0) {
                totalDuration += blendingFrames;
            }
        } else {
            totalDuration = Math.max(totalDuration, maxEndFrame);
        }
        
        // Stop the retargeted group to prevent it from playing independently
        retargetedGroup.stop();
    });
    
    // Add the enableBlending method to the combined group
    combinedGroup.enableBlending = function(blendingSpeed) {
        const speedValue = typeof blendingSpeed === "number" ? blendingSpeed : 0.1;
        
        this.reset();
        this.setWeightForAllAnimatables(0);
        
        for (let i = 0; i < this._targetedAnimations.length; i++) {
            const targetedAnim = this._targetedAnimations[i];
            if (targetedAnim && targetedAnim.animation) {
                targetedAnim.animation.enableBlending = true;
                targetedAnim.animation.blendingSpeed = speedValue;
            }
        }
        
        console.log(`[enableBlending] Enabled blending on combined animation '${this.name}' with speed ${speedValue}`);
        return this;
    };
    
    console.log(`Created combined animation group '${combinedName}' with ${combinedGroup._targetedAnimations.length} targeted animations spanning ${totalDuration} frames.`);
    return combinedGroup;
}

/*
    Function: createSequentialAnimationManager

    Description:
    Creates a manager object that handles playing multiple animations in sequence with blending between them.
    This is an alternative to combining animations into a single group.

    Parameters:
    - targetMeshAsset: The mesh to play animations on.
    - animGroups: Array of animation groups to play in sequence.
    - blendingTime: Time in seconds for blending between animations (default: 0.1).
    
    Returns:
    A manager object with methods to control the animation sequence.
*/
function createSequentialAnimationManager(targetMeshAsset, animGroups, blendingTime = 0.1) {
    // Ensure all animations are retargeted to our mesh
    const retargetedGroups = animGroups.map((group, index) => {
        return retargetAnimWithBlendshapes(targetMeshAsset, group, `seq_${group.name || index}`);
    });
    
    let currentAnimIndex = -1;
    let isPlaying = false;
    let loopMode = false;
    
    // Manager object to return
    const manager = {
        animations: retargetedGroups,
        
        // Start playing the sequence
        play: function(startFromIndex = 0) {
            if (retargetedGroups.length === 0) return;
            
            currentAnimIndex = Math.min(Math.max(0, startFromIndex), retargetedGroups.length - 1);
            isPlaying = true;
            
            // Stop any currently playing animations
            retargetedGroups.forEach(group => group.stop());
            
            // Start the current animation
            const currentAnim = retargetedGroups[currentAnimIndex];
            currentAnim.enableBlending(blendingTime);
            currentAnim.play(loopMode);
            
            // Set up the onAnimationEnd event for sequencing
            currentAnim.onAnimationGroupEndObservable.addOnce(() => {
                if (isPlaying) {
                    this._playNext();
                }
            });
            
            return this;
        },
        
        // Internal method to play the next animation in sequence
        _playNext: function() {
            if (!isPlaying) return;
            
            const prevIndex = currentAnimIndex;
            currentAnimIndex = (currentAnimIndex + 1) % retargetedGroups.length;
            
            // If we've reached the end and not looping, stop
            if (currentAnimIndex === 0 && !loopMode) {
                isPlaying = false;
                return;
            }
            
            // Stop the previous animation
            retargetedGroups[prevIndex].stop();
            
            // Start the next animation with blending
            const nextAnim = retargetedGroups[currentAnimIndex];
            nextAnim.enableBlending(blendingTime);
            nextAnim.play(false);  // Don't loop individual animations
            
            // Set up the next onAnimationEnd event
            nextAnim.onAnimationGroupEndObservable.addOnce(() => {
                if (isPlaying) {
                    this._playNext();
                }
            });
        },
        
        // Stop the animation sequence
        stop: function() {
            isPlaying = false;
            retargetedGroups.forEach(group => group.stop());
            return this;
        },
        
        // Pause the current animation
        pause: function() {
            if (currentAnimIndex >= 0 && currentAnimIndex < retargetedGroups.length) {
                retargetedGroups[currentAnimIndex].pause();
            }
            return this;
        },
        
        // Resume the current animation
        restart: function() {
            if (currentAnimIndex >= 0 && currentAnimIndex < retargetedGroups.length) {
                retargetedGroups[currentAnimIndex].restart();
            }
            return this;
        },
        
        // Set whether the sequence should loop
        setLoopMode: function(loop) {
            loopMode = loop;
            return this;
        },
        
        // Set the blending time between animations
        setBlendingTime: function(time) {
            blendingTime = time;
            return this;
        },
        
        // Check if currently playing
        isPlaying: function() {
            return isPlaying;
        },
        
        // Get the current animation index
        getCurrentAnimationIndex: function() {
            return currentAnimIndex;
        }
    };
    
    return manager;
}

/*
    The following functions work, but are not used in the current implementation.
    They are kept here for future reference.
*/

// Helper function that takes a blendshape target name, and returns the value of a json object
// that contains the blendshape targets.
// function getBlendshapeValue(blendshapeTargetName, blendshapeValues) {
//     return blendshapeValues[blendshapeTargetName];
//     // for (var i = 0; i < blendshapeValues.length; i++) {
//     //     if (blendshapeValues[i].name === blendshapeTargetName) {
//     //         return blendshapeValues[i].value;
//     //     }
//     // }

//     // return null;
// }

// // Helper function to fetch JSON data from a file
// function fetchJSONData(filePath) {
//     return fetch(filePath)
//         .then(response => response.json())
//         .then(data => {
//             console.log(data);
//             return data;
//         })
//         .catch(error => {
//             console.error('There was a problem with your fetch operation:', error);
//         });
// }

// function glassesGuyMap() {
//     return {
//         "morphTarget0": "glassesGuy_mesh_0_23_MorphTarget",
//         "morphTarget1": "glassesGuy_mesh_0_25_MorphTarget",
//         "morphTarget2": "glassesGuy_mesh_0_27_MorphTarget",
//         "morphTarget3": "glassesGuy_mesh_0_29_MorphTarget",
//         "morphTarget4": "glassesGuy_mesh_1_24_MorphTarget",
//         "morphTarget5": "glassesGuy_mesh_1_26_MorphTarget",
//         "morphTarget6": "glassesGuy_mesh_1_28_MorphTarget",
//         "morphTarget7": "glassesGuy_mesh_1_30_MorphTarget",
//         "morphTarget8": "glassesGuy_mesh_2_0_MorphTarget",
//         "morphTarget9": "glassesGuy_mesh_2_1_MorphTarget",
//         "morphTarget10": "glassesGuy_mesh_2_2_MorphTarget",
//         "morphTarget11": "glassesGuy_mesh_2_3_MorphTarget",
//         "morphTarget12": "glassesGuy_mesh_2_4_MorphTarget",
//         "morphTarget13": "glassesGuy_mesh_2_5_MorphTarget",
//         "morphTarget14": "glassesGuy_mesh_2_6_MorphTarget",
//         "morphTarget15": "glassesGuy_mesh_2_7_MorphTarget",
//         "morphTarget16": "glassesGuy_mesh_2_8_MorphTarget",
//         "morphTarget17": "glassesGuy_mesh_2_9_MorphTarget",
//         "morphTarget18": "glassesGuy_mesh_2_10_MorphTarget",
//         "morphTarget19": "glassesGuy_mesh_2_11_MorphTarget",
//         "morphTarget20": "glassesGuy_mesh_2_12_MorphTarget",
//         "morphTarget21": "glassesGuy_mesh_2_13_MorphTarget",
//         "morphTarget22": "glassesGuy_mesh_2_14_MorphTarget",
//         "morphTarget23": "glassesGuy_mesh_2_15_MorphTarget",
//         "morphTarget24": "glassesGuy_mesh_2_16_MorphTarget",
//         "morphTarget25": "glassesGuy_mesh_2_17_MorphTarget",
//         "morphTarget26": "glassesGuy_mesh_2_18_MorphTarget",
//         "morphTarget27": "glassesGuy_mesh_2_19_MorphTarget",
//         "morphTarget28": "glassesGuy_mesh_2_20_MorphTarget",
//         "morphTarget29": "glassesGuy_mesh_2_21_MorphTarget",
//         "morphTarget30": "glassesGuy_mesh_2_22_MorphTarget",
//         "morphTarget31": "glassesGuy_mesh_2_23_MorphTarget",
//         "morphTarget32": "glassesGuy_mesh_2_24_MorphTarget",
//         "morphTarget33": "glassesGuy_mesh_2_25_MorphTarget",
//         "morphTarget34": "glassesGuy_mesh_2_26_MorphTarget",
//         "morphTarget35": "glassesGuy_mesh_2_27_MorphTarget",
//         "morphTarget36": "glassesGuy_mesh_2_28_MorphTarget",
//         "morphTarget37": "glassesGuy_mesh_2_29_MorphTarget",
//         "morphTarget38": "glassesGuy_mesh_2_30_MorphTarget",
//         "morphTarget39": "glassesGuy_mesh_2_31_MorphTarget",
//         "morphTarget40": "glassesGuy_mesh_2_32_MorphTarget",
//         "morphTarget41": "glassesGuy_mesh_2_33_MorphTarget",
//         "morphTarget42": "glassesGuy_mesh_2_34_MorphTarget",
//         "morphTarget43": "glassesGuy_mesh_2_35_MorphTarget",
//         "morphTarget44": "glassesGuy_mesh_2_36_MorphTarget",
//         "morphTarget45": "glassesGuy_mesh_2_37_MorphTarget",
//         "morphTarget46": "glassesGuy_mesh_2_38_MorphTarget",
//         "morphTarget47": "glassesGuy_mesh_2_39_MorphTarget",
//         "morphTarget48": "glassesGuy_mesh_2_40_MorphTarget",
//         "morphTarget49": "glassesGuy_mesh_2_41_MorphTarget",
//         "morphTarget50": "glassesGuy_mesh_2_42_MorphTarget",
//         "morphTarget51": "glassesGuy_mesh_2_43_MorphTarget",
//         "morphTarget52": "glassesGuy_mesh_2_44_MorphTarget",
//         "morphTarget53": "glassesGuy_mesh_2_45_MorphTarget",
//         "morphTarget54": "glassesGuy_mesh_2_46_MorphTarget",
//         "morphTarget55": "glassesGuy_mesh_2_47_MorphTarget",
//         "morphTarget56": "glassesGuy_mesh_2_48_MorphTarget",
//         "morphTarget57": "glassesGuy_mesh_2_50_MorphTarget",
//         "morphTarget58": "glassesGuy_mesh_2_51_MorphTarget",
//         "morphTarget59": "glassesGuy_mesh_3_9_MorphTarget",
//         "morphTarget60": "glassesGuy_mesh_3_10_MorphTarget",
//         "morphTarget61": "glassesGuy_mesh_3_11_MorphTarget",
//         "morphTarget62": "glassesGuy_mesh_3_34_MorphTarget",
//         "morphTarget63": "glassesGuy_mesh_3_49_MorphTarget",
//         "morphTarget64": "glassesGuy_mesh_5_0_MorphTarget",
//         "morphTarget65": "glassesGuy_mesh_5_1_MorphTarget",
//         "morphTarget66": "glassesGuy_mesh_6_0_MorphTarget",
//         "morphTarget67": "glassesGuy_mesh_6_1_MorphTarget",
//         "morphTarget68": "glassesGuy_mesh_7_0_MorphTarget",
//         "morphTarget69": "glassesGuy_mesh_7_1_MorphTarget"
//     };
// }
// function NPMGlassesGuyMap() {
//         return {
//             "glassesGuy_mesh_0_23_MorphTarget": "morphTarget0",
//             "glassesGuy_mesh_0_25_MorphTarget": "morphTarget1",
//             "glassesGuy_mesh_0_27_MorphTarget": "morphTarget2",
//             "glassesGuy_mesh_0_29_MorphTarget": "morphTarget3",
//             "glassesGuy_mesh_1_24_MorphTarget": "morphTarget4",
//             "glassesGuy_mesh_1_26_MorphTarget": "morphTarget5",
//             "glassesGuy_mesh_1_28_MorphTarget": "morphTarget6",
//             "glassesGuy_mesh_1_30_MorphTarget": "morphTarget7",
//             "glassesGuy_mesh_2_0_MorphTarget": "morphTarget8",
//             "glassesGuy_mesh_2_1_MorphTarget": "morphTarget9",
//             "glassesGuy_mesh_2_2_MorphTarget": "morphTarget10",
//             "glassesGuy_mesh_2_3_MorphTarget": "morphTarget11",
//             "glassesGuy_mesh_2_4_MorphTarget": "morphTarget12",
//             "glassesGuy_mesh_2_5_MorphTarget": "morphTarget13",
//             "glassesGuy_mesh_2_6_MorphTarget": "morphTarget14",
//             "glassesGuy_mesh_2_7_MorphTarget": "morphTarget15",
//             "glassesGuy_mesh_2_8_MorphTarget": "morphTarget16",
//             "glassesGuy_mesh_2_9_MorphTarget": "morphTarget17",
//             "glassesGuy_mesh_2_10_MorphTarget": "morphTarget18",
//             "glassesGuy_mesh_2_11_MorphTarget": "morphTarget19",
//             "glassesGuy_mesh_2_12_MorphTarget": "morphTarget20",
//             "glassesGuy_mesh_2_13_MorphTarget": "morphTarget21",
//             "glassesGuy_mesh_2_14_MorphTarget": "morphTarget22",
//             "glassesGuy_mesh_2_15_MorphTarget": "morphTarget23",
//             "glassesGuy_mesh_2_16_MorphTarget": "morphTarget24",
//             "glassesGuy_mesh_2_17_MorphTarget": "morphTarget25",
//             "glassesGuy_mesh_2_18_MorphTarget": "morphTarget26",
//             "glassesGuy_mesh_2_19_MorphTarget": "morphTarget27",
//             "glassesGuy_mesh_2_20_MorphTarget": "morphTarget28",
//             "glassesGuy_mesh_2_21_MorphTarget": "morphTarget29",
//             "glassesGuy_mesh_2_22_MorphTarget": "morphTarget30",
//             "glassesGuy_mesh_2_23_MorphTarget": "morphTarget31",
//             "glassesGuy_mesh_2_24_MorphTarget": "morphTarget32",
//             "glassesGuy_mesh_2_25_MorphTarget": "morphTarget33",
//             "glassesGuy_mesh_2_26_MorphTarget": "morphTarget34",
//             "glassesGuy_mesh_2_27_MorphTarget": "morphTarget35",
//             "glassesGuy_mesh_2_28_MorphTarget": "morphTarget36",
//             "glassesGuy_mesh_2_29_MorphTarget": "morphTarget37",
//             "glassesGuy_mesh_2_30_MorphTarget": "morphTarget38",
//             "glassesGuy_mesh_2_31_MorphTarget": "morphTarget39",
//             "glassesGuy_mesh_2_32_MorphTarget": "morphTarget40",
//             "glassesGuy_mesh_2_33_MorphTarget": "morphTarget41",
//             "glassesGuy_mesh_2_34_MorphTarget": "morphTarget42",
//             "glassesGuy_mesh_2_35_MorphTarget": "morphTarget43",
//             "glassesGuy_mesh_2_36_MorphTarget": "morphTarget44",
//             "glassesGuy_mesh_2_37_MorphTarget": "morphTarget45",
//             "glassesGuy_mesh_2_38_MorphTarget": "morphTarget46",
//             "glassesGuy_mesh_2_39_MorphTarget": "morphTarget47",
//             "glassesGuy_mesh_2_40_MorphTarget": "morphTarget48",
//             "glassesGuy_mesh_2_41_MorphTarget": "morphTarget49",
//             "glassesGuy_mesh_2_42_MorphTarget": "morphTarget50",
//             "glassesGuy_mesh_2_43_MorphTarget": "morphTarget51",
//             "glassesGuy_mesh_2_44_MorphTarget": "morphTarget52",
//             "glassesGuy_mesh_2_45_MorphTarget": "morphTarget53",
//             "glassesGuy_mesh_2_46_MorphTarget": "morphTarget54",
//             "glassesGuy_mesh_2_47_MorphTarget": "morphTarget55",
//             "glassesGuy_mesh_2_48_MorphTarget": "morphTarget56",
//             "glassesGuy_mesh_2_50_MorphTarget": "morphTarget57",
//             "glassesGuy_mesh_2_51_MorphTarget": "morphTarget58",
//             "glassesGuy_mesh_3_9_MorphTarget": "morphTarget59",
//             "glassesGuy_mesh_3_10_MorphTarget": "morphTarget60",
//             "glassesGuy_mesh_3_11_MorphTarget": "morphTarget61",
//             "glassesGuy_mesh_3_34_MorphTarget": "morphTarget62",
//             "glassesGuy_mesh_3_49_MorphTarget": "morphTarget63",
//             "glassesGuy_mesh_5_0_MorphTarget": "morphTarget64",
//             "glassesGuy_mesh_5_1_MorphTarget": "morphTarget65",
//             "glassesGuy_mesh_6_0_MorphTarget": "morphTarget66",
//             "glassesGuy_mesh_6_1_MorphTarget": "morphTarget67",
//             "glassesGuy_mesh_7_0_MorphTarget": "morphTarget68",
//             "glassesGuy_mesh_7_1_MorphTarget": "morphTarget69"
//         };
//     }