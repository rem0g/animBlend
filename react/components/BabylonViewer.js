import React, { useEffect, useRef } from 'react';
import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';
import ControlPanel from './ControlPanel';
import { loadAssetMesh, createScene } from '../utils/SceneUtils';
import { retargetAnimWithBlendshapes } from '../utils/AnimationUtils';

function BabylonViewer({ baseModelUrl, animModelUrl }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const baseMeshAssetRef = useRef(null);
  const rotatableNodeRef = useRef(null);
  const retargetedAnimationsRef = useRef([]);
  const currentAnimationRef = useRef(null);
  
  // State for animation playing status
  const [isPlaying, setIsPlaying] = React.useState(true);
  
  // State for rotation values
  const [rotation, setRotation] = React.useState({
    x: -90, // -90 degrees
    y: 180,  // 180 degrees
    z: 0
  });
  
  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initial setup and cleanup
  useEffect(() => {
    // Initialize Babylon.js
    const canvas = canvasRef.current;
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    engineRef.current = engine;
    
    // Create scene
    const setupScene = async () => {
      try {
        // Create scene
        const [scene] = await createScene(canvas);
        sceneRef.current = scene;
        
        // Set white background
        scene.clearColor = new BABYLON.Color3(1, 1, 1);
        
        // Add camera
        const camera = new BABYLON.ArcRotateCamera(
          "camera", 
          Math.PI / 2, 
          Math.PI / 2.5, 
          3, 
          new BABYLON.Vector3(0, 1, 0), 
          scene
        );
        
        // Fix clipping issues
        camera.minZ = 0.01;
        camera.attachControl(canvas, true);
        camera.wheelDeltaPercentage = 0.015;
        camera.panningSensibility = 0;
        
        // Add light
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        
        // Load the base model
        const baseMeshAsset = await loadAssetMesh(scene, "", baseModelUrl, false);
        baseMeshAssetRef.current = baseMeshAsset;
        
        const baseMeshes = baseMeshAsset.fetched.meshes;
        
        // Apply initial rotation
        const defaultRotationX = BABYLON.Tools.ToRadians(rotation.x);
        const defaultRotationY = BABYLON.Tools.ToRadians(rotation.y);
        
        // Determine which node to rotate
        let rotatableNode;
        if (baseMeshAsset.root) {
          rotatableNode = baseMeshAsset.root;
          rotatableNode.rotation = new BABYLON.Vector3(defaultRotationX, defaultRotationY, 0);
        } else if (baseMeshAsset.god) {
          rotatableNode = baseMeshAsset.god;
          rotatableNode.rotation = new BABYLON.Vector3(defaultRotationX, defaultRotationY, 0);
        } else {
          rotatableNode = new BABYLON.TransformNode("avatarRoot", scene);
          baseMeshes.filter(mesh => !mesh.parent).forEach(mesh => {
            mesh.parent = rotatableNode;
            mesh.rotation = new BABYLON.Vector3(defaultRotationX, defaultRotationY, 0);
          });
        }
        
        rotatableNodeRef.current = rotatableNode;
        
        // Load animation model
        const animUrlParts = animModelUrl.split('/');
        const animFileName = animUrlParts.pop();
        const animPath = animUrlParts.join('/') + '/';
        
        const animModelResult = await BABYLON.SceneLoader.ImportMeshAsync("", animPath, animFileName, scene);
        
        // Hide animation model
        animModelResult.meshes.forEach(mesh => {
          if (mesh.id !== "__root__") {
            mesh.position.y = -1000;
          }
        });
        
        // Retarget animations
        const retargetedAnimations = [];
        
        for (let i = 0; i < animModelResult.animationGroups.length; i++) {
          const animGroup = animModelResult.animationGroups[i];
          
          const retargetedAnim = retargetAnimWithBlendshapes(
            baseMeshAsset,
            animGroup,
            `Retargeted_${animGroup.name}`
          );
          
          if (retargetedAnim) {
            retargetedAnimations.push(retargetedAnim);
          }
        }
        
        retargetedAnimationsRef.current = retargetedAnimations;
        
        // Start first animation
        if (retargetedAnimations.length > 0) {
          currentAnimationRef.current = retargetedAnimations[0];
          currentAnimationRef.current.start(true);
        }
        
        // Setup camera bounds
        if (baseMeshes.length > 1) {
          let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
          let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
          
          baseMeshes.forEach(mesh => {
            if (mesh.getBoundingInfo()) {
              let meshMin = mesh.getBoundingInfo().boundingBox.minimumWorld;
              let meshMax = mesh.getBoundingInfo().boundingBox.maximumWorld;
              min = BABYLON.Vector3.Minimize(min, meshMin);
              max = BABYLON.Vector3.Maximize(max, meshMax);
            }
          });
          
          const center = BABYLON.Vector3.Center(min, max);
          camera.setTarget(center);
          
          const size = max.subtract(min);
          const maxDim = Math.max(size.x, size.y, size.z);
          
          // Set camera radius
          camera.radius = maxDim * 1.8;
          
          // Set zoom limits
          camera.lowerRadiusLimit = maxDim * 0.01;
          camera.upperRadiusLimit = maxDim * 3;
          
          // Optimize meshes for close viewing
          baseMeshes.forEach(mesh => {
            if (mesh.visibility !== 0) {
              mesh.alwaysSelectAsActiveMesh = true;
              if (mesh.getBoundingInfo()) {
                mesh.refreshBoundingInfo(true);
              }
              mesh.isNearGrabbable = true;
              mesh.doNotSyncBoundingInfo = false;
            }
          });
          
          // Camera constraints
          camera.checkCollisions = false;
          camera.noRotationConstraint = true;
          
          // Rotation limits
          const initialAlpha = Math.PI / 2;
          const alphaRange = Math.PI / 6;
          camera.lowerAlphaLimit = initialAlpha - alphaRange;
          camera.upperAlphaLimit = initialAlpha + alphaRange;
          
          const initialBeta = Math.PI / 2.5;
          const betaRange = Math.PI / 8;
          camera.lowerBetaLimit = initialBeta - betaRange;
          camera.upperBetaLimit = initialBeta + betaRange;
        }
      } catch (error) {
        console.error("Error loading model:", error);
      }
    };
    
    setupScene().then(() => {
      engine.runRenderLoop(() => {
        if (sceneRef.current) {
          sceneRef.current.render();
        }
      });
    });
    
    // Cleanup
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, [baseModelUrl, animModelUrl]);
  
  // Update rotation when state changes
  useEffect(() => {
    if (rotatableNodeRef.current) {
      rotatableNodeRef.current.rotation.x = BABYLON.Tools.ToRadians(rotation.x);
      rotatableNodeRef.current.rotation.y = BABYLON.Tools.ToRadians(rotation.y);
      rotatableNodeRef.current.rotation.z = BABYLON.Tools.ToRadians(rotation.z);
    }
  }, [rotation]);
  
  // Handle play/pause toggle
  const togglePlay = () => {
    if (!currentAnimationRef.current) return;
    
    if (currentAnimationRef.current.isPlaying) {
      currentAnimationRef.current.pause();
      setIsPlaying(false);
    } else {
      currentAnimationRef.current.restart();
      setIsPlaying(true);
    }
  };
  
  // Handle rotation change
  const handleRotationChange = (axis, value) => {
    setRotation(prev => ({ ...prev, [axis]: value }));
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      
      <ControlPanel 
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        rotation={rotation}
        onRotationChange={handleRotationChange}
      />
    </div>
  );
}

export default BabylonViewer;
