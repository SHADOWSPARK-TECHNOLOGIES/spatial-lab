# Spatial Lab — Agent Context Contract

Before making any spatial query, reading OSM/Overpass data, writing geometry
math, writing spatial SQL, or rendering a map, you MUST invoke the
corresponding spatial skill under `.agents/skills/` and follow its
default-deny boundaries and verification ledger. Do not guess spatial logic.

- OSM / Overpass ingestion → `spatial-osm-ingestion`
- Spatial SQL (PostGIS/SpatiaLite/DuckDB) → `spatial-postgis-query-builder`
- Hand-written geometry math (haversine, bbox, point-in-polygon) → `spatial-geometry-math`
- Frontend map rendering / viewport fetching → `spatial-map-ui-integration`
- Product boundary, data-source gate, and trust rules → `shadowspark-spatial-intelligence`

Always: fixed Overpass host only (no user-supplied URLs), provider keys stay
server-side on lodgist-api, area context is not a safety rating, and output
must match `docs/V0_CONTRACT.md` exactly.
