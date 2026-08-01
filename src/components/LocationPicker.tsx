import { useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";
import LeafletMap from "./LeafletMap";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
};

/**
 * OpenStreetMap picker with a draggable pin plus a GPS "use current location"
 * button. Leaflet is loaded lazily in the browser only (see LeafletMap).
 */
export default function LocationPicker({ lat, lng, onChange, height = 240 }: Props) {
  const [locating, setLocating] = useState(false);

  function locate() {
    if (!navigator.geolocation) return toast.error("Location is not supported on this device");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        onChange(p.coords.latitude, p.coords.longitude);
        toast.success("Location pinned");
      },
      () => {
        setLocating(false);
        toast.error("Please allow location access");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const centerLat = lat ?? 18.5204;
  const centerLng = lng ?? 73.8567;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={locate}
        className="press inline-flex items-center gap-2 rounded-full bg-fresh px-4 py-2 text-xs font-bold text-fresh-foreground active:opacity-90"
      >
        {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
        Use current location
      </button>
      <LeafletMap
        lat={centerLat}
        lng={centerLng}
        zoom={16}
        height={height}
        onChange={onChange}
        showMarker={lat != null && lng != null}
      />
      <p className="text-[11px] text-muted-foreground">
        {lat != null && lng != null
          ? `📍 Pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)} — drag the pin to fine-tune.`
          : "Tap the map or use GPS to drop your exact drop-off pin."}
      </p>
    </div>
  );
}
