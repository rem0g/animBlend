/**
 * Animation Timeline Visualization Utility
 * 
 * This utility creates a visual timeline representation of animations
 * for better understanding of animation blending.
 */

window.TimelineVisualizer = {
    /**
     * Create a timeline visualization
     * 
     * @param {HTMLElement} container - Container element to append the visualization to
     * @param {Array<BABYLON.AnimationGroup>} animations - Array of animation groups
     * @param {Array<String>} labels - Labels for each animation
     * @param {Array<String>} colors - Colors for each animation (optional)
     */
    createTimeline: function(container, animations, labels, colors = ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0']) {
        if (!container || !animations) {
            console.error("[TimelineVisualizer] Missing required parameters");
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Create timeline container
        const timelineEl = document.createElement('div');
        timelineEl.className = 'timeline-container';
        timelineEl.style.width = '100%';
        timelineEl.style.padding = '10px 0';
        
        // Find max frame across all animations
        let maxFrame = 0;
        animations.forEach(anim => {
            if (!anim || !anim.targetedAnimations || anim.targetedAnimations.length === 0) return;
            
            const keys = anim.targetedAnimations[0].animation.getKeys();
            if (!keys || keys.length === 0) return;
            
            const lastFrame = keys[keys.length - 1].frame;
            maxFrame = Math.max(maxFrame, lastFrame);
        });
        
        if (maxFrame <= 0) {
            console.error("[TimelineVisualizer] No valid animations found");
            return;
        }
        
        // Create a track for each animation
        animations.forEach((anim, index) => {
            if (!anim) return;
            
            const trackEl = document.createElement('div');
            trackEl.className = 'timeline-track';
            trackEl.style.display = 'flex';
            trackEl.style.alignItems = 'center';
            trackEl.style.margin = '5px 0';
            trackEl.style.height = '25px';
            
            // Label
            const labelEl = document.createElement('div');
            labelEl.className = 'timeline-label';
            labelEl.style.width = '80px';
            labelEl.style.marginRight = '10px';
            labelEl.style.textAlign = 'right';
            labelEl.style.fontSize = '12px';
            labelEl.textContent = labels[index] || `Animation ${index+1}`;
            
            // Bar container
            const barContainerEl = document.createElement('div');
            barContainerEl.className = 'timeline-bar-container';
            barContainerEl.style.flexGrow = 1;
            barContainerEl.style.height = '100%';
            barContainerEl.style.position = 'relative';
            barContainerEl.style.backgroundColor = '#333';
            barContainerEl.style.borderRadius = '3px';
            
            // Add the bar if we have a valid animation
            if (anim.targetedAnimations.length > 0) {
                const keys = anim.targetedAnimations[0].animation.getKeys();
                if (keys.length > 0) {
                    const firstFrame = keys[0].frame;
                    const lastFrame = keys[keys.length - 1].frame;
                    
                    // Create animation bar
                    const barEl = document.createElement('div');
                    barEl.className = 'timeline-bar';
                    barEl.style.position = 'absolute';
                    barEl.style.left = `${(firstFrame / maxFrame) * 100}%`;
                    barEl.style.width = `${((lastFrame - firstFrame) / maxFrame) * 100}%`;
                    barEl.style.height = '100%';
                    barEl.style.backgroundColor = colors[index % colors.length] || '#4CAF50';
                    barEl.style.borderRadius = '3px';
                    
                    // Add animation info tooltip
                    barEl.title = `${labelEl.textContent}: ${firstFrame} - ${lastFrame} (${lastFrame - firstFrame + 1} frames)`;
                    
                    // Add marker for current position when animation is playing
                    if (anim.isPlaying) {
                        const markerEl = document.createElement('div');
                        markerEl.className = 'timeline-marker';
                        markerEl.style.position = 'absolute';
                        markerEl.style.width = '2px';
                        markerEl.style.height = '100%';
                        markerEl.style.backgroundColor = '#ffffff';
                        markerEl.style.top = 0;
                        markerEl.style.zIndex = 10;
                        
                        // Update marker position based on current frame
                        const updateMarker = () => {
                            if (anim.isPlaying) {
                                const currentFrame = anim.targetedAnimations[0].animation.currentFrame;
                                const position = ((currentFrame - firstFrame) / (lastFrame - firstFrame)) * 100;
                                markerEl.style.left = `${position}%`;
                                requestAnimationFrame(updateMarker);
                            }
                        };
                        
                        requestAnimationFrame(updateMarker);
                        barEl.appendChild(markerEl);
                    }
                    
                    barContainerEl.appendChild(barEl);
                }
            }
            
            // Assemble track
            trackEl.appendChild(labelEl);
            trackEl.appendChild(barContainerEl);
            timelineEl.appendChild(trackEl);
        });
        
        // Create frame markers
        const markersEl = document.createElement('div');
        markersEl.className = 'timeline-markers';
        markersEl.style.display = 'flex';
        markersEl.style.justifyContent = 'space-between';
        markersEl.style.marginLeft = '90px';
        markersEl.style.fontSize = '10px';
        markersEl.style.color = '#999';
        
        // Add start, middle, and end markers
        ['0', Math.round(maxFrame / 2).toString(), maxFrame.toString()].forEach(marker => {
            const markerEl = document.createElement('div');
            markerEl.textContent = marker;
            markersEl.appendChild(markerEl);
        });
        
        // Add to container
        timelineEl.appendChild(markersEl);
        container.appendChild(timelineEl);
    },
    
    /**
     * Update the timeline visualization with current animation state
     * 
     * @param {HTMLElement} container - Container element with the visualization
     * @param {Array<BABYLON.AnimationGroup>} animations - Array of animation groups
     * @param {BABYLON.AnimationGroup} currentAnimation - Currently playing animation
     */
    updateTimeline: function(container, animations, currentAnimation) {
        if (!container || !animations) return;
        
        // Find all marker elements
        const markers = container.querySelectorAll('.timeline-marker');
        
        // Remove existing markers
        markers.forEach(marker => marker.remove());
        
        // If we have a current animation, add a new marker
        if (currentAnimation && currentAnimation.targetedAnimations.length > 0) {
            const tracks = container.querySelectorAll('.timeline-bar');
            const currentFrame = currentAnimation.targetedAnimations[0].animation.currentFrame;
            
            tracks.forEach(track => {
                const markerEl = document.createElement('div');
                markerEl.className = 'timeline-marker';
                markerEl.style.position = 'absolute';
                markerEl.style.width = '2px';
                markerEl.style.height = '100%';
                markerEl.style.backgroundColor = '#ffffff';
                markerEl.style.top = 0;
                markerEl.style.left = `${currentFrame}px`;
                markerEl.style.zIndex = 10;
                
                track.appendChild(markerEl);
            });
        }
    }
};
