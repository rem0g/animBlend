// Global Animation Player
window.animationPlayer = {
    currentAnimation: null, // Stores the currently active AnimationGroup for global play/pause
    isPlaying: false,       // Tracks global playback state
    _animationCache: {},    // Cache for loaded "master" animation groups
    _blendedGroups: [],     // Array to track blended animation groups

    /**
     * Loads an animation group for a specific character.
     * @param {string} animFilename - The filename of the animation (e.g., "my_animation.fbx").
     * @param {string} folder - The subfolder ("glos", "zin") where the animation is located.
     * @param {BABYLON.Scene} scene - The Babylon.js scene.
     * @param {string} targetMeshName - The name of the mesh to target the animation to.
     * @param {boolean} loop - Whether the animation should loop.
     * @param {boolean} useCache - Whether to use cached animation if available.
     * @param {number} speedRatio - The speed ratio for the animation.
     * @returns {Promise<BABYLON.AnimationGroup | null>} The loaded and prepared animation group instance, or null on failure.
     */
    loadAnimation: async function(animFilename, folder, scene, targetMeshName, loop = false, useCache = true, speedRatio = 1.0) {
        if (!animFilename || !folder || !scene || !targetMeshName) {
            console.error("[AnimationPlayer.loadAnimation] Missing required parameters.", { animFilename, folder, sceneExists: !!scene, targetMeshName });
            return null;
        }

        const animationDirectoryPath = `../slat2025/${folder}/`; // Path to the directory containing animation files
        const cacheKey = animationDirectoryPath + animFilename; // Unique key for caching

        if (useCache && this._animationCache[cacheKey]) {
            console.log(`[AnimationPlayer.loadAnimation] Cloning from cache: ${animFilename}`);
            const cachedMasterGroup = this._animationCache[cacheKey];
            
            // Ensure the cached group itself is not disposed or invalid
            if (!cachedMasterGroup || typeof cachedMasterGroup.clone !== 'function') {
                console.warn(`[AnimationPlayer.loadAnimation] Cached item for ${cacheKey} is invalid. Reloading.`);
                delete this._animationCache[cacheKey]; // Remove invalid entry
                // Fall through to load normally
            } else {
                const instanceGroup = cachedMasterGroup.clone(animFilename + "_instance_" + Date.now());
                instanceGroup.name = animFilename; // Keep original filename for identification
                instanceGroup.loopAnimation = loop;
                instanceGroup.speedRatio = speedRatio;
                instanceGroup.stop(); // Ensure instance is stopped initially
                
                // Retargeting should have been done on the cachedMasterGroup.
                // Cloning should preserve the retargeted state if targets are scene nodes.
                console.log(`[AnimationPlayer.loadAnimation] Cloned: ${instanceGroup.name}, From: ${instanceGroup.from}, To: ${instanceGroup.to}`);
                return instanceGroup;
            }
        }

        console.log(`[AnimationPlayer.loadAnimation] Loading animation: ${animFilename} from folder ${folder}`);
        try {
            // ImportAnimationsAsync loads animations from a file into the scene.
            // First arg is root URL (directory), second is scene/file name.
            const loadedAsset = await BABYLON.SceneLoader.ImportAnimationsAsync(
                animationDirectoryPath,
                animFilename,
                scene,
                false, // doNotOverwrite
                BABYLON.SceneLoaderAnimationGroupLoadingMode.StopExistingData, // loadingMode
                null  // targetUrl
            );

            if (!loadedAsset || !loadedAsset.animationGroups || loadedAsset.animationGroups.length === 0) {
                console.error(`[AnimationPlayer.loadAnimation] No animation groups found in ${animFilename} from ${folder}`);
                return null;
            }

            // Assuming the first animation group is the primary one.
            const masterAnimGroup = loadedAsset.animationGroups[0];
            if (!masterAnimGroup) {
                console.error(`[AnimationPlayer.loadAnimation] First animation group is null for ${animFilename}`);
                return null;
            }
            
            masterAnimGroup.name = animFilename + "_master"; // For debugging cache
            masterAnimGroup.stop(); // Ensure master is stopped

            // Apply Hips rotation lock if enabled (adapted from old getAnims logic)
            // Assumes ParamsManager is a global object
            if (window.ParamsManager && window.ParamsManager.lockRot === true) {
                masterAnimGroup.targetedAnimations.forEach(targetedAnim => {
                    if (targetedAnim.target && targetedAnim.target.name === "Hips" &&
                        targetedAnim.animation && targetedAnim.animation.targetProperty === "rotationQuaternion") {
                        // Lock rotation by setting keyframe values.
                        // This example locks to a specific orientation (y-up, z-forward if identity quat means that for model).
                        // Adjust w, x, y, z as needed for the desired lock. A common lock is to zero out rotations.
                        // For a 180-degree rotation around Y (common for FBX), it would be (0,1,0,0) for (x,y,z,w) or (0,0,1,0) for (w,x,y,z)
                        // Babylon uses (x, y, z, w) for Quaternions. For 180 deg around Y: (0, 1, 0, 0)
                        // The original code set x=0, y=0, z=1. This implies w=0, which is a 180 deg rotation around Z.
                        targetedAnim.animation.getKeys().forEach(key => {
                            if (key.value instanceof BABYLON.Quaternion) {
                                key.value.x = 0;
                                key.value.y = 0;
                                key.value.z = 1; 
                                key.value.w = 0; // Ensure W is set for a valid quaternion representing 180 deg around Z.
                            }
                        });
                        console.log(`[AnimationPlayer.loadAnimation] Hips rotation locked for ${masterAnimGroup.name}`);
                    }
                });
            }

            // TODO: Explicit Retargeting Step
            // If Babylon's default retargeting (based on bone names) via ImportAnimationsAsync
            // is insufficient, explicit retargeting using a function like `retargetAnimationGroup`
            // from `retargetAnims.js` would be needed here. This typically involves:
            // 1. Loading the animation file with its skeleton (e.g., using AssetContainer).
            // 2. Getting the target mesh's skeleton.
            // 3. Calling the retargeting function.
            // For now, we rely on compatible skeletons or Babylon's implicit retargeting.
            const targetMesh = scene.getMeshByName(targetMeshName);
            if (!targetMesh || !targetMesh.skeleton) {
                 console.warn(`[AnimationPlayer.loadAnimation] Target mesh '${targetMeshName}' or its skeleton not found. Animation might not play correctly.`);
            } else {
                // Animations should now be targeted at 'targetMeshName's skeleton by ImportAnimationsAsync
                // if bone names matched.
                 console.log(`[AnimationPlayer.loadAnimation] Animation group '${masterAnimGroup.name}' loaded. Assumed target: '${targetMeshName}'.`);
            }


            if (useCache) {
                this._animationCache[cacheKey] = masterAnimGroup; // Cache the processed master group
            }

            // Return a configured clone for the caller to use
            const instanceGroup = masterAnimGroup.clone(animFilename + "_instance_" + Date.now());
            instanceGroup.name = animFilename; // User-friendly name
            instanceGroup.loopAnimation = loop;
            instanceGroup.speedRatio = speedRatio;
            instanceGroup.stop();

            // Apply retargeting with blendshape support if retargetAnimWithBlendshapes is available
            if (typeof window.retargetAnimWithBlendshapes === 'function' && targetMesh) {
                try {
                    console.log(`[AnimationPlayer.loadAnimation] Applying retargeting with blendshape support for ${instanceGroup.name}`);
                    instanceGroup = window.retargetAnimWithBlendshapes(targetMesh, instanceGroup, instanceGroup.name + "_retargeted");
                } catch (retargetError) {
                    console.warn(`[AnimationPlayer.loadAnimation] Retargeting with blendshapes failed: ${retargetError.message}`);
                    // Continue with the original instance if retargeting fails
                }
            }

            console.log(`[AnimationPlayer.loadAnimation] Successfully loaded and prepared: ${instanceGroup.name}, From: ${instanceGroup.from}, To: ${instanceGroup.to}, Targets: ${instanceGroup.targetedAnimations.length}`);
            return instanceGroup;

        } catch (error) {
            console.error(`[AnimationPlayer.loadAnimation] Error loading animation ${animationDirectoryPath}${animFilename}:`, error);
            // If we created a masterAnimGroup but aren't caching and an error occurred before caching,
            // it should be disposed of if it exists and SceneLoader didn't clean it up.
            // However, masterAnimGroup is typically added to scene.animationGroups by loader.
            // If an error occurs, the caller gets null, and the scene might have a partially loaded group.
            // Babylon's loader usually handles cleanup on critical failure.
            return null;
        }
    },

    // Global play/pause functionality (can be expanded for more complex scenarios)
    play: function() {
        if (this.currentAnimation && !this.isPlaying && typeof this.currentAnimation.play === 'function') {
            this.currentAnimation.play(this.currentAnimation.loopAnimation);
            this.isPlaying = true;
            console.log(`[AnimationPlayer.play] Playing: ${this.currentAnimation.name}`);
        }
    },

    pause: function() {
        if (this.currentAnimation && this.isPlaying && typeof this.currentAnimation.pause === 'function') {
            this.currentAnimation.pause();
            this.isPlaying = false;
            console.log(`[AnimationPlayer.pause] Paused: ${this.currentAnimation.name}`);
        }
    },

    stop: function() {
        if (this.currentAnimation && typeof this.currentAnimation.stop === 'function') {
            this.currentAnimation.stop();
            // this.currentAnimation.reset(); // Reset to frame 0 - often desired
            console.log(`[AnimationPlayer.stop] Stopped: ${this.currentAnimation.name}`);
        }
        this.isPlaying = false;
        // Do not nullify this.currentAnimation here, as other parts might still reference it
        // (e.g. playGlossSequence manages its own currentBase/GlossAnimations)
    },

    /**
     * Disposes of a specific animation group and its resources.
     * @param {BABYLON.AnimationGroup} animationGroup - The animation group to dispose.
     */
    disposeAnimation: function(animationGroup) {
        if (animationGroup && typeof animationGroup.dispose === 'function') {
            const animName = animationGroup.name;
            console.log(`[AnimationPlayer.disposeAnimation] Disposing animation: ${animName}`);
            animationGroup.stop(); // Stop before disposing
            animationGroup.dispose();

            // Note: This does not automatically remove it from the cache if it was a master.
            // Cache management is separate (see clearCache or manual removal if needed).
        }
    },

    /**
     * Clears all animation groups from the cache and disposes them.
     */
    clearCache: function() {
        console.log("[AnimationPlayer.clearCache] Clearing all cached animations.");
        for (const key in this._animationCache) {
            const cachedGroup = this._animationCache[key];
            if (cachedGroup && typeof cachedGroup.dispose === 'function') {
                cachedGroup.dispose();
            }
            delete this._animationCache[key];
        }
        this._animationCache = {}; // Reset cache object
    },

    /**
     * Blends multiple animation groups together.
     * @param {Array<BABYLON.AnimationGroup>} animGroups - Array of animation groups to blend.
     * @param {Array<number>} weights - Array of weights for each animation (0-1).
     * @param {number} blendingSpeed - Speed at which animations blend (default: 0.1).
     * @returns {Promise<BABYLON.AnimationGroup>} The blended animation group.
     */
    blendAnimations: function(animGroups, weights, blendingSpeed = 0.1) {
        if (!animGroups || !Array.isArray(animGroups) || animGroups.length === 0) {
            console.error("[AnimationPlayer.blendAnimations] No animation groups provided.");
            return null;
        }

        if (!weights || !Array.isArray(weights) || weights.length !== animGroups.length) {
            console.error("[AnimationPlayer.blendAnimations] Weights array must match animation groups array.");
            return null;
        }

        console.log(`[AnimationPlayer.blendAnimations] Blending ${animGroups.length} animations`);
        
        // Stop current animation if playing
        this.stop();

        // Reset all animations in the blend group
        animGroups.forEach(anim => {
            if (anim) {
                anim.reset();
                anim.stop();
            }
        });

        // Apply weights to each animation
        animGroups.forEach((anim, index) => {
            if (anim) {
                // Enable blending if the function exists (added by retargetAnimWithBlendshapes)
                if (typeof anim.enableBlending === 'function') {
                    anim.enableBlending(blendingSpeed);
                }
                
                // Set the weight for this animation
                anim.setWeightForAllAnimatables(weights[index]);
                
                // Start the animation
                anim.play(anim.loopAnimation);
                
                console.log(`[AnimationPlayer.blendAnimations] Animation ${anim.name} playing with weight ${weights[index]}`);
            }
        });

        // Track these blended animations
        this._blendedGroups = animGroups;
        
        // Set the first animation as the current one for play/pause control
        this.currentAnimation = animGroups[0];
        this.isPlaying = true;
        
        return animGroups[0]; // Return the primary animation for reference
    },

    /**
     * Updates the weights of currently blended animations.
     * @param {Array<number>} newWeights - New weights for each animation.
     */
    updateBlendWeights: function(newWeights) {
        if (!this._blendedGroups || this._blendedGroups.length === 0) {
            console.warn("[AnimationPlayer.updateBlendWeights] No blended animations to update.");
            return;
        }

        if (!newWeights || newWeights.length !== this._blendedGroups.length) {
            console.error("[AnimationPlayer.updateBlendWeights] Weights array must match blended animations array.");
            return;
        }

        this._blendedGroups.forEach((anim, index) => {
            if (anim) {
                anim.setWeightForAllAnimatables(newWeights[index]);
                console.log(`[AnimationPlayer.updateBlendWeights] Updated ${anim.name} weight to ${newWeights[index]}`);
            }
        });
    },

    /**
     * Stops all blended animations and clears the blend group.
     */
    stopBlending: function() {
        if (this._blendedGroups.length > 0) {
            console.log("[AnimationPlayer.stopBlending] Stopping all blended animations");
            this._blendedGroups.forEach(anim => {
                if (anim) anim.stop();
            });
            
            this._blendedGroups = [];
            this.isPlaying = false;
        }
    },

    /**
     * Creates a combined animation group from multiple animations.
     * This is different from blending - it creates a new animation group that contains
     * all the targeted animations from the input groups.
     * @param {Array<BABYLON.AnimationGroup>} animGroups - Array of animation groups to combine.
     * @param {string} name - Name for the new combined animation group.
     * @param {BABYLON.Scene} scene - The scene the new group will belong to.
     * @returns {BABYLON.AnimationGroup} The new combined animation group.
     */
    combineAnimations: function(animGroups, name, scene) {
        if (!animGroups || !Array.isArray(animGroups) || animGroups.length === 0) {
            console.error("[AnimationPlayer.combineAnimations] No animation groups provided.");
            return null;
        }

        console.log(`[AnimationPlayer.combineAnimations] Combining ${animGroups.length} animations into "${name}"`);
        
        // Create a new animation group
        const combinedGroup = new BABYLON.AnimationGroup(name, scene);
        
        // Add all targeted animations from each group to the new group
        animGroups.forEach(group => {
            if (group && group.targetedAnimations) {
                group.targetedAnimations.forEach(targetedAnim => {
                    // Clone the animation to avoid conflicts
                    const clonedAnim = targetedAnim.animation.clone();
                    combinedGroup.addTargetedAnimation(clonedAnim, targetedAnim.target);
                });
            }
        });
        
        // Add the enableBlending method to the combined group
        if (typeof window.retargetAnimWithBlendshapes === 'function') {
            combinedGroup.enableBlending = function(blendingSpeed) {
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
        }
        
        console.log(`[AnimationPlayer.combineAnimations] Created combined group "${name}" with ${combinedGroup.targetedAnimations.length} targeted animations`);
        return combinedGroup;
    }
};
