# ShadowSpark spatial data-source registry

GEV code is MIT and may be adapted if the copyright and license notice stay with that code.
Third-party data in or beside that repo is not MIT. CC BY-NC, CC BY-NC-SA, and provider terms stay out of a commercial Lodgist build until this registry marks them cleared.
ODbL is not non-commercial. It allows commercial use with the attribution "© OpenStreetMap contributors". Share-alike applies only to a derivative database we publish, not to maps or apps built on it.

Nothing below is cleared for production Lodgist. This file is the gate, not a permission.

| id | publisher | access | license | commercial use | attribution | coverage | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| lab-sample-geometry | ShadowSpark spatial-lab | in-app sample | internal sample, not a third-party dataset | lab demo only | none | one example pin near Owerri | planned |
| gev-bundled-datasets | upstream GEV and its data notices | do not copy | CC BY-NC, CC BY-NC-SA, ODbL, or provider-specific | not assumed | unknown until reviewed | various | blocked |
| osm-overpass-extract | OpenStreetMap contributors | one-off extract | ODbL | yes, share-alike on published derivative databases | required: © OpenStreetMap contributors | Owerri | under review |
| map-tiles | unnamed | server proxy only, after a contract | provider terms | review first | required if the provider says so | unknown | production row stays not connected |
| openfreemap-liberty | OpenFreeMap / OpenStreetMap | public MapLibre style, no key | OSM ODbL; OpenMapTiles code BSD, design CC BY 4.0 | yes, with attribution | OpenFreeMap © OpenMapTiles Data from OpenStreetMap | global | lab basemap, not production Lodgist |
| osm-raster-tiles | OpenStreetMap Foundation | lab proxy, fixed host `tile.openstreetmap.org` | ODbL plus the OSMF public tile usage policy | not for heavy traffic on the public tile server | © OpenStreetMap contributors | global | lab fallback |
| aws-terrain-tiles | Mapzen / AWS Open Data | public S3, no key, lab proxy | mixed open elevation sources, static archive | not cleared | Terrain Tiles © Mapzen, AWS Open Data | global | lab terrain and 3D mesh |
| google-photorealistic-3d | Google | server key `GOOGLE_MAP_TILES_KEY`, unset here | Google Maps Platform terms | review first | as required by Google | partial | optional; needs key + ENABLE_GOOGLE_PHOTOREALISTIC_3D=true; commercialUse UNKNOWN, so off in production |
| geocoder | unnamed | server-side key on lodgist-api | provider terms | review first | as required | unknown | not connected |
| weather | unnamed | server-side key | provider terms | review first | as required | unknown | v1, not connected |
| traffic | unnamed | licensed feed only | provider terms | review first | as required | unknown | v1, not connected |
| imagery-cameras | none | not adopted | n/a | no | n/a | n/a | rejected for Lodgist |

Browser rule: the client never receives a secret provider key.
Fetch rule: user-supplied URLs are not server-side fetches.
