
'use client';

import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { useCallback, useState } from 'react';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: true,
  styles: [
    {
      "featureType": "all",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#7c93a3" }, { "lightness": "-10" }]
    },
    {
      "featureType": "administrative.country",
      "elementType": "geometry",
      "stylers": [{ "visibility": "on" }]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#e9e9e9" }]
    }
    // Simple muted theme
  ]
};

interface GridPoint {
  id: string;
  lat: number;
  lng: number;
  rank: number | null;
  label: string;
  bucket: string;
}

interface GridMapProps {
  center: { lat: number; lng: number };
  points: GridPoint[];
  apiKey: string;
}

export default function GridMap({ center, points, apiKey }: GridMapProps) {
  const isInvalidKey = !apiKey || apiKey.startsWith('AIza...') || apiKey.length < 20;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  if (isInvalidKey) {
    return (
      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="text-amber-500 font-bold">Configuração Necessária</div>
        <p className="text-xs text-gray-500 max-w-[200px]">
          A <b>Google Maps Key</b> não foi configurada no frontend.
        </p>
        <div className="text-[10px] bg-white border border-gray-200 p-2 rounded text-gray-400 font-mono">
          NEXT_PUBLIC_GOOGLE_MAPS_KEY missing
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center p-6 text-center space-y-2">
        <div className="text-red-600 font-bold text-sm">Erro ao Carregar Mapa</div>
        <p className="text-[10px] text-red-500 line-clamp-3">
          {loadError.message}
        </p>
      </div>
    );
  }

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={15}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {/* Center Marker for the Business */}
      <OverlayView
        position={center}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
        </div>
      </OverlayView>

      {/* Grid Points */}
      {points.map((point) => {
        const colorClass = 
            point.bucket === 'TOP3' ? 'bg-green-500' : 
            point.bucket === 'TOP10' ? 'bg-amber-500' : 
            point.bucket === 'TOP20' ? 'bg-red-500' : 
            'bg-gray-400';

        return (
          <OverlayView
            key={point.id}
            position={{ lat: point.lat, lng: point.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
                <div className={`w-6 h-6 ${colorClass} rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px] font-bold text-white`}>
                    {point.label === 'NR' ? 'X' : point.label}
                </div>
            </div>
          </OverlayView>
        );
      })}
    </GoogleMap>
  );
}
