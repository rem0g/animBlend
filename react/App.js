import React from 'react';
import BabylonViewer from './components/BabylonViewer';

function App() {
  // Model URLs
  const baseModelUrl = "https://signcollect.nl/jari/BabylonSignLab/LoadingAnimation/MeshesAndAnims/glassesGuyNew.glb";
  const animModelUrl = "https://signcollect.nl/gebarenoverleg_media/fbx/LELYSTAD_250314_1_GlassesGuyRecord_C_1.glb";

  return (
    <div className="App" style={{ width: '100%', height: '100%' }}>
      <BabylonViewer 
        baseModelUrl={baseModelUrl}
        animModelUrl={animModelUrl}
      />
    </div>
  );
}

export default App;
