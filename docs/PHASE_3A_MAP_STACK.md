# Phase 3A map stack

Audit of the map stack as it stood on `main` before this change, and the Phase 3A scene model added beside it. Phase 2 stays the neighborhood catalog and the fixed-host Overpass loader. Lodgist is not in this repository and is not modified.

## Audit (Phase 2 base)

### Libraries

`package.json` had no dependencies. Nothing in the tree imported MapLibre, Mapbox GL, Leaflet, Cesium, deck.gl, or a Google Maps SDK. There was no stylesheet, no map component, and no tile client.

### Providers

No map, terrain, or 3D provider was wired.

`docs/DATA_SOURCES.md` already reserved two unnamed rows:

- `map-tiles`: server proxy only, after a contract. Status was `not connected`.
- `geocoder`: server-side key on lodgist-api. Status was `not connected`.

The only live geospatial call is the Overpass amenity loader (`src/neighborhood/overpass.js`). Its host is fixed to `https://overpass-api.de/api/interpreter`. A caller-supplied URL throws and is not fetched.

### Where keys are read

No map provider key is read. The process environment is not consulted. `.gitignore` ignores `.env*` except `.env.example`, and there is no `.env.example`. The browser is not given a provider key because there is no browser bundle.

### Camera and state

There was no camera, viewport, pitch, bearing, tilt, bounds, globe, or share-state type. The only coordinates in code are the lab sample pin (`listingId: "example-12"`, latitude `5.485`, longitude `7.035`) and Overpass node coordinates.

### Routing

There is no routing code: no router, no directions call, no polyline, no turn-by-turn, no flythrough. The v0 contract names `roads` and `transit`. The loader does not query them. `transit` is not an allowed layer id. `roads` is an allowed layer id and is still unwired.

### What Phase 2 already provides

- `src/neighborhood/catalog.js`: allowed layer ids (`property`, `roads`, `hospitals`, `schools`, `markets`, `pharmacies`), banned surveillance and transport ids, pin checks, and `neighborhoodCatalog` for `ready`, `empty`, `error`, and `stale`.
- `src/neighborhood/overpass.js`: radius cap 2000 m, amenity types hospital, school, marketplace, and pharmacy, attribution `© OpenStreetMap contributors`, and a `fetchImpl` seam so tests do not hit the network.
- `docs/V0_CONTRACT.md` and `docs/DATA_SOURCES.md`: response shape, evidence kinds, and the source gate. Nothing is cleared for production Lodgist.

God's Eye View is not vendored. Patterns are reimplemented. No GEV source file is copied.

## Phase 3A design

The new code lives in `src/map/`. It does not change catalog or Overpass behavior.

### Provider roles

Three roles, selected by `selectProvider` rather than a hard-coded vendor:

| Role | Interface | Wired providers | Fallback |
| --- | --- | --- | --- |
| Basemap | `MapProvider` | `openfreemap-liberty` (primary), `osm-raster` | If the preferred basemap's `available()` is false, the next available basemap is used. |
| Terrain | `TerrainProvider` | `aws-terrarium-eu` (registered, unavailable), `aws-terrarium` | Preferring the EU mirror falls through to the US bucket. |
| 3D | `ThreeDProvider` | `maplibre-terrain-mesh` (3D terrain), `google-photorealistic-3d` (optional) | Photorealistic mode without a server key resolves to the terrain mesh and records `fallback: true`. |

`keyExposure` is `none`, `server`, or `public-client-token`. A public client token must set `scoped: true` and a `tokenScope`. No wired provider uses a public client token. No token value is part of a client view.

### Modes

`buildScene` accepts `2d`, `terrain`, `3d-terrain`, and `photorealistic`.

- `2d`: basemap only.
- `terrain`: basemap plus a Terrarium DEM hillshade.
- `3d-terrain`: basemap plus the same DEM as a mesh (`terrain.exaggeration` 1, pitch allowed).
- `photorealistic`: optional Google Photorealistic 3D Tiles, client path `/map/3d/photorealistic/root.json`. Unavailable unless the server built the registry with a non-empty key. The scene then falls back to `3d-terrain`.

`switchMapSource` rebuilds a scene from the previous safe request plus a patch (`mode`, `basemapId`, `terrainId`, `threeDId`).

`toMapLibreStyle` emits a MapLibre GL style document (version 8). OpenFreeMap stays a remote style URL because that public style contains its own tile URLs and no key. Raster and terrain tiles in client styles are same-origin proxy templates. The MapLibre library is the renderer contract. It is not bundled and it does not need a key.

### Camera

`CameraState` is an explicit frozen value: `projection` (`mercator` or `globe`), `center` (`latitude`, `longitude`), `zoom` (0–22), `pitch` and `tilt` (0–85, the same angle under both names), and `bearing` (0–360).

Controls: `setTilt`, `setPitch`, `setBearing`, `northUp`, `fitBounds`, `resetMap`, `resetGlobe`, and `applyCameraControl`. Updates return a new state.

`resetMap` uses a city-level Owerri view, latitude `5.48`, longitude `7.03`, zoom 12. That is not the Phase 2 sample pin. `resetGlobe` uses a globe projection, zoom 1.5, and a 0,0 center.

### Shareable map state

`serializeShareState` copies an allowlist only: `center`, `zoom`, `pitch`, `bearing`, `layers`, `entity`.

- Layers are filtered to Phase 2 allowed ids. Banned ids are dropped.
- `entity` keeps `publicId` for a public entity. Coordinates and internal ids on the entity are dropped. A private or hidden entity becomes `null`.
- Tokens, keys, sessions, cookies, listing ids, and internal ids are not copied.
- If `center` is the exact coordinate of a private listing found on the input, the serializer coarsens it (0.01°, or 0.1° when that is still exact) so the private listing coordinate is not in the output.
- The serializer throws if a forbidden string of length 6 or more still appears in the JSON.

Projection, tilt, provider keys, and the sample pin are not share fields.

### Key-exposure posture

- Client modules (`src/map/index.js` and the files it imports) do not read `process.env` and do not import `src/map/server.js` or `src/map/tile-proxy.js`.
- `buildServerScene` may receive `serverEnv`. It uses `GOOGLE_MAP_TILES_KEY` only as a boolean ("is photorealistic configured?") and throws if that value appears in the scene JSON.
- `resolvePhotorealisticRoot` builds the Google host URL on the server. The client receives `clientPath` only. A caller-supplied URL throws and is not fetched.
- Raster and terrain upstream URLs are fixed hosts inside `resolveTile`. The client style points at `/map/tiles/{providerId}/{z}/{x}/{y}.png`.
- No new secret is committed. No hosting environment variable is set. The optional key name is documented here and is unset.

### Sources wired in this lab

Details and the production gate stay in `docs/DATA_SOURCES.md`.

| id | Role | Key | Notes |
| --- | --- | --- | --- |
| `openfreemap-liberty` | 2D vector basemap | none | Public MapLibre style `https://tiles.openfreemap.org/styles/liberty`. Attribution: OpenFreeMap © OpenMapTiles Data from OpenStreetMap. |
| `osm-raster` | 2D raster fallback | none | Fixed host `tile.openstreetmap.org`, served through the lab proxy with a lab User-Agent. Public OSMF tile server is a lab fallback, not a production CDN. Attribution: © OpenStreetMap contributors. |
| `aws-terrarium` | Terrain DEM and 3D terrain mesh | none | Terrarium PNG on the AWS Open Data bucket `elevation-tiles-prod`. Static archive. Attribution: Terrain Tiles © Mapzen, AWS Open Data. |
| `aws-terrarium-eu` | Terrain fallback candidate | none | Registered so the chain is real. `available()` is false because the EU mirror is not reachable. |
| `maplibre-terrain-mesh` | 3D terrain | none | Uses the selected terrain provider. No extra host. |
| `google-photorealistic-3d` | Optional photorealistic 3D | server | Fixed host `tile.googleapis.com`. Requires `GOOGLE_MAP_TILES_KEY` and `ENABLE_GOOGLE_PHOTOREALISTIC_3D=true`; with `NODE_ENV=production` also `commercialUse: APPROVED_COMMERCIAL` (currently UNKNOWN, so off). Attribution: Google Maps plus per-tile copyright. Not cleared for production Lodgist. |

Tests do not call those hosts. Tile fetches go through `fetchImpl`, matching the Overpass loader.

## Follow-ups (3B and later)

These are named so they are not started here:

- 3B agent navigation
- 3C property precision `EXACT` / `APPROXIMATE` / `HIDDEN` beyond the share-state redaction above
- Phase 3D routing and flythrough
- 3E annotations
- 3F street level
- 3G traffic and transit (roads stay unwired)
- 3H weather
- 3I infrastructure
- 3J visual grounding
- 3K entity inspection
- 3L richer shareable scene state (this phase only shares the allowlisted map view)
- 3M scene director
- 3N voice
- 3O MCP
- 3P was the end of the planned range and has no separate capability in this task

Mounting MapLibre in a viewer, rewriting the OpenFreeMap style onto the proxy, and a production tile contract are also later work.
