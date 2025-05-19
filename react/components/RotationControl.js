import React from 'react';

function RotationControl({ axis, value, onChange, min, max }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <label style={{
        width: '20px',
        textAlign: 'right',
      }}>
        {axis}
      </label>
      
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          flex: 1,
        }}
      />
      
      <span style={{
        width: '40px',
        textAlign: 'right',
      }}>
        {value}°
      </span>
    </div>
  );
}

export default RotationControl;
