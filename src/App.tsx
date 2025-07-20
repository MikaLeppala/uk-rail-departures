import React, { useState, useEffect } from 'react';
import './App.css';
import TrainBoard from './TrainBoard';
import WeatherPanel from './WeatherPanel';
import stationsData from './uk_stations.json';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  arrayMove,
} from '@dnd-kit/sortable';

interface Station {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const londonTerminals = [
  'KGX', 'EUS', 'PAD', 'WAT', 'VIC', 'LST', 'CHX', 'CST', 'FST', 'STP',
];

const fallbackStations = [
  'KGX', 'EUS', 'PAD', 'WAT'
];

const STORAGE_KEY = 'stationGrid';

function getId(row: number, col: number) {
  return `${row}-${col}`;
}

function parseId(id: string) {
  const [row, col] = id.split('-').map(Number);
  return { row, col };
}

function DraggableStationCell({
  id,
  code,
  rowIndex,
  colIndex,
  activeId,
  draggedCode,
  setActiveId,
  setDraggedCode,
  handleStationChange,
  removeStation,
}: {
  id: string;
  code: string;
  rowIndex: number;
  colIndex: number;
  activeId: string | null;
  draggedCode: string | null;
  setActiveId: (id: string | null) => void;
  setDraggedCode: (code: string | null) => void;
  handleStationChange: (row: number, col: number, value: string) => void;
  removeStation: (row: number, col: number) => void;
}) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id });
  const { setNodeRef: setDraggableRef, listeners, attributes, isDragging } = useDraggable({ id });
  return (
    <div
      ref={node => {
        setDroppableRef(node);
        setDraggableRef(node);
      }}
      key={id}
      id={id}
      style={{
        position: 'relative',
        background: isOver ? '#e3eafc' : (activeId === id ? '#e3eafc' : undefined),
        opacity: isDragging ? 0.5 : 1,
        transition: 'background 0.2s, opacity 0.2s',
      }}
      {...attributes}
      // Removed {...listeners} from here
    >
      <div style={{ cursor: 'grab', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
        <span
          style={{ fontSize: 18, marginRight: 6, userSelect: 'none', cursor: 'grab' }}
          {...listeners}
        >
          ☰
        </span>
        <span style={{ fontSize: '0.9em', color: '#666' }}>Station:</span>
        <input
          type="text"
          value={code}
          maxLength={3}
          className="station-code-input"
          onChange={e => handleStationChange(rowIndex, colIndex, e.target.value)}
        />
      </div>
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
      <TrainBoard stationCode={code} />
    </div>
  );
}

function App() {
  const [stations, setStations] = useState<string[][]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedCode, setDraggedCode] = useState<string | null>(null);
  const [colorOverlayOpen, setColorOverlayOpen] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string>(() => localStorage.getItem('primaryColor') || '#357ab7');

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    localStorage.setItem('primaryColor', primaryColor);
  }, [primaryColor]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Load from localStorage or use geolocation/default
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStations(parsed);
          return;
        }
      } catch {}
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // Find 2 closest stations (anywhere)
          const sorted = (stationsData as Station[])
            .map(st => ({
              ...st,
              dist: haversine(latitude, longitude, st.lat, st.lon)
            }))
            .sort((a, b) => a.dist - b.dist);
          const closest = sorted.slice(0, 2).map(st => st.code);
          // Find 2 closest London terminals
          const londonStations = (stationsData as Station[])
            .filter(st => londonTerminals.includes(st.code))
            .map(st => ({
              ...st,
              dist: haversine(latitude, longitude, st.lat, st.lon)
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 2)
            .map(st => st.code);
          setStations([closest, londonStations]);
        },
        () => {
          setStations([[fallbackStations[0], fallbackStations[1]], [fallbackStations[2], fallbackStations[3]]]);
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    } else {
      setStations([[fallbackStations[0], fallbackStations[1]], [fallbackStations[2], fallbackStations[3]]]);
    }
  }, []);

  // Persist to localStorage on any change
  useEffect(() => {
    if (stations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stations));
    }
  }, [stations]);

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

  // DnD handlers
  function handleDragStart(event: any) {
    setActiveId(event.active.id);
    const { row, col } = parseId(event.active.id);
    setDraggedCode(stations[row][col]);
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    setActiveId(null);
    setDraggedCode(null);
    if (!over || active.id === over.id) return;
    const { row: fromRow, col: fromCol } = parseId(active.id);
    const { row: toRow, col: toCol } = parseId(over.id);
    // Swap the station codes in the 2D array
    const updated = stations.map(row => [...row]);
    const temp = updated[fromRow][fromCol];
    updated[fromRow][fromCol] = updated[toRow][toCol];
    updated[toRow][toCol] = temp;
    setStations(updated);
  }

  function handleDragCancel() {
    setActiveId(null);
    setDraggedCode(null);
  }

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
    <div className="app-container" style={{ position: 'relative' }}>
      {/* Floating color picker button */}
      <button
        onClick={() => setColorOverlayOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 100,
          background: '#f3f4f7', // light gray
          color: '#888',
          border: '1.5px solid #d1d5db', // subtle border
          borderRadius: '50%',
          width: 48,
          height: 48,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          fontSize: 28,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
          transition: 'background 0.2s, color 0.2s, opacity 0.2s',
        }}
        aria-label="Choose color scheme"
        title="Choose color scheme"
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
      >
        <span style={{ opacity: 0.7 }}>🎨</span>
      </button>
      {/* Color wheel overlay */}
      {colorOverlayOpen && (
        <div
          onClick={e => {
            if (e.target === e.currentTarget) setColorOverlayOpen(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', minWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <button
              onClick={() => setColorOverlayOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer' }}
              aria-label="Close color picker"
              title="Close color picker"
            >
              ×
            </button>
            <h3 style={{ margin: '0 0 18px 0', color: 'var(--primary-color, #357ab7)' }}>Choose a color scheme</h3>
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              style={{ width: 120, height: 120, border: 'none', background: 'none', cursor: 'pointer' }}
              aria-label="Pick a color"
            />
            <div style={{ marginTop: 18, fontSize: 16, color: '#555' }}>{primaryColor}</div>
          </div>
        </div>
      )}
      <div className="weather-panel">
        <WeatherPanel />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div style={getGridStyle()}>
          {stations.map((row, rowIndex) => 
            row.map((code, colIndex) => {
              const id = getId(rowIndex, colIndex);
              return (
                <DraggableStationCell
                  key={id}
                  id={id}
                  code={code}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  activeId={activeId}
                  draggedCode={draggedCode}
                  setActiveId={setActiveId}
                  setDraggedCode={setDraggedCode}
                  handleStationChange={handleStationChange}
                  removeStation={removeStation}
                />
              );
            })
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
        <DragOverlay>
          {activeId && draggedCode && (
            <div className="train-board-panel" style={{ minWidth: 180, minHeight: 120, background: '#e3eafc', borderRadius: 10, boxShadow: '0 2px 10px rgba(60,90,130,0.07)' }}>
              <div style={{ cursor: 'grab', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 18, marginRight: 6, userSelect: 'none' }}>☰</span>
                <span style={{ fontSize: '0.9em', color: '#666' }}>Station:</span>
                <input
                  type="text"
                  value={draggedCode}
                  maxLength={3}
                  className="station-code-input"
                  readOnly
                />
              </div>
              <TrainBoard stationCode={draggedCode} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default App;
