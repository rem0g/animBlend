/**
 * TimelineController.js
 * Handles timeline UI and playback functionality
 */

class TimelineController {
    constructor(scene) {
        // Timeline properties
        this.isPlaying = false;
        this.isTimelineDragging = false;
        this.currentTime = 0;
        this.maxTimeVisible = 10; // Default max time visible in seconds
        this.timelineZoomLevel = 1;
        this.baseAnimDuration = 0;
        this.glossAnimDuration = 0;
        this.dragTrackType = null; // 'base' or 'gloss'
        this.animationFrameId = null;
        this.lastTimestampMS = 0;
        
        // Scene reference
        this.scene = scene;
        
        // UI Elements references - will be set in initialize()
        this.timelineEditor = null;
        this.timelinePlayPauseBtn = null;
        this.timelineResetBtn = null;
        this.timelineTimeDisplay = null;
        this.timelineZoomInBtn = null;
        this.timelineZoomOutBtn = null;
        this.baseAnimTrack = null;
        this.glossAnimTrack = null;
        this.basePlayhead = null;
        this.glossPlayhead = null;
        this.glossInsertionMarker = null;
        this.timelineMarkers = null;
        this.baseCutStartInput = null;
        this.glossPlayStartInput = null;
        this.glossPlayEndInput = null;
        
        // Bind methods that will be used as event listeners
        this.togglePlayback = this.togglePlayback.bind(this);
        this.resetTimeline = this.resetTimeline.bind(this);
        this.handleTimelineDrag = this.handleTimelineDrag.bind(this);
        this.updateTimeline = this.updateTimeline.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTrackMouseDown = this.handleTrackMouseDown.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
    }
    
    initialize() {
        // Initialize DOM element references
        this.timelineEditor = document.getElementById('timelineEditor');
        this.timelinePlayPauseBtn = document.getElementById('timelinePlayPauseBtn');
        this.timelineResetBtn = document.getElementById('timelineResetBtn');
        this.timelineTimeDisplay = document.getElementById('timelineTimeDisplay');
        this.timelineZoomInBtn = document.getElementById('timelineZoomInBtn');
        this.timelineZoomOutBtn = document.getElementById('timelineZoomOutBtn');
        this.baseAnimTrack = document.getElementById('baseAnimTrack');
        this.glossAnimTrack = document.getElementById('glossAnimTrack');
        this.basePlayhead = document.getElementById('basePlayhead');
        this.glossPlayhead = document.getElementById('glossPlayhead');
        this.glossInsertionMarker = document.getElementById('glossInsertionMarker');
        this.timelineMarkers = document.getElementById('timelineMarkers');
        this.baseCutStartInput = document.getElementById('baseCutStartTime');
        this.glossPlayStartInput = document.getElementById('glossPlayStartTime');
        this.glossPlayEndInput = document.getElementById('glossPlayEndTime');
        
        // Initialize timeline UI
        this.setupEventListeners();
        this.updateTimelineMarkers();
        this.resetTimeline();
        
        // Return this for chaining
        return this;
    }
    
    setupEventListeners() {
        // Button controls
        if (this.timelinePlayPauseBtn) {
            this.timelinePlayPauseBtn.addEventListener('click', this.togglePlayback);
        }
        if (this.timelineResetBtn) {
            this.timelineResetBtn.addEventListener('click', this.resetTimeline);
        }
        if (this.timelineZoomInBtn) {
            this.timelineZoomInBtn.addEventListener('click', this.zoomIn);
        }
        if (this.timelineZoomOutBtn) {
            this.timelineZoomOutBtn.addEventListener('click', this.zoomOut);
        }
        
        // Timeline track interaction
        const baseTrack = this.timelineEditor.querySelector('.timeline-track:nth-child(1)');
        const glossTrack = this.timelineEditor.querySelector('.timeline-track:nth-child(2)');
        
        if (baseTrack) {
            baseTrack.addEventListener('mousedown', (e) => this.handleTrackMouseDown(e, 'base'));
        }
        if (glossTrack) {
            glossTrack.addEventListener('mousedown', (e) => this.handleTrackMouseDown(e, 'gloss'));
        }
        
        // Document-level event listeners for mouse tracking
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        
        // Input field listeners
        if (this.baseCutStartInput) {
            this.baseCutStartInput.addEventListener('input', () => {
                const value = parseFloat(this.baseCutStartInput.value);
                if (!isNaN(value)) {
                    this.updateGlossInsertionMarker(value);
                }
            });
        }
        if (this.glossPlayStartInput) {
            this.glossPlayStartInput.addEventListener('input', () => this.updateGlossTrack());
        }
        if (this.glossPlayEndInput) {
            this.glossPlayEndInput.addEventListener('input', () => this.updateGlossTrack());
        }
    }
    
    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.timelinePlayPauseBtn.textContent = 'Pause';
            this.lastTimestampMS = performance.now();
            
            // Start animations from current timeline position
            if (window.currentBaseAnim) {
                window.currentBaseAnim.start(true, 1.0, this.currentTime * 60);
            }
            
            // Sync gloss animation if insertion time is reached
            const glossInsertTime = parseFloat(this.baseCutStartInput.value);
            if (window.currentGlossAnim && this.currentTime >= glossInsertTime) {
                const glossOffset = this.currentTime - glossInsertTime;
                window.currentGlossAnim.start(true, 1.0, glossOffset * 60);
            }
            
            this.animationFrameId = requestAnimationFrame(this.updateTimeline);
        } else {
            this.timelinePlayPauseBtn.textContent = 'Play';
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            
            // Pause both animations
            if (window.currentBaseAnim && window.currentBaseAnim.isPlaying) {
                window.currentBaseAnim.pause();
            }
            if (window.currentGlossAnim && window.currentGlossAnim.isPlaying) {
                window.currentGlossAnim.pause();
            }
        }
        
        // Update global play/pause button if it exists
        const globalPlayPauseButton = document.getElementById('globalPlayPauseButton');
        if (globalPlayPauseButton) {
            globalPlayPauseButton.textContent = this.isPlaying ? 'Pause' : 'Play';
        }
    }
    
    updateTimeline(timestamp) {
        const deltaTime = timestamp - this.lastTimestampMS;
        this.lastTimestampMS = timestamp;
        
        // Update current time
        this.currentTime += deltaTime / 1000;
        
        // Update playheads
        this.updatePlayheadPositions();
        
        // Check if we need to start gloss animation
        const glossInsertTime = parseFloat(this.baseCutStartInput.value);
        
        // Loop if we hit the end of base animation
        if (this.baseAnimDuration > 0 && this.currentTime >= this.baseAnimDuration) {
            this.resetTimeline();
        }
        
        if (this.isPlaying) {
            this.animationFrameId = requestAnimationFrame(this.updateTimeline);
        }
    }
    
    updatePlayheadPositions() {
        if (!this.timelineTimeDisplay || !this.basePlayhead || !this.glossPlayhead) return;
        
        // Update time display
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        const milliseconds = Math.floor((this.currentTime % 1) * 1000);
        this.timelineTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        
        // Calculate positions
        const positionPercent = (this.currentTime / this.maxTimeVisible) * 100;
        const cappedPosition = Math.min(positionPercent, 100); // Cap at 100%
        
        // Update base playhead
        this.basePlayhead.style.left = `${cappedPosition}%`;
        
        // Update gloss playhead if in view
        const glossInsertTime = parseFloat(this.baseCutStartInput.value);
        const glossTimeOffset = this.currentTime - glossInsertTime;
        
        if (glossTimeOffset >= 0) {
            this.glossPlayhead.style.display = 'block';
            const glossStartTime = parseFloat(this.glossPlayStartInput.value);
            const glossPosition = ((glossInsertTime + glossStartTime + glossTimeOffset) / this.maxTimeVisible) * 100;
            this.glossPlayhead.style.left = `${Math.min(glossPosition, 100)}%`;
        } else {
            this.glossPlayhead.style.display = 'none';
        }
    }
    
    updateTimelineMarkers() {
        if (!this.timelineMarkers) return;
        
        this.timelineMarkers.innerHTML = '';
        
        const majorMarkerInterval = this.determineMarkerInterval(this.maxTimeVisible);
        const minorMarkerCount = 4; // Number of minor markers between major markers
        
        for (let time = 0; time <= this.maxTimeVisible; time += majorMarkerInterval / minorMarkerCount) {
            const marker = document.createElement('div');
            marker.className = 'timeline-time-marker';
            
            const isMajorMarker = Math.abs(time % majorMarkerInterval) < 0.001;
            if (isMajorMarker) {
                marker.classList.add('major');
                
                const label = document.createElement('div');
                label.className = 'timeline-time-label';
                label.textContent = this.formatTime(time);
                marker.appendChild(label);
            }
            
            const positionPercent = (time / this.maxTimeVisible) * 100;
            marker.style.left = `${positionPercent}%`;
            
            this.timelineMarkers.appendChild(marker);
        }
    }
    
    determineMarkerInterval(visibleDuration) {
        if (visibleDuration <= 2) return 0.5;
        if (visibleDuration <= 5) return 1;
        if (visibleDuration <= 10) return 2;
        if (visibleDuration <= 30) return 5;
        if (visibleDuration <= 60) return 10;
        if (visibleDuration <= 300) return 30;
        return 60;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        if (mins > 0) {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return `${secs}s`;
    }
    
    handleTrackMouseDown(event, trackType) {
        this.isTimelineDragging = true;
        this.dragTrackType = trackType;
        this.handleTimelineDrag(event);
    }
    
    handleTimelineDrag(event) {
        if (!this.isTimelineDragging) return;
        
        const baseTrack = this.timelineEditor.querySelector('.timeline-track:nth-child(1)');
        if (!baseTrack) return;
        
        const trackRect = baseTrack.getBoundingClientRect();
        const trackWidth = trackRect.width;
        const relativeX = Math.max(0, Math.min(event.clientX - trackRect.left, trackWidth));
        const timePosition = (relativeX / trackWidth) * this.maxTimeVisible;
        
        this.currentTime = Math.max(0, timePosition);
        
        // Update UI
        this.updatePlayheadPositions();
        
        // If actively playing, update animation positions
        if (window.currentBaseAnim) {
            window.currentBaseAnim.goToFrame(this.currentTime * 60);
        }
        
        if (window.currentGlossAnim && this.dragTrackType === 'gloss') {
            const glossStartTime = parseFloat(this.glossPlayStartInput.value) || 0;
            window.currentGlossAnim.goToFrame((this.currentTime - glossStartTime) * 60);
        }
    }
    
    handleMouseMove(event) {
        if (this.isTimelineDragging) {
            this.handleTimelineDrag(event);
        }
    }
    
    handleMouseUp() {
        this.isTimelineDragging = false;
        this.dragTrackType = null;
    }
    
    updateBaseTrack() {
        if (!this.baseAnimTrack) return;
        
        if (this.baseAnimDuration > 0) {
            const widthPercent = Math.min((this.baseAnimDuration / this.maxTimeVisible) * 100, 100);
            this.baseAnimTrack.style.width = `${widthPercent}%`;
            this.baseAnimTrack.style.left = '0%';
        } else {
            this.baseAnimTrack.style.width = '0%';
        }
    }
    
    updateGlossTrack() {
        if (!this.glossAnimTrack) return;
        
        if (this.glossAnimDuration > 0) {
            const glossInsertTime = parseFloat(this.baseCutStartInput.value) || 0;
            const glossStartTime = parseFloat(this.glossPlayStartInput.value) || 0;
            const glossEndTime = parseFloat(this.glossPlayEndInput.value) || this.glossAnimDuration;
            const glossSegmentDuration = glossEndTime - glossStartTime;
            
            if (glossSegmentDuration <= 0) {
                this.glossAnimTrack.style.width = '0%';
                return;
            }
            
            const startPos = ((glossInsertTime) / this.maxTimeVisible) * 100;
            const widthPercent = (glossSegmentDuration / this.maxTimeVisible) * 100;
            
            this.glossAnimTrack.style.left = `${Math.min(startPos, 100)}%`;
            this.glossAnimTrack.style.width = `${Math.min(widthPercent, 100 - startPos)}%`;
            
            // Update insertion marker
            this.updateGlossInsertionMarker(glossInsertTime);
        } else {
            this.glossAnimTrack.style.width = '0%';
            this.glossAnimTrack.style.left = '0%';
        }
    }
    
    updateGlossInsertionMarker(time) {
        if (!this.glossInsertionMarker) return;
        
        const positionPercent = (time / this.maxTimeVisible) * 100;
        this.glossInsertionMarker.style.left = `${Math.min(positionPercent, 100)}%`;
    }
    
    resetTimeline() {
        this.currentTime = 0;
        this.updatePlayheadPositions();
        
        // Stop any playing animations
        if (this.isPlaying) {
            this.togglePlayback();
        }
        
        // Reset animations
        if (window.currentBaseAnim) {
            window.currentBaseAnim.goToFrame(0);
        }
        if (window.currentGlossAnim) {
            window.currentGlossAnim.goToFrame(0);
        }
    }
    
    zoomIn() {
        this.timelineZoomLevel = Math.min(this.timelineZoomLevel * 1.5, 5);
        this.maxTimeVisible = 10 / this.timelineZoomLevel;
        this.updateTimelineMarkers();
        this.updateBaseTrack();
        this.updateGlossTrack();
        this.updateGlossInsertionMarker(parseFloat(this.baseCutStartInput.value));
    }
    
    zoomOut() {
        this.timelineZoomLevel = Math.max(this.timelineZoomLevel / 1.5, 0.25);
        this.maxTimeVisible = 10 / this.timelineZoomLevel;
        this.updateTimelineMarkers();
        this.updateBaseTrack();
        this.updateGlossTrack();
        this.updateGlossInsertionMarker(parseFloat(this.baseCutStartInput.value));
    }
    
    setBaseAnimationDuration(duration) {
        this.baseAnimDuration = duration;
        this.updateBaseTrack();
    }
    
    setGlossAnimationDuration(duration) {
        this.glossAnimDuration = duration;
        this.updateGlossTrack();
    }
}

// Make TimelineController globally accessible
window.TimelineController = TimelineController;