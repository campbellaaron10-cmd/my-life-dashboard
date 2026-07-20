import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const LOCATION_KEY = "atlas.weatherLocation";
const DEFAULT_LOCATION = { lat: 40.7128, lon: -74.006, label: "New York, NY" };

export type LocationCoords = { lat: number; lon: number; label?: string };

export type WeatherNow = {
  temperature: number;
  apparent: number;
  code: number;
  isDay: boolean;
  wind: number;
  humidity: number;
};

export type WeatherHourly = { time: string; temp: number; code: number; precipProb: number };
export type WeatherDay = {
  date: string;
  tempMax: number;
  tempMin: number;
  code: number;
  precipProb: number;
  sunrise: string;
  sunset: string;
};

export type WeatherBundle = {
  location: LocationCoords;
  now: WeatherNow;
  hourly: WeatherHourly[];
  daily: WeatherDay[];
};

export function weatherCondition(code: number): { label: string; icon: string } {
  // Open-Meteo WMO codes → short label
  if (code === 0) return { label: "Clear", icon: "sun" };
  if (code <= 2) return { label: "Mostly clear", icon: "sun" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code <= 48) return { label: "Fog", icon: "cloud" };
  if (code <= 57) return { label: "Drizzle", icon: "rain" };
  if (code <= 67) return { label: "Rain", icon: "rain" };
  if (code <= 77) return { label: "Snow", icon: "snow" };
  if (code <= 82) return { label: "Showers", icon: "rain" };
  if (code <= 86) return { label: "Snow showers", icon: "snow" };
  if (code <= 99) return { label: "Thunderstorm", icon: "storm" };
  return { label: "—", icon: "sun" };
}

export function useSavedLocation() {
  const [location, setLocation] = useState<LocationCoords>(DEFAULT_LOCATION);
  useEffect(() => {
    const saved = localStorage.getItem(LOCATION_KEY);
    if (saved) {
      try {
        setLocation(JSON.parse(saved));
        return;
      } catch {}
    }
    // Try geolocation once, silent-fail to default.
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
          setLocation(loc);
        },
        () => {},
        { timeout: 4000 },
      );
    }
  }, []);
  const save = (loc: LocationCoords) => {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
    setLocation(loc);
  };
  return { location, save };
}

export function useWeather(location: LocationCoords) {
  return useQuery<WeatherBundle>({
    queryKey: ["weather", location.lat, location.lon],
    queryFn: async () => {
      const params = new URLSearchParams({
        latitude: String(location.lat),
        longitude: String(location.lon),
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m",
        hourly: "temperature_2m,weather_code,precipitation_probability",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        forecast_days: "7",
        timezone: "auto",
      });
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!res.ok) throw new Error("Weather service unavailable");
      const j = await res.json();
      const nowIso = new Date().toISOString().slice(0, 13);
      const startIdx = Math.max(0, j.hourly.time.findIndex((t: string) => t.slice(0, 13) >= nowIso));
      const hourly: WeatherHourly[] = j.hourly.time.slice(startIdx, startIdx + 24).map((t: string, i: number) => ({
        time: t,
        temp: j.hourly.temperature_2m[startIdx + i],
        code: j.hourly.weather_code[startIdx + i],
        precipProb: j.hourly.precipitation_probability?.[startIdx + i] ?? 0,
      }));
      const daily: WeatherDay[] = j.daily.time.map((d: string, i: number) => ({
        date: d,
        tempMax: j.daily.temperature_2m_max[i],
        tempMin: j.daily.temperature_2m_min[i],
        code: j.daily.weather_code[i],
        precipProb: j.daily.precipitation_probability_max?.[i] ?? 0,
        sunrise: j.daily.sunrise[i],
        sunset: j.daily.sunset[i],
      }));
      return {
        location,
        now: {
          temperature: j.current.temperature_2m,
          apparent: j.current.apparent_temperature,
          code: j.current.weather_code,
          isDay: j.current.is_day === 1,
          wind: j.current.wind_speed_10m,
          humidity: j.current.relative_humidity_2m,
        },
        hourly,
        daily,
      };
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
}

export async function geocodeCity(name: string): Promise<LocationCoords[]> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5`,
  );
  if (!res.ok) return [];
  const j = await res.json();
  return (j.results ?? []).map((r: any) => ({
    lat: r.latitude,
    lon: r.longitude,
    label: [r.name, r.admin1, r.country_code].filter(Boolean).join(", "),
  }));
}
