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
    name: item.name, admin: item.admin1 || item.country || '', country: item.country || '',
    latitude: item.latitude, longitude: item.longitude, timezone: item.timezone || 'auto',
  }));
}

export async function getWeather(city) {
  if (!city || !Number.isFinite(city.latitude) || !Number.isFinite(city.longitude)) throw new Error('Choose a city in Weather settings first.');
  const params = new URLSearchParams({
    latitude: String(city.latitude), longitude: String(city.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '2', timezone: city.timezone || 'auto',
  });
  const response = await fetch(`${FORECAST}?${params.toString()}`);
  if (!response.ok) throw new Error('Weather service could not be reached.');
  const data = await response.json();
  return { current: data.current, hourly: data.hourly, daily: data.daily, fetchedAt: new Date().toISOString(), timezone: data.timezone, utcOffsetSeconds: data.utc_offset_seconds || 0 };
}

export function weatherLabel(code) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Variable conditions';
}

export function feelsLikeLabel(value) {
  if (!Number.isFinite(value)) return '';
  if (value >= 36) return 'Very hot';
  if (value >= 32) return 'Hot';
  if (value >= 27) return 'Warm';
  if (value >= 20) return 'Comfortable';
  if (value >= 14) return 'Cool';
  return 'Cold';
}

export function forecastTimeToDate(value, data) {
  if (!value) return new Date(NaN);
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return new Date(value);
  const [, y, m, d, h, min] = match.map((v, i) => i === 0 ? v : Number(v));
  return new Date(Date.UTC(y, m - 1, d, h, min) - Number(data?.utcOffsetSeconds || 0) * 1000);
}

export function formatForecastTime(value, data, options = { hour: 'numeric', minute: '2-digit' }) {
  const date = forecastTimeToDate(value, data);
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: data?.timezone && data.timezone !== 'auto' ? data.timezone : undefined }).format(date);
}

const isWetCode = (code) => [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(Number(code));
const isStormCode = (code) => [95, 96, 99].includes(Number(code));

// Finds only meaningful changes in the next 24 hours; ordinary hourly variation is ignored.
export function findNextWeatherChange(data, now = new Date()) {
  const h = data?.hourly;
  if (!h?.time?.length) return null;
  const start = now.getTime();
  const candidates = [];
  for (let i = 0; i < h.time.length; i += 1) {
    const at = forecastTimeToDate(h.time[i], data);
    const delta = at.getTime() - start;
    if (!Number.isFinite(at.getTime()) || delta < 25 * 60 * 1000 || delta > 24 * 60 * 60 * 1000) continue;
    const code = Number(h.weather_code?.[i] ?? 0);
    const rainProb = Number(h.precipitation_probability?.[i] ?? 0);
    const rain = Number(h.precipitation?.[i] ?? 0);
    const apparent = Number(h.apparent_temperature?.[i] ?? h.temperature_2m?.[i] ?? NaN);
    const gust = Number(h.wind_gusts_10m?.[i] ?? 0);
    const prevCode = Number(h.weather_code?.[Math.max(0, i - 1)] ?? data.current?.weather_code ?? 0);
    const prevApparent = Number(h.apparent_temperature?.[Math.max(0, i - 1)] ?? data.current?.apparent_temperature ?? NaN);
    let event = null;
    if (isStormCode(code) && !isStormCode(prevCode)) event = { kind: 'storm', title: 'Thunderstorms possible', detail: 'Thunderstorms are forecast', severity: 4 };
    else if (isWetCode(code) && !isWetCode(prevCode) && (rainProb >= 45 || rain > 0.1)) event = { kind: 'rain', title: 'Rain expected', detail: `${Math.round(rainProb)}% chance of rain`, severity: 3 };
    else if (Number.isFinite(apparent) && apparent >= 36 && (!Number.isFinite(prevApparent) || prevApparent < 34)) event = { kind: 'heat', title: 'Very hot conditions', detail: `Feels like ${Math.round(apparent)}°`, severity: 3 };
    else if (Number.isFinite(apparent) && Number.isFinite(prevApparent) && apparent - prevApparent >= 5) event = { kind: 'warming', title: 'Temperature rising', detail: `Feels about ${Math.round(apparent - prevApparent)}° hotter`, severity: 1 };
    else if (Number.isFinite(apparent) && Number.isFinite(prevApparent) && prevApparent - apparent >= 6) event = { kind: 'cooling', title: 'Cooler conditions', detail: `Around ${Math.round(prevApparent - apparent)}° cooler`, severity: 1 };
    else if (gust >= 45 && Number(h.wind_gusts_10m?.[Math.max(0, i - 1)] ?? 0) < 40) event = { kind: 'wind', title: 'Strong winds possible', detail: `Wind gusts up to ${Math.round(gust)} km/h`, severity: 3 };
    if (event) candidates.push({ ...event, at: h.time[i], temperature: h.temperature_2m?.[i], weatherCode: code });
  }
  return candidates.sort((a, b) => forecastTimeToDate(a.at, data) - forecastTimeToDate(b.at, data))[0] || null;
}

export function getUpcomingForecast(data, now = new Date(), count = 4) {
  const h = data?.hourly;
  if (!h?.time?.length) return [];
  const start = now.getTime();
  const rows = [];
  for (let i = 0; i < h.time.length && rows.length < count; i += 1) {
    const at = forecastTimeToDate(h.time[i], data);
    if (!Number.isFinite(at.getTime()) || at.getTime() < start + 45 * 60 * 1000) continue;
    if (rows.length && at.getTime() - forecastTimeToDate(rows[rows.length - 1].time, data).getTime() < 3 * 60 * 60 * 1000) continue;
    rows.push({ time: h.time[i], code: h.weather_code?.[i], temperature: h.temperature_2m?.[i], rainProbability: h.precipitation_probability?.[i] });
  }
  return rows;
}

function localClockParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone && timezone !== 'auto' ? timezone : undefined, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
}
function slotKey(date, timezone) {
  const p = localClockParts(date, timezone); const hour = Number(p.hour);
  if (hour < 7) { const previous = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) - 86400000); return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}-${String(previous.getUTCDate()).padStart(2, '0')}T14`; }
  const slot = hour >= 14 ? '14' : '07'; return `${p.year}-${p.month}-${p.day}T${slot}`;
}
export function weatherNeedsRefresh(fetchedAt, now = new Date(), timezone = 'auto') {
  if (!fetchedAt) return true;
  const last = new Date(fetchedAt); if (!Number.isFinite(last.getTime())) return true;
  return slotKey(last, timezone) < slotKey(now, timezone);
}
