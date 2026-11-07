---
name: spatial-geometry-math
description: >
  Raw geospatial calculations without a spatial database: haversine distance,
  bounding boxes, point-in-polygon, clustering, coordinate validation, and
  antimeridian-safe math. Use when geometry logic is written by hand. Enforces
  constant Earth radius, input validation, and library-first for non-trivial
  predicates.
license: MIT
---
# Spatial Geometry Math

## Boundaries (default-deny)
- Always validate coordinates first: latitude ∈ [-90, 90], longitude ∈ [-180, 180].
  Throw / 400 on invalid input; never silently clamp.
- Always use a constant Earth radius (6,371,000 m for haversine).
- For point-in-polygon, buffering, clustering, or any non-trivial predicate,
  use a battle-tested library (Turf.js / JTS / GeoTools) if one is already a
  project dependency. Hand-roll only when the project has zero geo dependencies
  (as spatial-lab does today), and only for haversine / bbox — never ray-cast
  point-in-polygon without a full boundary test suite.
- Bounding-box math must handle the antimeridian (lng wrap at ±180).

## Execution
1. Haversine (meters), correct equivalent forms:
   ```js
   const R = 6_371_000;
   const toRad = (d) => (d * Math.PI) / 180;
   const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
   const a = Math.sin(dLat/2)**2 +
             Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
   return Math.round(2 * R * Math.asin(Math.sqrt(a)));
   ```
2. For fast approximate filters, use a bbox pre-filter (degrees, with
   antimeridian handling) before the exact haversine.
3. Round `distance_m` to an integer; sub-meter precision is noise.

## Verification ledger
- Haversine: (0,0)→(0,1) ≈ 111,320 m; identical points = 0; a known near-pin
  offset (e.g. 0.001° lon near lat 5.5°) within a tight tolerance band.
- Coordinate validation: lat 91 / lon 181 throw.
- Antimeridian: a bbox crossing ±180 does not produce a negative width.
- If a hand-rolled point-in-polygon is ever added, it must test on-edge,
  in-hole, and multipolygon cases before shipping.
