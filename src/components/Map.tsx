
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface LocationTrack {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

const Map = ({ currentLocation, isTracking }: { 
  currentLocation: { latitude: number; longitude: number } | null;
  isTracking: boolean;
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHR2eTZ2ODkwMXh3MmltbGR5N2J5YjlwIn0.PxWvNAdG6rPFaLov-WAkrA';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      zoom: 15,
      center: currentLocation ? [currentLocation.longitude, currentLocation.latitude] : [0, 0],
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Load location history
    const loadLocationHistory = async () => {
      try {
        const { data: tracks, error } = await supabase
          .from('location_tracks')
          .select('*')
          .order('timestamp', { ascending: true });

        if (error) throw error;

        if (tracks && tracks.length > 0) {
          // Create a GeoJSON feature collection from the tracks
          const geojson = {
            type: 'FeatureCollection',
            features: tracks.map((track: LocationTrack) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [track.longitude, track.latitude],
              },
              properties: {
                timestamp: track.timestamp,
              },
            })),
          };

          // Add the track points to the map
          map.current?.addSource('tracks', {
            type: 'geojson',
            data: geojson,
          });

          // Add a line connecting the points
          map.current?.addLayer({
            id: 'route',
            type: 'line',
            source: 'tracks',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 3,
            },
          });

          // Add points
          map.current?.addLayer({
            id: 'points',
            type: 'circle',
            source: 'tracks',
            paint: {
              'circle-radius': 4,
              'circle-color': '#3b82f6',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff',
            },
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load location history",
        });
      }
    };

    loadLocationHistory();

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update marker position when current location changes
  useEffect(() => {
    if (!map.current || !currentLocation) return;

    if (!marker.current) {
      marker.current = new mapboxgl.Marker()
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(map.current);
    } else {
      marker.current.setLngLat([currentLocation.longitude, currentLocation.latitude]);
    }

    if (isTracking) {
      map.current.flyTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 15,
      });
    }
  }, [currentLocation, isTracking]);

  return (
    <div className="relative w-full h-[60vh] rounded-lg overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default Map;
