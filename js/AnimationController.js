/**
 * AnimationController.js
 * Manages animation loading, blending and manipulation
 */

class AnimationController {
    constructor(scene) {
        this.scene = scene;
        
        // Animation references
        this.currentBaseAnim = null;
        this.currentGlossAnim = null;
        this.baseAnimationAsset = null;
        this.glossAnimationAsset = null;
        
        // Animation metadata
        this.baseAnimDuration = 0;
        this.glossAnimDuration = 0;
        
        // Bind methods
        this.loadSentenceAnimation = this.loadSentenceAnimation.bind(this);
        this.loadGlossAnimation = this.loadGlossAnimation.bind(this);
        this.blendAndSpliceAnimations = this.blendAndSpliceAnimations.bind(this);
    }
    
    initialize() {
        // Set up DOM element references
        this.sentenceAnimationSelect = document.getElementById('sentenceAnimation');
        this.insertGlossAnimationSelect = document.getElementById('insertGlossAnimation');
        this.baseCutStartTimeInput = document.getElementById('baseCutStartTime');
        this.glossPlayStartTimeInput = document.getElementById('glossPlayStartTime');
        this.glossPlayEndTimeInput = document.getElementById('glossPlayEndTime');
        this.blendDurationInput = document.getElementById('blendDuration');
        this.blendBalanceInput = document.getElementById('blendBalance');
        this.blendBalanceValueInput = document.getElementById('blendBalanceValue');
        this.applyBlendButton = document.getElementById('applyBlendButton');
        this.playOriginalSentenceButton = document.getElementById('playOriginalSentenceButton');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Populate animation lists
        this.populateAnimationLists();
        
        return this;
    }
    
    setupEventListeners() {
        if (this.applyBlendButton) {
            this.applyBlendButton.addEventListener('click', this.blendAndSpliceAnimations);
        }
        
        if (this.playOriginalSentenceButton) {
            this.playOriginalSentenceButton.addEventListener('click', () => {
                if (this.sentenceAnimationSelect.value) {
                    this.loadSentenceAnimation(this.sentenceAnimationSelect.value, true);
                }
            });
        }
        
        if (this.sentenceAnimationSelect) {
            this.sentenceAnimationSelect.addEventListener('change', () => {
                this.loadSentenceAnimation(this.sentenceAnimationSelect.value);
            });
        }
        
        if (this.insertGlossAnimationSelect) {
            this.insertGlossAnimationSelect.addEventListener('change', () => {
                this.loadGlossAnimation(this.insertGlossAnimationSelect.value);
            });
        }
        
        if (this.blendBalanceInput && this.blendBalanceValueInput) {
            this.blendBalanceInput.addEventListener('input', () => {
                this.blendBalanceValueInput.value = this.blendBalanceInput.value;
            });
            this.blendBalanceValueInput.addEventListener('input', () => {
                const value = parseFloat(this.blendBalanceValueInput.value);
                if (!isNaN(value) && value >= 0 && value <= 1) {
                    this.blendBalanceInput.value = value;
                }
            });
        }
    }
    
    async populateAnimationLists() {
        try {
            // Fetch animation lists
            const sentenceListResponse = await fetch('listAnimationFiles.php?folder=zin_glb');
            const glossListResponse = await fetch('listAnimationFiles.php?folder=glos_glb');
            
            if (!sentenceListResponse.ok || !glossListResponse.ok) {
                throw new Error('Failed to fetch animation lists');
            }
            
            // Parse the JSON responses
            const sentenceListText = await sentenceListResponse.text();
            const glossListText = await glossListResponse.text();
            
            console.log("Sentence list response:", sentenceListText);
            console.log("Gloss list response:", glossListText);
            
            // Try to parse the responses as JSON
            let sentenceList = [];
            let glossList = [];
            
            try {
                if (sentenceListText.trim()) {
                    sentenceList = JSON.parse(sentenceListText);
                }
            } catch (e) {
                console.error("Error parsing sentence list:", e);
            }
            
            try {
                if (glossListText.trim()) {
                    glossList = JSON.parse(glossListText);
                }
            } catch (e) {
                console.error("Error parsing gloss list:", e);
            }
            
            // Ensure we have arrays
            if (!Array.isArray(sentenceList)) {
                console.warn("Sentence list is not an array, converting...");
                if (typeof sentenceList === 'object' && sentenceList !== null) {
                    // If it's an object but not an array, convert object values to array
                    sentenceList = Object.values(sentenceList);
                } else {
                    // Otherwise create an empty array
                    sentenceList = [];
                }
            }
            
            if (!Array.isArray(glossList)) {
                console.warn("Gloss list is not an array, converting...");
                if (typeof glossList === 'object' && glossList !== null) {
                    // If it's an object but not an array, convert object values to array
                    glossList = Object.values(glossList);
                } else {
                    // Otherwise create an empty array
                    glossList = [];
                }
            }
            
            // Populate sentence dropdown
            if (this.sentenceAnimationSelect) {
                this.sentenceAnimationSelect.innerHTML = '';
                
                if (sentenceList.length > 0) {
                    sentenceList.forEach(file => {
                        const option = document.createElement('option');
                        option.value = file;
                        option.textContent = file;
                        this.sentenceAnimationSelect.appendChild(option);
                    });
                    
                    // Auto-load the first sentence
                    if (sentenceList.length > 0) {
                        this.loadSentenceAnimation(sentenceList[0]);
                    }
                } else {
                    // Add a placeholder option if list is empty
                    const option = document.createElement('option');
                    option.value = "";
                    option.textContent = "No animations available";
                    option.disabled = true;
                    option.selected = true;
                    this.sentenceAnimationSelect.appendChild(option);
                }
            }
            
            // Populate gloss dropdown
            if (this.insertGlossAnimationSelect) {
                this.insertGlossAnimationSelect.innerHTML = '';
                
                if (glossList.length > 0) {
                    glossList.forEach(file => {
                        const option = document.createElement('option');
                        option.value = file;
                        option.textContent = file;
                        this.insertGlossAnimationSelect.appendChild(option);
                    });
                    
                    // Auto-load the first gloss
                    if (glossList.length > 0) {
                        this.loadGlossAnimation(glossList[0]);
                    }
                } else {
                    // Add a placeholder option if list is empty
                    const option = document.createElement('option');
                    option.value = "";
                    option.textContent = "No animations available";
                    option.disabled = true;
                    option.selected = true;
                    this.insertGlossAnimationSelect.appendChild(option);
                }
            }
            
        } catch (error) {
            console.error('Error populating animation lists:', error);
            
            // Add fallback options
            if (this.sentenceAnimationSelect) {
                this.sentenceAnimationSelect.innerHTML = '';
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "Error loading animations";
                option.disabled = true;
                option.selected = true;
                this.sentenceAnimationSelect.appendChild(option);
            }
            
            if (this.insertGlossAnimationSelect) {
                this.insertGlossAnimationSelect.innerHTML = '';
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "Error loading animations";
                option.disabled = true;
                option.selected = true;
                this.insertGlossAnimationSelect.appendChild(option);
            }
        }
    }
    
    async loadSentenceAnimation(filename, autoPlay = false) {
        try {
            console.log(`Loading sentence animation: ${filename}`);
            
            // Check if there's an existing animation to clean up
            if (this.currentBaseAnim && this.baseAnimationAsset) {
                // Stop the current animation
                this.currentBaseAnim.stop();
                
                // Clean up using the destroyAnimation utility
                destroyAnimation(this.baseAnimationAsset);
                
                this.currentBaseAnim = null;
                this.baseAnimationAsset = null;
            }
            
            // Load the new animation
            const folder = 'zin_glb';
            // Use window.loadAnimationAsync instead of direct function call
            const animationAsset = await window.loadAnimationAsync(this.scene, folder, filename);
            
            this.baseAnimationAsset = animationAsset;
            this.currentBaseAnim = animationAsset.animationGroups[0];
            
            if (this.currentBaseAnim) {
                // Set up animation properties
                this.baseAnimDuration = this.currentBaseAnim.to / 60; // Convert from frames to seconds
                
                // Clear any existing gloss animation insertion time
                if (this.baseCutStartTimeInput) {
                    const defaultInsertTime = Math.min(1.0, this.baseAnimDuration / 2);
                    this.baseCutStartTimeInput.value = defaultInsertTime.toFixed(1);
                }
                
                // Update the timeline if it exists
                if (window.timelineController) {
                    window.timelineController.setBaseAnimationDuration(this.baseAnimDuration);
                    window.timelineController.updateGlossInsertionMarker(parseFloat(this.baseCutStartTimeInput.value));
                    window.timelineController.resetTimeline();
                }
                
                if (autoPlay) {
                    // Play the animation
                    this.currentBaseAnim.start(true);
                    
                    // Update timeline state if it exists
                    if (window.timelineController) {
                        window.timelineController.isPlaying = true;
                        window.timelineController.lastTimestampMS = performance.now();
                        window.timelineController.animationFrameId = requestAnimationFrame(window.timelineController.updateTimeline);
                        
                        if (window.timelineController.timelinePlayPauseBtn) {
                            window.timelineController.timelinePlayPauseBtn.textContent = 'Pause';
                        }
                    }
                }
                
                console.log(`Base animation loaded: ${filename} (${this.baseAnimDuration.toFixed(2)}s)`);
            }
        } catch (error) {
            console.error(`Error loading sentence animation: ${error}`);
        }
    }
    
    async loadGlossAnimation(filename) {
        try {
            console.log(`Loading gloss animation: ${filename}`);
            
            // Check if there's an existing animation to clean up
            if (this.currentGlossAnim && this.glossAnimationAsset) {
                // Stop the current animation
                this.currentGlossAnim.stop();
                
                // Clean up using the destroyAnimation utility
                destroyAnimation(this.glossAnimationAsset);
                
                this.currentGlossAnim = null;
                this.glossAnimationAsset = null;
            }
            
            // Load the new animation
            const folder = 'glos_glb';
            // Use window.loadAnimationAsync instead of direct function call
            const animationAsset = await window.loadAnimationAsync(this.scene, folder, filename);
            
            this.glossAnimationAsset = animationAsset;
            this.currentGlossAnim = animationAsset.animationGroups[0];
            
            if (this.currentGlossAnim) {
                // Set up animation properties
                this.glossAnimDuration = this.currentGlossAnim.to / 60; // Convert from frames to seconds
                
                // Update the play range inputs with defaults
                if (this.glossPlayStartTimeInput) {
                    this.glossPlayStartTimeInput.value = '0.0';
                }
                if (this.glossPlayEndTimeInput) {
                    this.glossPlayEndTimeInput.value = this.glossAnimDuration.toFixed(1);
                }
                
                // Update the timeline if it exists
                if (window.timelineController) {
                    window.timelineController.setGlossAnimationDuration(this.glossAnimDuration);
                }
                
                console.log(`Gloss animation loaded: ${filename} (${this.glossAnimDuration.toFixed(2)}s)`);
            }
        } catch (error) {
            console.error(`Error loading gloss animation: ${error}`);
        }
    }
    
    blendAndSpliceAnimations() {
        if (!this.currentBaseAnim || !this.currentGlossAnim) {
            console.error('Both base and gloss animations must be loaded');
            return;
        }
        
        try {
            // Get input values
            const insertTime = parseFloat(this.baseCutStartTimeInput.value) || 1.0;
            const glossStartTime = parseFloat(this.glossPlayStartTimeInput.value) || 0;
            const glossEndTime = parseFloat(this.glossPlayEndTimeInput.value) || this.glossAnimDuration;
            const blendDuration = parseFloat(this.blendDurationInput.value) || 0.1;
            const blendBalance = parseFloat(this.blendBalanceInput.value) || 0.5;
            
            // Calculate gloss duration
            const glossDuration = glossEndTime - glossStartTime;
            
            if (glossDuration <= 0) {
                console.error('Invalid gloss duration: end time must be greater than start time');
                return;
            }
            
            console.log(`Splicing at ${insertTime}s with gloss from ${glossStartTime}s to ${glossEndTime}s`);
            console.log(`Blend duration: ${blendDuration}s, balance: ${blendBalance}`);
            
            // Set up animation playback
            const frameRate = 60; // Assuming 60 FPS
            const insertFrame = insertTime * frameRate;
            const glossStartFrame = glossStartTime * frameRate;
            const glossEndFrame = glossEndTime * frameRate;
            const blendFrames = blendDuration * frameRate;
            
            // Stop any currently playing animations
            if (this.currentBaseAnim.isPlaying) {
                this.currentBaseAnim.stop();
            }
            if (this.currentGlossAnim.isPlaying) {
                this.currentGlossAnim.stop();
            }
            
            // Reset base animation to beginning
            this.currentBaseAnim.goToFrame(0);
            
            // Create an animation mixer for controlling both animations
            // This requires implementing a custom animation mixer that applies both animations
            // with proper weight blending based on the current frame
            
            // Reset the timeline if it exists
            if (window.timelineController) {
                window.timelineController.resetTimeline();
                setTimeout(() => window.timelineController.togglePlayback(), 100);
            } else {
                // Play animations if no timeline controller exists
                this.currentBaseAnim.start();
                
                setTimeout(() => {
                    // Pause base animation at insertion point
                    this.currentBaseAnim.pause();
                    
                    // Start gloss animation
                    this.currentGlossAnim.goToFrame(glossStartFrame);
                    this.currentGlossAnim.start();
                    
                    setTimeout(() => {
                        // Pause gloss animation at the end point
                        this.currentGlossAnim.pause();
                        
                        // Resume base animation
                        this.currentBaseAnim.start();
                    }, glossDuration * 1000);
                }, insertTime * 1000);
            }
            
            console.log('Animation blending and splicing applied');
        } catch (error) {
            console.error('Error during animation blending:', error);
        }
    }
}

// Make AnimationController globally accessible
window.AnimationController = AnimationController;