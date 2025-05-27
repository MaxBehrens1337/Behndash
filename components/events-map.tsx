"use client";

import type React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; // Import L für custom icons

// Temporäre Typdefinitionen (später auslagern in types/events.ts)
interface Festival { // General festival type
  id: number;
  name: string; // Used for popup
  lat: number | null;
  lon: number | null;
  location?: string; // Optional, für Popup
  // Consider adding 'eventType' if you want to pass a unified list later
}

interface CityFestival { // Specific for city festivals
  id: number;
  festName: string; // Name of the city festival
  stadt?: string;    // City name, used for popup
  lat: number | null;
  lon: number | null;
  // Consider adding 'eventType'
}
// Ende temporäre Typdefinitionen

import HeatmapLayer from 'react-leaflet-heatmap-layer-v3';

import L, { HeatLatLngTuple } from 'leaflet'; // Import L für custom icons and HeatLatLngTuple

interface EventsMapProps {
  festivals: Festival[];
  cityFestivals: CityFestival[]; 
  eventTypeFilter: "festivals" | "cityFestivals" | "both";
  showHeatmap: boolean; 
  heatmapMode: "density" | "visitors"; // Added prop for heatmap mode
  // center?: [number, number];
  // zoom?: number;
}

// Leaflet Standard-Icon korrigieren
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

const defaultIconOptions: L.IconOptions = {
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
};

L.Icon.Default.mergeOptions(defaultIconOptions);

// Define icons - for this task, both will use the default appearance
// but could be customized later (e.g., with different colors or shapes if assets were available)
const festivalIcon = new L.Icon.Default();
const cityFestivalIcon = new L.Icon.Default(); 

const EventsMap: React.FC<EventsMapProps> = ({ festivals, cityFestivals, eventTypeFilter, showHeatmap, heatmapMode }) => {
  const mapCenter: [number, number] = [51.1657, 10.4515]; // Zentrum Deutschland
  const mapZoom = 6;

  // Filter out events without valid coordinates
  const validFestivals = festivals.filter(f => f.lat !== null && f.lon !== null && typeof f.visitors === 'number');
  const validCityFestivals = cityFestivals.filter(cf => cf.lat !== null && cf.lon !== null && typeof cf.besucher === 'number');

  let heatMapData: L.HeatLatLngTuple[] = [];
  if (showHeatmap) {
    const processEvent = (event: Festival | CityFestival, isCityFestival: boolean): L.HeatLatLngTuple | null => {
      if (event.lat === null || event.lon === null) return null;
      let intensity = 1;
      if (heatmapMode === "visitors") {
        const visitors = isCityFestival ? (event as CityFestival).besucher : (event as Festival).visitors;
        intensity = visitors > 0 ? visitors : 1; 
      }
      return [event.lat, event.lon, intensity];
    };

    if (eventTypeFilter === "festivals" || eventTypeFilter === "both") {
      validFestivals.forEach(f => {
        const point = processEvent(f, false);
        if (point) heatMapData.push(point);
      });
    }
    if (eventTypeFilter === "cityFestivals" || eventTypeFilter === "both") {
      validCityFestivals.forEach(cf => {
        const point = processEvent(cf, true);
        if (point) heatMapData.push(point);
      });
    }
  }

  if (typeof window === 'undefined') {
    return <p className="text-center p-10">Karte wird initialisiert...</p>;
  }

  return (
    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '600px', width: '100%' }} className="rounded-lg shadow-md">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {showHeatmap && heatMapData.length > 0 && (
        <HeatmapLayer
          points={heatMapData}
          longitudeExtractor={(m: L.HeatLatLngTuple) => m[1]}
          latitudeExtractor={(m: L.HeatLatLngTuple) => m[0]}
          intensityExtractor={(m: L.HeatLatLngTuple) => m[2]} // Use the third element for intensity
          radius={heatmapMode === 'density' ? 20 : 30}
          blur={heatmapMode === 'density' ? 15 : 25}
          max={heatmapMode === 'visitors' ? 50000 : 1} // Adjusted max based on mode
          minOpacity={0.2}
        />
      )}

      { !showHeatmap && (eventTypeFilter === "festivals" || eventTypeFilter === "both") &&
        validFestivals.map(festival => (
          <Marker key={`festival-${festival.id}`} position={[festival.lat!, festival.lon!]} icon={festivalIcon}>
            <Popup>
              <strong>Festival: {festival.name}</strong>
              {festival.location && <><br />{festival.location}</>}
            </Popup>
          </Marker>
        ))
      }

      { !showHeatmap && (eventTypeFilter === "cityFestivals" || eventTypeFilter === "both") &&
        validCityFestivals.map(cityFestival => (
          <Marker key={`cityFestival-${cityFestival.id}`} position={[cityFestival.lat!, cityFestival.lon!]} icon={cityFestivalIcon}>
            <Popup>
              <strong>Stadtfest: {cityFestival.festName}</strong>
              {cityFestival.stadt && <><br />{cityFestival.stadt}</>}
            </Popup>
          </Marker>
        ))
      }
    </MapContainer>
  );
};

export default EventsMap;
