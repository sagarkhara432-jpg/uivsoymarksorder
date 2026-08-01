import { useEffect, useRef, useState } from "react";

type Props = {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number;
  /** When provided, tapping the map or dragging the pin reports a new position. */
  onChange?: (lat: number, lng: number) => void;
  /** Hide the marker (e.g. no pin dropped yet). */
  showMarker?: boolean;
  popup?: string;
};

/**
 * Plain Leaflet map. We deliberately avoid react-leaflet: its core package
 * evaluates Leaflet at module scope, which lands in a shared bundle chunk and
 * crashes SSR with "window is not defined". Leaflet itself is imported lazily
 * inside an effect, so it only ever runs in the browser.
 */
export default function LeafletMap({
  lat,
  lng,
  zoom = 15,
  height = 220,
  onChange,
  showMarker = true,
  popup,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const changeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  changeRef.current = onChange;

  useEffect(() => {
    let alive = true;
    let map: any;
    (async () => {
      const mod = await import("leaflet");
      const L: any = (mod as any).default ?? mod;
      if (!alive || !containerRef.current || mapRef.current) return;

      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map(containerRef.current).setView([lat, lng], zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      if (showMarker) {
        const marker = L.marker([lat, lng], { draggable: Boolean(changeRef.current) }).addTo(map);
        if (popup) marker.bindPopup(popup);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          changeRef.current?.(p.lat, p.lng);
        });
        markerRef.current = marker;
      }

      map.on("click", (e: any) => changeRef.current?.(e.latlng.lat, e.latlng.lng));

      mapRef.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 60);
    })();

    return () => {
      alive = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep view + marker in sync with incoming coordinates.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
  }, [lat, lng, ready]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60" style={{ height }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
    </div>
  );
}
