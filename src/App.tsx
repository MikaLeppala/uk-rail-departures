import React, { useState } from 'react';
import './App.css';
import TrainBoard from './TrainBoard';
import WeatherPanel from './WeatherPanel';

function App() {
  // Use a 2D array for dynamic grid layout
  const [stations, setStations] = useState<string[][]>([
    ['SNR', 'PUO'],
    ['ECR', 'LBG']
  ]);

  const handleStationChange = (rowIndex: number, colIndex: number, value: string) => {
    const updated = stations.map(row => [...row]);
    updated[rowIndex][colIndex] = value.toUpperCase();
    setStations(updated);
  };

  const addStationHorizontal = () => {
    // Add a new column to each row
    const updated = stations.map(row => [...row, 'KGX']);
    setStations(updated);
  };

  const addStationVertical = () => {
    // Add a new row with the same number of columns as existing rows
    const updated = stations.map(row => [...row]);
    const newRow = new Array(updated[0]?.length || 2).fill('KGX');
    updated.push(newRow);
    setStations(updated);
  };

  const removeStation = (rowIndex: number, colIndex: number) => {
    const updated = stations.map(row => [...row]);
    updated[rowIndex].splice(colIndex, 1);
    
    // Remove empty rows
    const filtered = updated.filter(row => row.length > 0);
    
    // Ensure we have at least one station
    if (filtered.length === 0 || filtered.every(row => row.length === 0)) {
      setStations([['KGX']]);
    } else {
      setStations(filtered);
    }
  };

  // Calculate dynamic grid layout based on the 2D array
  const getGridStyle = () => {
    const maxCols = Math.max(...stations.map(row => row.length));
    
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${maxCols}, 1fr)`,
      gap: '20px',
      flex: 1,
    };
  };

  const AddButton = ({ onClick, direction, style }: { onClick: () => void, direction: 'horizontal' | 'vertical', style?: React.CSSProperties }) => (
    <div 
      className="add-panel-button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fa',
        border: '2px dashed #dee2e6',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'all 0.2s',
        minHeight: 120,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#e9ecef';
        e.currentTarget.style.borderColor = '#adb5bd';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#f8f9fa';
        e.currentTarget.style.borderColor = '#dee2e6';
      }}
    >
      <div style={{ textAlign: 'center', color: '#6c757d' }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>
        <div style={{ fontSize: 12 }}>
          Add {direction === 'horizontal' ? 'Right' : 'Below'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="weather-panel">
        <WeatherPanel />
      </div>
      <div style={getGridStyle()}>
        {stations.map((row, rowIndex) => 
          row.map((code, colIndex) => (
            <div key={`${rowIndex}-${colIndex}`} className="train-board-panel" style={{ position: 'relative' }}>
              <button
                onClick={() => removeStation(rowIndex, colIndex)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: '#f8f9fa',
                  color: '#6c757d',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  fontSize: 12,
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e9ecef';
                  e.currentTarget.style.color = '#495057';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.color = '#6c757d';
                }}
                title="Remove station"
              >
                ×
              </button>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: '0.9em', color: '#666' }}>Station:</span>
                <input
                  type="text"
                  value={code}
                  maxLength={3}
                  className="station-code-input"
                  onChange={e => handleStationChange(rowIndex, colIndex, e.target.value)}
                />
              </div>
              <TrainBoard stationCode={code} />
            </div>
          ))
        )}
        
        {/* Add Right button - positioned to the right of existing panels */}
        <AddButton 
          onClick={addStationHorizontal} 
          direction="horizontal" 
          style={{ 
            gridColumn: `${Math.max(...stations.map(row => row.length)) + 1}`,
            gridRow: `1 / span ${stations.length}`
          }}
        />
        
        {/* Add Below button - positioned below existing panels */}
        <AddButton 
          onClick={addStationVertical} 
          direction="vertical" 
          style={{ 
            gridRow: `${stations.length + 1}`,
            gridColumn: `1 / span ${Math.max(...stations.map(row => row.length))}`
          }}
        />
      </div>
    </div>
  );
}

export default App;
