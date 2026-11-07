---
name: spatial-osm-ingestion
description: >
  Fetch, parse, and normalize OpenStreetMap POI/amenity data via the Overpass
  API safely. Use when the task touches OSM, Overpass, amenities, POIs, roads,
  or boundaries, or when writing/editing src/neighborhood/overpass.js. Enforces
  fixed host (anti-SSRF), nwr + out center, radius cap, response size cap,
  per-type result limits, and exact V0_CONTRACT output.
license: MIT
---
# Spatial OSM Ingestion

## Boundaries (default-deny)
- Never fetch a user-supplied Overpass URL. The host is fixed in code
  (`OVERPASS_URL`); an `OVERPASS_API_URL` env var is server config only, never
  user input. A `url` option must throw.
- Always cap the response body (500 KB) and set `[timeout:15]`.
- Always use `nwr` (node + way + relation) and `out center`. Never `node`
  only — hospitals, schools, and markets are often mapped as areas.
- Always enforce `MAX_RADIUS_M` (2000 m). Reject/throw above it.
- The loader must not invent amenities on error: return an empty list, never
  stale data. Do not fake a `stale` flag.

## Execution
1. Define the pin (lat/lng validated: lat ±90, lng ±180) and radius.
2. Build one subquery per amenity type with its own limit so one category
   (e.g. pharmacies) cannot crowd out another:
   ```overpass
   [out:json][timeout:15];
   nwr["amenity"="hospital"](around:RADIUS,LAT,LNG);
   out center 10;
   nwr["amenity"="school"](around:RADIUS,LAT,LNG);
   out center 10;
   nwr["amenity"="marketplace"](around:RADIUS,LAT,LNG);
   out center 10;
   nwr["amenity"="pharmacy"](around:RADIUS,LAT,LNG);
   out center 10;
   ```
3. Execute via injected `fetchImpl` (POST, `application/x-www-form-urlencoded`,
   body `data=<encoded query>`), with an abort `signal` if the caller passes one.
4. Normalize: coordinates are `element.center.lat/lon` for ways/relations,
   `element.lat/lon` for nodes. Drop any element with neither. Map
   `tags.amenity` → category via the fixed `AMENITY_LAYER` map; pass any other
   tag through. Attach `attribution: "© OpenStreetMap contributors"`.
5. Assemble to exactly `docs/V0_CONTRACT.md`: `{property:{lat,lng}, items:[...]}`
   with `name, category, lat, lng, distance_m, source_id:"osm-overpass-extract",
   kind:"source"`. Compute `distance_m` with haversine (see spatial-geometry-math).
   Sort items by `distance_m` ascending.

## Verification ledger
- Unit tests use a mocked `fetchImpl`; no network.
- Assert output keys are exactly `{property, items}` and each item is exactly
  `{name, category, lat, lng, distance_m, source_id, kind}`.
- Assert a way/relation element with only `center` coordinates is normalized.
- Assert a `url` option is refused and a 503 yields `items: []` with no
  `ok`/`stale` keys leaking into the contract shape.
- Assert query contains 4× `nwr["amenity"=` and 4× `out center 10;`, and no
  `node[` or `out body 20`.
