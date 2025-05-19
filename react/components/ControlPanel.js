import React from 'react';
import RotationControl from './RotationControl';

function ControlPanel({ isPlaying, togglePlay, rotation, onRotationChange }) {
  return (
    <div 
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        borderRadius: '5px',
        zIndex: 100,
      }}
    >
      <button 
        onClick={togglePlay}
        style={{
          padding: '5px 10px',
          borderRadius: '3px',
        }}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: '10px',
        }}
      >
        <RotationControl 
          axis="X"
          value={rotation.x}
          onChange={(value) => onRotationChange('x', value)}
          min={-180}
          max={180}
        />
        
        <RotationControl 
          axis="Y"
          value={rotation.y}
          onChange={(value) => onRotationChange('y', value)}
          min={-180}
          max={180}
        />
        
        <RotationControl 
          axis="Z"
          value={rotation.z}
          onChange={(value) => onRotationChange('z', value)}
          min={-180}
          max={180}
        />
      </div>
    </div>
  );
}

export default ControlPanel;
