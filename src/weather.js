const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';

export async function searchCities(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const response = await fetch(`${GEO}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
  if (!response.ok) throw new Error('City search is temporarily unavailable.');
  const data = await response.json();
  return (data.results || []).map((item) => ({
    id: `${item.id || item.name}-${item.latitude}-${item.longitude}`,
    name: item.name,
    admin: item.admin1 || item.country || '',
    country: item.country || '',
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone || 'auto',
  }));
}

export async function getWeather(city) {
  if (!city || !Number.isFinite(city.latitude) || !Number.isFinite(city.longitude)) throw new Error('Choose a city in Weather settings first.');
  const params = new URLSearchParams({
    latitude: String(city.latitude), longitude: String(city.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '1', timezone: city.timezone || 'auto',
  });
  const response = await fetch(`${FORECAST}?${params.toString()}`);
  if (!response.ok) throw new Error('Weather service could not be reached.');
  const data = await response.json();
  return { current: data.current, daily: data.daily, fetchedAt: new Date().toISOString(), timezone: data.timezone };
}

export function weatherLabel(code) {
  if (code === 0) return 'Clear sky';
  if ([1, 2].includes(code)) return 'Mainly clear';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Current conditions';
}

function localClockParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone && timezone !== 'auto' ? timezone : undefined, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
}

function slotKey(date, timezone) {
  const p = localClockParts(date, timezone);
  const hour = Number(p.hour);
  if (hour < 7) {
    const previous = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) - 86400000);
    return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}-${String(previous.getUTCDate()).padStart(2, '0')}T14`;
  }
  const slot = hour >= 14 ? '14' : '07';
  return `${p.year}-${p.month}-${p.day}T${slot}`;
}

export function weatherNeedsRefresh(fetchedAt, now = new Date(), timezone = 'auto') {
  if (!fetchedAt) return true;
  const last = new Date(fetchedAt);
  if (!Number.isFinite(last.getTime())) return true;
  return slotKey(last, timezone) < slotKey(now, timezone);
}
