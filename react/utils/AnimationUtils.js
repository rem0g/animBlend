export function retargetAnimWithBlendshapes(targetMeshAsset, animGroup, cloneName = "anim") {
  console.log("Retargeting animation to target mesh...");

  var morphName = null;
  var curMTM = 0;
  var morphIndex = 0;
  var mtm;

  return animGroup.clone(cloneName, (target) => {
    if (!target) {
      console.log("No target.");
      return null;
    }

    // First set all bone targets to the linkedTransformNode
    let idx = targetMeshAsset.skeletons[0].getBoneIndexByName(target.name);
    var targetBone = targetMeshAsset.skeletons[0].bones[idx];
    if (targetBone) {
      return targetBone._linkedTransformNode;
    }

    // Iterate over morphManagers if we don't have a new morph target
    // Otherwise reset the index
    if (morphName !== target.name) {
      curMTM = 0;
      morphName = target.name;
    }

    // If we don't have bones anymore, we can assume we are in the morph target section
    morphIndex = getMorphTargetIndex(targetMeshAsset.morphTargetManagers[curMTM], target.name);

    // Sometimes a mesh has extra bits of clothing like glasses, which are not part of the morph targets.
    // Because we don't know the order of the morph targets, we need to copy these values to the previous one.
    if (morphIndex === -1) {
      if (!mtm) { return null; }
      else { return mtm; }
    }

    mtm = targetMeshAsset.morphTargetManagers[curMTM].getTarget(morphIndex);
    curMTM++;

    return mtm;
  });
}

// Helper function to get the morph target index
export function getMorphTargetIndex(morphTargetManager, targetName) {
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
