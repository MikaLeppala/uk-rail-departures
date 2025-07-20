import React, { useEffect, useState } from 'react';

interface TrainService {
  std: string; // scheduled departure
  etd: string; // estimated departure
  platform?: string;
  destination: { locationName: string }[];
  operator: string;
  serviceID: string;
}

interface WeatherData {
  temperature_2m: number;
  weathercode: number;
}

interface TrainBoardProps {
  stationCode: string;
}

// Station coordinates (approximate) - you can expand this
const stationCoordinates: Record<string, { lat: number; lon: number }> = {
  'SNR': { lat: 51.3483, lon: -0.0936 }, // Sanderstead
  'PUO': { lat: 51.3475, lon: -0.1147 }, // Purley Oaks
  'ECR': { lat: 51.3755, lon: -0.1132 }, // East Croydon
  'LBG': { lat: 51.5052, lon: -0.0864 }, // London Bridge
  'KGX': { lat: 51.5320, lon: -0.1233 }, // King's Cross
  'EUS': { lat: 51.5285, lon: -0.1339 }, // Euston
  'PAD': { lat: 51.5154, lon: -0.1755 }, // Paddington
  'WAT': { lat: 51.5033, lon: -0.1145 }, // Waterloo
};

const weatherCodeMap: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌧️', 53: '🌧️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌦️', 82: '🌦️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

const headerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #4a90e2 60%, #357ab7 100%)',
  color: 'white',
  padding: '8px 14px',
  borderRadius: '8px 8px 0 0',
  fontSize: '1.1em',
  fontWeight: 600,
  letterSpacing: '0.5px',
  marginBottom: 0,
  display: 'flex',
  alignItems: 'center',
  minHeight: 36,
};

const compactHeaderStyle: React.CSSProperties = {
  ...headerStyle,
  padding: '4px 8px',
  fontSize: '0.98em',
  minHeight: 22,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  fontSize: '1em',
  borderCollapse: 'collapse',
  marginTop: 0,
  tableLayout: 'fixed',
};

const compactTableStyle: React.CSSProperties = {
  ...tableStyle,
  fontSize: '0.92em',
  marginTop: 0,
  tableLayout: 'fixed',
  width: '100%',
};

const thStyle: React.CSSProperties = {
  background: '#f8f9fa',
  padding: '6px 8px',
  textAlign: 'left',
  borderBottom: '1px solid #dee2e6',
  fontWeight: 600,
  color: '#495057',
};

const compactThStyle: React.CSSProperties = {
  ...thStyle,
  padding: '2px 4px',
  fontSize: '0.92em',
  whiteSpace: 'nowrap',
  fontWeight: 'bold',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid #f1f3f4',
  verticalAlign: 'top',
};

const compactTdStyle: React.CSSProperties = {
  ...tdStyle,
  padding: '2px 4px',
  fontSize: '0.91em',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  maxWidth: 90,
};

const rowEven: React.CSSProperties = { background: '#fafbfc' };
const rowOdd: React.CSSProperties = { background: '#ffffff' };

const fadedTime: React.CSSProperties = {
  textDecoration: 'line-through',
  color: '#999',
  marginRight: 4,
};

const highlightTime: React.CSSProperties = {
  color: '#d63031',
  fontWeight: 600,
};

const TrainBoard: React.FC<TrainBoardProps> = ({ stationCode }) => {
  const [services, setServices] = useState<TrainService[]>([]);
  const [stationName, setStationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Fetch train departures
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`https://huxley2.azurewebsites.net/departures/${stationCode}?expand=true&numRows=8`)
      .then(res => res.json())
      .then(data => {
        setStationName(data.locationName);
        setServices(data.trainServices || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch departures');
        setLoading(false);
      });
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetch(`https://huxley2.azurewebsites.net/departures/${stationCode}?expand=true&numRows=8`)
        .then(res => res.json())
        .then(data => {
          setStationName(data.locationName);
          setServices(data.trainServices || []);
        })
        .catch(err => {
          setError('Failed to fetch departures');
        });
    }, 30000);
    return () => clearInterval(interval);
  }, [stationCode]);

  // Fetch weather data
  useEffect(() => {
    const coords = stationCoordinates[stationCode];
    if (!coords) {
      setWeatherLoading(false);
      return;
    }

    const fetchWeather = () => {
      setWeatherLoading(true);
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weathercode&hourly=temperature_2m,weathercode&timezone=auto`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.current) {
            setWeather({
              temperature_2m: data.current.temperature_2m,
              weathercode: data.current.weathercode,
            });
          }
          
          // Get next 6 hours
          if (data.hourly && data.hourly.time) {
            const now = new Date();
            const idx = data.hourly.time.findIndex((t: string) => t.startsWith(now.toISOString().slice(0, 13)));
            const hours: WeatherData[] = [];
            for (let i = idx + 1; i <= idx + 6; i++) {
              if (data.hourly.time[i]) {
                hours.push({
                  temperature_2m: data.hourly.temperature_2m[i],
                  weathercode: data.hourly.weathercode[i],
                });
              }
            }
            // setHourlyWeather(hours); // This line is removed
          }
          setWeatherLoading(false);
        })
        .catch(() => {
          setWeatherLoading(false);
        });
    };

    // Initial fetch
    fetchWeather();

    // Auto-refresh weather every hour (3600000 ms)
    const weatherInterval = setInterval(fetchWeather, 3600000);
    
    return () => clearInterval(weatherInterval);
  }, [stationCode]);

  return (
    <div style={{ boxShadow: '0 2px 10px rgba(60,90,130,0.07)', borderRadius: 10, background: '#fafdff', overflow: 'hidden', minHeight: 120 }}>
      <div style={compactHeaderStyle}>
        <span style={{ flex: 1 }}>{stationName || stationCode} Departures</span>
        {/* Compact weather in header */}
        {!weatherLoading && weather && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4,
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: 4, 
            padding: '2px 6px', 
            fontSize: '0.85em',
            marginLeft: 8
          }}>
            <span>{weatherCodeMap[weather.weathercode] || '❔'}</span>
            <span>{Math.round(weather.temperature_2m)}°C</span>
          </div>
        )}
      </div>
      <div style={{ padding: 8 }}>
        {loading && <div>Loading...</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {!loading && !error && (
          <div style={{ maxHeight: 140, overflowY: 'auto' }}>
            <table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={{ ...compactThStyle, width: '120px', whiteSpace: 'normal' }}>Time</th>
                  <th style={{ ...compactThStyle, width: '140px' }}>Destination</th>
                  <th style={{ ...compactThStyle, width: '48px' }}>Plat</th>
                  <th style={{ ...compactThStyle, width: '80px' }}>Operator</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      No departures found
                    </td>
                  </tr>
                ) : (
                  services.map((service, idx) => (
                    <tr key={service.serviceID} style={idx % 2 === 0 ? rowEven : rowOdd}>
                      <td style={{ ...compactTdStyle, minWidth: 100, maxWidth: 140, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {service.std !== service.etd && service.etd !== 'On time' ? (
                          <>
                            <span style={fadedTime}>{service.std}</span>
                            <span style={{ ...highlightTime, fontSize: service.etd.length > 8 ? '0.95em' : '1em', display: 'inline-block', lineHeight: 1.1 }}>{service.etd}</span>
                          </>
                        ) : (
                          <span style={{ fontWeight: 500 }}>{service.std}</span>
                        )}
                      </td>
                      <td style={{ ...compactTdStyle, maxWidth: 120 }} title={service.destination.map(dest => dest.locationName).join(', ')}>
                        {service.destination.map(dest => dest.locationName).join(', ')}
                      </td>
                      <td style={compactTdStyle}>{service.platform || '-'}</td>
                      <td style={compactTdStyle}>{service.operator}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainBoard; 