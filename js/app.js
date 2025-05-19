/**
 * app.js
 * Main application entry point that initializes and coordinates all controllers
 */

window.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing 3DViewer application...');
    
    // Create global variables to store controller references
    window.currentBaseAnim = null;
    window.currentGlossAnim = null;
    
    // Wait for the scene to be ready
    const waitForScene = setInterval(() => {
        if (window.scene) {
            clearInterval(waitForScene);
            initializeApplication(window.scene);
        }
    }, 100);
});

async function initializeApplication(scene) {
    try {
        console.log('Scene ready, initializing controllers...');
        
        // Initialize Timeline Controller
        window.timelineController = new TimelineController(scene);
        window.timelineController.initialize();
        console.log('Timeline controller initialized');
        
        // Initialize Animation Controller
        window.animationController = new AnimationController(scene);
        window.animationController.initialize();
        console.log('Animation controller initialized');
        
        // Initialize UI Controller
        window.uiController = new UIController(scene);
        window.uiController.initialize();
        console.log('UI controller initialized');
        
        // Make sure global variables are accessible
        window.currentBaseAnim = window.animationController.currentBaseAnim;
        window.currentGlossAnim = window.animationController.currentGlossAnim;
        
        // Set up observers to keep global animation references in sync
        const animationObserver = new MutationObserver(() => {
            window.currentBaseAnim = window.animationController.currentBaseAnim;
            window.currentGlossAnim = window.animationController.currentGlossAnim;
        });
        
        console.log('3DViewer application initialization complete!');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

// Handle window resize events
window.addEventListener('resize', () => {
    // Resize the Babylon.js engine if it exists
    if (window.engine) {
        window.engine.resize();
    }
});