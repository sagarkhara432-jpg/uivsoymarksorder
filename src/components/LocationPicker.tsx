import { useEffect, useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
};

/**
 * OpenStreetMap picker with a draggable pin plus a GPS "use current location"
 * button. Leaflet is imported lazily so it never runs during SSR.
 */
export default function LocationPicker({ lat, lng, onChange, height = 240 }: Props) {
  const [mods, setMods] = useState<any>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rl, L] = await Promise.all([import("react-leaflet"), import("leaflet")]);
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      if (alive) setMods(rl);
    })();
    return () => {
      alive = false;
    };
  }, []);

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

  const center: [number, number] = [lat ?? 18.5204, lng ?? 73.8567];

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
      <div className="overflow-hidden rounded-2xl border border-border/60">
        {!mods ? (
          <div className="grid place-items-center bg-muted text-sm text-muted-foreground" style={{ height }}>
            Loading map…
          </div>
        ) : (
          <MapInner mods={mods} center={center} hasPin={lat != null && lng != null} onChange={onChange} height={height} />
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {lat != null && lng != null
          ? `📍 Pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)} — drag the pin to fine-tune.`
          : "Tap the map or use GPS to drop your exact drop-off pin."}
      </p>
    </div>
  );
}

function MapInner({
  mods,
  center,
  hasPin,
  onChange,
  height,
}: {
  mods: any;
  center: [number, number];
  hasPin: boolean;
  onChange: (lat: number, lng: number) => void;
  height: number;
}) {
  const { MapContainer, TileLayer, Marker, useMapEvents, useMap } = mods;

  function ClickCatcher() {
    useMapEvents({
      click(e: any) {
        onChange(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  function Recenter() {
    const map = useMap();
    useEffect(() => {
      map.setView(center, map.getZoom() < 14 ? 16 : map.getZoom());
    }, [center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  }

  return (
    <MapContainer center={center} zoom={16} style={{ height, width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <ClickCatcher />
      <Recenter />
      {hasPin && (
        <Marker
          position={center}
          draggable
          eventHandlers={{
            dragend: (e: any) => {
              const { lat, lng } = e.target.getLatLng();
              onChange(lat, lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
