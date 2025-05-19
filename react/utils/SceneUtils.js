import * as BABYLON from 'babylonjs';

export async function createScene(canvas) {
  console.log("Loading Scene!");

  var options = {
    antialias: true,
    powerPreference: "high-performance",
    stencil: true,
  };

  var engine = new BABYLON.Engine(canvas, options);
  engine.disableManifestCheck = true;

  BABYLON.Animation.AllowMatricesInterpolation = true;

  // This creates a basic Babylon Scene object
  var scene = new BABYLON.Scene(engine);

  // This creates a light, aiming 0,1,0 - to the sky
  var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

  console.log("Scene loaded successfully.");
  return [scene, engine];
}

export async function loadAssetMesh(scene, path, fileName, bugger = false) {
  console.log("Loading mesh from: " + path + fileName + "...");

  // Configure GLB/GLTF loader
  BABYLON.SceneLoader.OnPluginActivatedObservable.add(function (loader) {
    if (loader.name === "gltf" || loader.name === "glb") {
      loader.animationStartMode = BABYLON.GLTFLoaderAnimationStartMode.NONE;
    }
  });

  if (bugger) {
    scene.debugLayer.show({
      embedMode: true
    });
  }

  const asset = {
    fetched: await BABYLON.SceneLoader.ImportMeshAsync(null, path, fileName, scene),
    root: null,
    faceMesh: null,
    teethMesh: null,
    hips: null,
    eyeMesh: null,
    morphTargetManagers: [],
    skeletons: [],
    animationGroups: [],
    papa: null,
    opa: null,
    god: null,
    vicon: false,
    resetMorphs: function resetMorphTargets() {
      this.fetched.meshes.forEach(mesh => {
        if (mesh.morphTargetManager) {
          let morphTargetManager = mesh.morphTargetManager;
          for (let i = 0; i < morphTargetManager.numTargets; i++) {
            let morphTarget = morphTargetManager.getTarget(i);
            morphTarget.influence = 0;
          }
        }
      });
    },
    getAllTransformNodes: function () {
      return this.fetched.transformNodes;
    },
    setAvatarSpecificFunctionalities: function () {
      const viconTransformNodes = this.getAllTransformNodes().filter((node) => node.name.includes("Vicon"));
      if (viconTransformNodes.length > 0) {
        console.log("Vicon Avatar detected.");
        this.vicon = true;
        this.fetched.meshes.forEach((mesh) => {
          if (mesh.material) {
            console.log(mesh.material);
            mesh.material.useAlphaFromAlbedoTexture = false;
          }
        });
      }
    }
  };

  asset.setAvatarSpecificFunctionalities();

  // Find all animation groups
  for (const animGroup of scene.animationGroups) {
    asset.animationGroups.push(animGroup);
  }

  // Find the root mesh and the face mesh for its morph target manager
  for (const mesh of asset.fetched.meshes) {
    mesh.position = new BABYLON.Vector3(0, 0, 0);

    if (mesh.name === "__root__") {
      asset.root = mesh;
    } else if (mesh.name === "newNeutral_primitive0") {
      asset.eyeMesh = mesh;
    } else if (mesh.name === "newNeutral_primitive1") {
      asset.faceMesh = mesh;
    } else if (mesh.name === "newNeutral_primitive2") {
      asset.teethMesh = mesh;
    }

    if (mesh.morphTargetManager) {
      asset.morphTargetManagers.push(mesh.morphTargetManager);
    }
  }

  // Put the root mesh node in an empty transform node
  var rootTransformNode = new BABYLON.TransformNode("papa");
  asset.root.parent = rootTransformNode;
  asset.papa = rootTransformNode;
  var papaTransformNode = new BABYLON.TransformNode("opa");
  asset.papa.parent = papaTransformNode;
  asset.opa = papaTransformNode;
  var opaTransformNode = new BABYLON.TransformNode("god");
  asset.opa.parent = opaTransformNode;
  asset.god = opaTransformNode;

  // Find all skeletons
  for (const skeleton of asset.fetched.skeletons) {
    asset.skeletons.push(skeleton);
  }

  // Find the hips transform node
  for (const transformNode of asset.fetched.transformNodes) {
    if (transformNode.name === "Hips" || transformNode.name === "hips" || transformNode.name === "pelvis" || transformNode.name === "Pelvis") {
      asset.hips = transformNode;
    }
  }

  return asset;
}
