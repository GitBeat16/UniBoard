import { Card } from "@/components/ui/card";
import { Illustration } from "@/components/ui/illustration";
import { PlacesList } from "@/components/money/places-list";
import { fetchPlaces, PlacesError, type LatLng, type Place } from "@/lib/places/overpass";

/** Server component: fetches (cached a day per ~110 m) and hands off to the list. */
export async function NearbyPlaces({ origin }: { origin: LatLng }) {
  let places: Place[];
  try {
    places = await fetchPlaces(origin);
  } catch (e) {
    return (
      <Card className="p-6 text-center">
        <Illustration name="places" tone="leaf" className="mx-auto w-40" />
        <p className="mt-1 text-body font-semibold">Food nearby is unavailable</p>
        <p className="mt-1 text-label text-muted">
          {e instanceof PlacesError ? e.message : "Something went wrong reading the map."}
        </p>
      </Card>
    );
  }

  if (places.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Illustration name="places" tone="leaf" className="mx-auto w-40" />
        <p className="mt-1 text-body font-semibold">Nothing mapped within a short walk</p>
        <p className="mt-1 text-label text-muted">
          OpenStreetMap has no named food places near this pin yet. Check the pin is on
          campus.
        </p>
      </Card>
    );
  }

  return <PlacesList places={places} />;
}

export function PlacesSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Finding food nearby">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-tile bg-paper/70 motion-reduce:animate-none" />
      ))}
    </div>
  );
}
