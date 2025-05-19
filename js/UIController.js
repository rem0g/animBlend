/**
 * UIController.js
 * Manages UI interactions and control elements
 */

class UIController {
    constructor(scene) {
        this.scene = scene;
        
        // UI state
        this.isPlaying = false;
        
        // Bind methods
        this.setupGlobalControls = this.setupGlobalControls.bind(this);
        this.togglePlayPause = this.togglePlayPause.bind(this);
    }
    
    initialize() {
        // Set up global UI controls
        this.setupGlobalControls();
        
        // Reference the global play/pause button
        this.globalPlayPauseButton = document.getElementById('globalPlayPauseButton');
        
        // Set up event listeners
        if (this.globalPlayPauseButton) {
            this.globalPlayPauseButton.addEventListener('click', this.togglePlayPause);
        }
        
        return this;
    }
    
    setupGlobalControls() {
        console.log("Setting up global controls");
        
        // Update control panel UI if needed
    }
    
    togglePlayPause() {
        // Toggle global play/pause state
        this.isPlaying = !this.isPlaying;
        
        // Update button text
        if (this.globalPlayPauseButton) {
            this.globalPlayPauseButton.textContent = this.isPlaying ? 'Pause' : 'Play';
        }
        
        // Sync with timeline controller if available
        if (window.timelineController) {
            if (this.isPlaying !== window.timelineController.isPlaying) {
                window.timelineController.togglePlayback();
            }
        } else {
            // Direct animation control if no timeline controller
            if (window.currentBaseAnim) {
                if (this.isPlaying) {
                    window.currentBaseAnim.start(true);
                } else {
                    window.currentBaseAnim.pause();
                }
            }
            
            if (window.currentGlossAnim) {
                if (this.isPlaying) {
                    window.currentGlossAnim.start(true);
                } else {
                    window.currentGlossAnim.pause();
                }
            }
        }
    }
    
    showLoadingIndicator(visible) {
        // Implement loading indicator logic here
        console.log(`Loading indicator: ${visible ? 'visible' : 'hidden'}`);
    }
    
    updateProgressBar(percent) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${Math.round(percent)}%`;
        }
    }
    
    showError(message) {
        console.error(message);
        alert(`Error: ${message}`);
    }
}

// Make UIController globally accessible
window.UIController = UIController;