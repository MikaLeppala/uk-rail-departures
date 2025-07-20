import React, { useEffect, useState } from 'react';

interface WeatherData {
  temperature_2m: number;
  apparent_temperature: number;
  precipitation: number;
  wind_speed_10m: number;
  wind_direction_10m: number; // degrees
  weathercode: number;
}

interface HourlyWeather {
  time: string;
  temperature: number;
  weathercode: number;
}

const weatherCodeMap: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing dense drizzle',
  61: 'Slight rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

function getClothingSuggestion(temp: number, precip: number, code: number) {
  if (code >= 61 && code <= 67) return 'Bring an umbrella or raincoat.';
  if (code >= 71 && code <= 77) return 'Wear warm clothes, possible snow.';
  if (code >= 80 && code <= 82) return 'Rain showers expected, take a raincoat.';
  if (code >= 95) return 'Thunderstorm possible, stay safe.';
  if (temp < 5) return 'Dress warmly, it’s cold.';
  if (temp < 12) return 'Wear a jacket.';
  if (temp > 22) return 'T-shirt weather!';
  return 'Dress comfortably.';
}

// Add a function to get a weather icon (emoji) for a weather code
function getWeatherIcon(code: number) {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '❔';
}

// Suggest a sport based on wind and weather
function getSportSuggestion(wind: number, code: number) {
  if (code >= 61 && code <= 67) return 'Best to stay indoors (rainy)';
  if (code >= 71 && code <= 77) return 'Maybe build a snowman!';
  if (code >= 80 && code <= 82) return 'Take a raincoat for outdoor sports';
  if (code >= 95) return 'Thunderstorm: avoid outdoor sports';
  if (wind > 8) return 'Great for kite flying or windsurfing!';
  if (wind > 5) return 'Good for sailing or flying a kite';
  if (wind > 2) return 'Nice for running or cycling';
  return 'Perfect for a walk or picnic';
}

// Utility to convert wind direction in degrees to compass direction
function degToCompass(num: number) {
  const val = Math.floor((num / 22.5) + 0.5);
  const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return arr[(val % 16)];
}

const WeatherPanel: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourly, setHourly] = useState<HourlyWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [collapsed, setCollapsed] = useState(false);

  // Get user location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported');
      // Fallback to London coordinates
      setLocation({ lat: 51.5074, lon: -0.1278 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocError(null);
      },
      (err) => {
        setLocError('Location unavailable - showing London weather');
        // Fallback to London coordinates
        setLocation({ lat: 51.5074, lon: -0.1278 });
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  // Reverse geocode to get location name
  useEffect(() => {
    if (!location) {
      setLocationName('');
      return;
    }
    setLocationName('');
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lon}`)
      .then(res => res.json())
      .then(data => {
        if (data.address) {
          setLocationName(
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.hamlet ||
            data.address.county ||
            data.display_name?.split(',')[0] ||
            'Your Location'
          );
        } else {
          setLocationName('Your Location');
        }
      })
      .catch(() => setLocationName('Your Location'));
  }, [location]);

  // Fetch weather when location is available
  useEffect(() => {
    if (!location) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { lat, lon } = location;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weathercode&timezone=auto`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!data.current_weather && !data.current) throw new Error('No weather data');
        // Open-Meteo sometimes returns data.current or data.current_weather
        const current = data.current || data.current_weather;
        setWeather({
          temperature_2m: current.temperature_2m ?? current.temperature,
          apparent_temperature: current.apparent_temperature ?? current.temperature,
          precipitation: current.precipitation ?? 0,
          wind_speed_10m: current.wind_speed_10m ?? current.windspeed,
          wind_direction_10m: current.wind_direction_10m ?? current.winddirection,
          weathercode: current.weathercode,
        });
        // Find the current hour index
        const now = new Date();
        const idx = data.hourly.time.findIndex((t: string) => t.startsWith(now.toISOString().slice(0, 13)));
        // Get next 24 hours
        const hours: HourlyWeather[] = [];
        for (let i = idx + 1; i <= idx + 24; i++) {
          if (data.hourly.time[i]) {
            hours.push({
              time: data.hourly.time[i],
              temperature: data.hourly.temperature_2m[i],
              weathercode: data.hourly.weathercode[i],
            });
          }
        }
        setHourly(hours);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to fetch weather');
        setLoading(false);
      });
  }, [location]);

  // Suggestion and rain logic for next 12h
  let clothingText = '';
  let rainIn12h = false;
  if (weather && !loading && !error && hourly.length > 0) {
    const next12h = hourly.slice(0, 12);
    // Use the most severe code and max precip/temp in next 12h
    const maxTemp = Math.max(...next12h.map(h => h.temperature));
    const mainCode = next12h.reduce((prev, curr) => (curr.weathercode > prev.weathercode ? curr : prev), next12h[0]).weathercode;
    rainIn12h = next12h.some(h =>
      (h.weathercode >= 51 && h.weathercode <= 67) ||
      (h.weathercode >= 80 && h.weathercode <= 82) ||
      (h.weathercode === 63 || h.weathercode === 65)
    );
    clothingText = getClothingSuggestion(maxTemp, 0, mainCode);
  }

  const sportSuggestion = weather && !loading && !error ? getSportSuggestion(weather.wind_speed_10m, weather.weathercode) : '';

  return (
    <div style={{ width: '100%', background: '#e3eafc', borderRadius: 10, padding: '10px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 60, position: 'relative' }}>
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          position: 'absolute',
          top: 8,
          right: 12,
          background: '#357ab7',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '2px 10px',
          fontSize: '0.98em',
          cursor: 'pointer',
          zIndex: 20,
        }}
        aria-label={collapsed ? 'Expand weather panel' : 'Collapse weather panel'}
        title={collapsed ? 'Expand weather panel' : 'Collapse weather panel'}
      >
        {collapsed ? '▼' : '▲'}
      </button>
      {/* Top: Centered location and weather summary */}
      {!collapsed && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontWeight: 600, fontSize: '1.1em', letterSpacing: 0.2, color: '#357ab7', display: 'flex', alignItems: 'center', gap: 6 }}>
            {getWeatherIcon(weather?.weathercode ?? 0)}
            <span>{locationName ? locationName : (location ? 'Location' : '')}</span>
          </div>
          {weather && !loading && !error && (
            <div style={{ width: '100%', marginTop: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '1.05em', color: '#222', marginBottom: 2 }}>
                {weather.temperature_2m}°C &nbsp;·&nbsp; Feels like {weather.apparent_temperature}°C &nbsp;·&nbsp; {weatherCodeMap[weather.weathercode] || 'Unknown'} &nbsp;·&nbsp; Wind: {weather.wind_speed_10m} m/s {typeof weather.wind_direction_10m === 'number' ? `(${degToCompass(weather.wind_direction_10m)})` : ''}
              </div>
              <div style={{ fontSize: '0.98em', color: '#357ab7', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', justifySelf: 'center' }}>
                {sportSuggestion}
              </div>
            </div>
          )}
          {locError && <div style={{ color: 'red', fontSize: '0.95em' }}>{locError}</div>}
          {loading && <div style={{ fontSize: '0.95em' }}>Loading...</div>}
          {error && <div style={{ color: 'red', fontSize: '0.95em' }}>{error}</div>}
        </div>
      )}
      {/* Suggestion and rain chance message (now combined, only one line) */}
      {hourly.length > 0 && (
        <div style={{ color: rainIn12h ? '#357ab7' : '#4a90e2', fontWeight: 600, fontSize: '0.98em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, textAlign: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          {rainIn12h ? (
            <><span role="img" aria-label="rain">🌧️</span> Rain expected in the next 12 hours</>
          ) : (
            <><span role="img" aria-label="no rain">☀️</span> No rain expected in the next 12 hours</>
          )}
          {clothingText && <span style={{ color: '#357ab7', fontStyle: 'italic', fontWeight: 400, marginLeft: 8 }}>– {clothingText}</span>}
        </div>
      )}
      {/* Hourly forecast and rain chance */}
      <div style={{ width: '100%' }}>
        <div style={{
          fontWeight: 700,
          fontSize: '1.13em',
          color: '#357ab7',
          letterSpacing: 0.5,
          fontFamily: 'Segoe UI, Arial, sans-serif',
          marginBottom: 8,
          marginTop: 2,
          textAlign: 'left',
          position: 'relative',
          display: 'inline-block',
        }}>
          24h Forecast
          <span style={{
            display: 'block',
            height: 3,
            width: 44,
            background: 'linear-gradient(90deg, #4a90e2 60%, #357ab7 100%)',
            borderRadius: 2,
            marginTop: 2,
          }} />
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 2, paddingBottom: 2 }}>
          {hourly.slice(0, 24).map((h, i) => (
            <div key={h.time} style={{ minWidth: 36, maxWidth: 44, flex: '1 1 36px', background: '#fafdff', borderRadius: 7, boxShadow: '0 1px 3px rgba(60,90,130,0.07)', padding: '2px 1px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.95em' }}>
              <div style={{ fontSize: '1.1em', marginBottom: 0 }}>{getWeatherIcon(h.weathercode)}</div>
              <div style={{ fontWeight: 500, color: '#357ab7', fontSize: '0.98em', marginBottom: 0 }}>{Math.round(h.temperature)}°</div>
              <div style={{ fontSize: '0.8em', color: '#888', marginTop: 0 }}>{new Date(h.time).getHours()}:00</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherPanel; 