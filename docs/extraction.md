# Extraction rules

The map stack is the Phase 3A scene model in src/map/. Tests do not fetch tiles. The Overpass loader in src/neighborhood/overpass.js is not a crawl. It posts to https://overpass-api.de/api/interpreter only when the caller passes fetchImpl. A user-supplied URL is refused. The query asks for hospital, school, marketplace, and pharmacy nodes inside 2000 m. It does not ask for roads or transit. Transit is not an allowed layer id.

- Reimplement patterns. Do not copy gods-eye-view.
- A MIT copyright notice is required only if a GEV source file is copied verbatim. None is copied here.
- Overpass data is runtime ODbL. Do not bundle an extract.
- Required attribution string: © OpenStreetMap contributors
- The browser never holds a provider key.
- No user-supplied URL may be fetched.
- Allowed layer ids: property, roads, hospitals, schools, markets, pharmacies.
- Banned: flights, military, vessels, satellites, cctv, alpr, radio, cables, firms, earthquakes.
- Lodgist is not modified by this repository change.
