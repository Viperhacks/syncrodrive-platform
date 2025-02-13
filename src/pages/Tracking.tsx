
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
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          
          // Get AI suggestion based on location
          fetchAISuggestion(position.coords.latitude, position.coords.longitude);
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
    toast({
      title: "Tracking Stopped",
      description: "Location tracking has been stopped"
    });
  };

  const fetchAISuggestion = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch('/api/location-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Given the current location at latitude ${latitude} and longitude ${longitude}, what should the driver be aware of? Keep it short and focused on safety.`
        })
      });

      const data = await response.json();
      setAiSuggestion(data.generatedText);
    } catch (error) {
      console.error('Error fetching AI suggestion:', error);
    }
  };

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Live Tracking</h1>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
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
                  <span className="font-medium">AI Assistant:</span>
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
