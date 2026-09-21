import { describe, expect, it } from "vitest";
import {
  haversineM,
  overpassQuery,
  parsePlaces,
  roundOrigin,
  walkMinutes,
} from "./overpass";

// PICT's main gate, roughly.
const campus = { lat: 18.4575, lng: 73.8508 };

describe("haversineM", () => {
  it("is zero at the origin and ~111 m per 0.001° of latitude", () => {
    expect(haversineM(campus, campus)).toBe(0);
    expect(haversineM(campus, { ...campus, lat: campus.lat + 0.001 })).toBeCloseTo(111.2, 0);
  });
});

describe("walkMinutes", () => {
  it("applies a city detour at walking pace", () => {
    expect(walkMinutes(400)).toBe(7); // 400 × 1.3 / 80 = 6.5
  });
  it("never says zero minutes", () => {
    expect(walkMinutes(5)).toBe(1);
  });
});

describe("roundOrigin", () => {
  it("rounds to ~110 m so nearby pins share a cached query", () => {
    expect(roundOrigin({ lat: 18.45749, lng: 73.85081 })).toEqual({ lat: 18.457, lng: 73.851 });
  });
});

describe("overpassQuery", () => {
  it("asks only for named food places around the pin", () => {
    const q = overpassQuery(campus, 1000);
    expect(q).toContain("around:1000,18.4575,73.8508");
    expect(q).toContain('["name"]');
    expect(q).toContain("out center tags");
  });
});

describe("parsePlaces", () => {
  const json = {
    elements: [
      {
        type: "node",
        id: 1,
        lat: 18.4585,
        lon: 73.8508,
        tags: {
          amenity: "restaurant",
          name: "Far Canteen",
          cuisine: "indian;south_indian;chinese",
          "diet:vegetarian": "only",
          opening_hours: "Mo-Sa 08:00-22:00",
        },
      },
      { type: "node", id: 2, lat: 18.4577, lon: 73.8508, tags: { amenity: "cafe", name: "Near Café" } },
      // Same café mapped again as a building outline: dropped.
      { type: "way", id: 3, center: { lat: 18.4577, lon: 73.8508 }, tags: { amenity: "cafe", name: "near café" } },
      // No name: nobody can find it, dropped.
      { type: "node", id: 4, lat: 18.4576, lon: 73.8508, tags: { amenity: "fast_food" } },
      // Not food.
      { type: "node", id: 5, lat: 18.4576, lon: 73.8508, tags: { amenity: "bank", name: "Bank" } },
      { type: "way", id: 6, center: { lat: 18.459, lon: 73.851 }, tags: { shop: "bakery", name: "Bake House" } },
    ],
  };

  const places = parsePlaces(json, campus);

  it("keeps named food places only, once each", () => {
    expect(places.map((p) => p.name)).toEqual(["Near Café", "Far Canteen", "Bake House"]);
  });

  it("ranks by distance from the exact pin and gives walking minutes", () => {
    expect(places[0].distanceM).toBeLessThan(places[1].distanceM);
    expect(places[1].walkMin).toBe(walkMinutes(places[1].distanceM));
  });

  it("reads what the map knows and invents nothing", () => {
    const far = places[1];
    expect(far.cuisine).toBe("Indian, South indian");
    expect(far.veg).toBe("only");
    expect(far.hours).toBe("Mo-Sa 08:00-22:00");
    expect(places[0].cuisine).toBeNull();
    expect(places[0].veg).toBeNull();
  });

  it("takes coordinates from a way's centre", () => {
    expect(places[2]).toMatchObject({ id: "way/6", kind: "bakery", lat: 18.459 });
  });

  it("returns nothing for a malformed response", () => {
    expect(parsePlaces(null, campus)).toEqual([]);
    expect(parsePlaces({ remark: "timeout" }, campus)).toEqual([]);
  });
});
