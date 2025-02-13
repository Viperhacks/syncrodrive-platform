
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Compass, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { Geolocation } from '@capacitor/geolocation';

const Tracking = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const navigate = useNavigate();

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
          
          // Generate local insight based on location
          const insight = generateLocalInsight(newLocation.latitude, newLocation.longitude);
          setAiSuggestion(insight);
        }
      });

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
    await Geolocation.clearWatch({ id: '' });
    setIsTracking(false);
    setAiSuggestion("");
    toast({
      title: "Tracking Stopped",
      description: "Location tracking has been stopped"
    });
  };

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
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Tracking;
