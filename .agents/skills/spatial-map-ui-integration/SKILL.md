---
name: spatial-map-ui-integration
description: >
  Wire geographic data into a frontend map (MapLibre, Mapbox, Google Maps,
  Leaflet). Use when rendering POIs, polygons, or routes, or implementing
  viewport-based data fetching. Enforces marker clustering above 100 points,
  viewport-bounded fetching, debounce, and GeoJSON FeatureCollection shape.
license: MIT
---
# Spatial Map UI Integration

## Boundaries (default-deny)
- Always cluster markers above 100 points. Never render thousands of individual
  DOM markers.
- Always fetch by viewport (bounds) on camera idle/moveend; never load all
  global data at once.
- Always debounce viewport fetches by ≥ 300 ms.
- Secret provider keys (tiles, geocoder) never reach the browser; proxy via
  lodgist-api.

## Execution
1. Convert API responses to a GeoJSON `FeatureCollection`; put `name`,
   `category`, `distance_m`, `source_id`, `kind` on `Feature.properties`.
2. Clustered source (MapLibre/Mapbox):
   ```js
   map.addSource("pois", { type: "geojson", data: geojson,
                           cluster: true, clusterRadius: 50 });
   ```
   Add layers: `clusters` (circle + count label), `unclustered-point`.
3. Viewport sync: on `moveend` (debounced), read `map.getBounds()`, send
   `(sw_lat, sw_lng, ne_lat, ne_lng)` to the backend, replace source data.
4. Roads/transit layers are unwired in v0; do not render them until a source
   is cleared in `docs/DATA_SOURCES.md`.

## Verification ledger
- Claim: "map renders POIs and updates on pan without reload."
- Proof: Playwright/Cypress E2E — pan the map, intercept the network request,
  assert bounds parameters changed, assert markers updated in place.
- Assert no provider key appears in client bundle or network traffic.
