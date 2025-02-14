
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Compass, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";

interface LocationTrack {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  notes?: string;
}

const Tracking = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [watchId, setWatchId] = useState<string | number | null>(null);
  const navigate = useNavigate();

  // Query to fetch user's recent tracks
  const { data: recentTracks } = useQuery({
    queryKey: ['location-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_tracks')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as LocationTrack[];
    },
  });

  // Mutation to save location track
  const { mutate: saveTrack } = useMutation({
    mutationFn: async (newTrack: Omit<LocationTrack, 'id' | 'user_id' | 'timestamp'>) => {
      const { data, error } = await supabase
        .from('location_tracks')
        .insert([newTrack]);

      if (error) throw error;
      return data;
    },
  });

  const generateLocalInsight = (latitude: number, longitude: number) => {
    // Simple rule-based system for location insights
    const timeOfDay = new Date().getHours();
    let basicInsight = "Drive safely and maintain proper distance from other vehicles. ";
    
    // Time-based suggestions
    if (timeOfDay >= 20 || timeOfDay <= 5) {
      basicInsight += "It's dark outside - ensure your headlights are on and be extra vigilant. ";
    } else if (timeOfDay >= 6 && timeOfDay <= 9) {
      basicInsight += "Morning rush hour - expect increased traffic. ";
    } else if (timeOfDay >= 16 && timeOfDay <= 19) {
      basicInsight += "Evening rush hour - stay alert for heavy traffic. ";
    }

    // Location-based basic insights
    if (latitude > 0) {
      basicInsight += "Driving in the Northern Hemisphere - watch for seasonal weather changes. ";
    } else {
      basicInsight += "Driving in the Southern Hemisphere - watch for seasonal weather changes. ";
    }

    // Speed and movement suggestions
    if (navigator.onLine) {
      basicInsight += "You're connected - real-time traffic data is available. ";
    } else {
      basicInsight += "You're offline - drive with extra caution as traffic data is unavailable. ";
    }

    return basicInsight;
  };

  const startTracking = async () => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please log in to start tracking"
        });
        navigate("/login");
        return;
      }

      // Try Capacitor Geolocation first
      try {
        const permResult = await Geolocation.checkPermissions();
        if (permResult.location !== 'granted') {
          await Geolocation.requestPermissions();
        }

        const watchId = await Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 1000
        }, (position) => {
          if (position) {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setLocation(newLocation);
            const insight = generateLocalInsight(newLocation.latitude, newLocation.longitude);
            setAiSuggestion(insight);

            // Save location to Supabase
            saveTrack({
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
            });
          }
        });
        setWatchId(watchId);
      } catch (capacitorError) {
        // Fallback to browser geolocation if Capacitor fails
        console.log("Falling back to browser geolocation");
        if ('geolocation' in navigator) {
          const id = navigator.geolocation.watchPosition(
            (position) => {
              const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              setLocation(newLocation);
              const insight = generateLocalInsight(newLocation.latitude, newLocation.longitude);
              setAiSuggestion(insight);

              // Save location to Supabase
              saveTrack({
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
              });
            },
            (error) => {
              console.error('Geolocation error:', error);
              toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to get location. Please enable location services."
              });
            },
            {
              enableHighAccuracy: true,
              timeout: 1000
            }
          );
          setWatchId(id);
        }
      }

      setIsTracking(true);
      toast({
        title: "Tracking Started",
        description: "Your location is now being tracked in real-time"
      });

    } catch (error) {
      console.error('Error starting tracking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start location tracking"
      });
    }
  };

  const stopTracking = async () => {
    try {
      if (watchId !== null) {
        // Try to clear Capacitor watch
        try {
          await Geolocation.clearWatch({ id: watchId as string });
        } catch {
          // If Capacitor fails, clear browser watch
          navigator.geolocation.clearWatch(watchId as number);
        }
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }

    setWatchId(null);
    setIsTracking(false);
    setAiSuggestion("");
    toast({
      title: "Tracking Stopped",
      description: "Location tracking has been stopped"
    });
  };

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      if (watchId !== null) {
        stopTracking();
      }
    };
  }, [watchId]);

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Live Tracking</h1>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="h-5 w-5 text-primary" />
                <span className="font-medium">Current Location:</span>
              </div>
              <Button
                onClick={isTracking ? stopTracking : startTracking}
                variant={isTracking ? "destructive" : "default"}
              >
                {isTracking ? "Stop Tracking" : "Start Tracking"}
              </Button>
            </div>

            {location && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-muted p-3 rounded">
                  <span className="text-muted-foreground">Latitude:</span>
                  <br />
                  {location.latitude.toFixed(6)}
                </div>
                <div className="bg-muted p-3 rounded">
                  <span className="text-muted-foreground">Longitude:</span>
                  <br />
                  {location.longitude.toFixed(6)}
                </div>
              </div>
            )}

            {aiSuggestion && (
              <div className="mt-4 bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Driving Assistant:</span>
                </div>
                <p className="text-sm text-muted-foreground">{aiSuggestion}</p>
              </div>
            )}

            {recentTracks && recentTracks.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Recent Tracks</h3>
                <div className="space-y-2">
                  {recentTracks.map((track) => (
                    <div key={track.id} className="bg-muted p-3 rounded text-sm">
                      <div>Lat: {track.latitude.toFixed(6)}, Long: {track.longitude.toFixed(6)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(track.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Tracking;
