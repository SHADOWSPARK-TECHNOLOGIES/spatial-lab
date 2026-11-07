---
name: spatial-postgis-query-builder
description: >
  Write and optimize spatial SQL for PostGIS, SpatiaLite, or DuckDB Spatial.
  Use when filtering, joining, or aggregating geographic data in a spatial
  database. Enforces SRID specification, ST_DWithin over ST_Distance filters,
  GiST index verification via EXPLAIN, and seeded test-database proof.
license: MIT
---
# Spatial PostGIS Query Builder

## Boundaries (default-deny)
- Never run a spatial join or radius filter without verifying a spatial index
  (GiST) exists on the geometry column.
- Always use `ST_DWithin(geom, geom, distance)` for radius filtering — it uses
  the index. Never `ST_Distance(...) < distance` in a WHERE clause (full scan).
- Always specify SRIDs. Default to 4326 (WGS84). Use a projected CRS (local
  UTM zone) only when the user needs planar precision and states it.
- Cast to `::geography` when distances are in meters and data is in 4326.

## Execution
1. Inspect the schema (`\d+ table`): geometry type and SRID. If missing or
   mismatched, stop and fix the column before querying.
2. Radius search pattern:
   ```sql
   SELECT id, name,
          ST_Distance(geom::geography,
                      ST_SetSRID(ST_MakePoint(LNG, LAT), 4326)::geography) AS distance_m
   FROM pois
   WHERE ST_DWithin(geom::geography,
                    ST_SetSRID(ST_MakePoint(LNG, LAT), 4326)::geography, 2000)
   ORDER BY distance_m ASC;
   ```
   Note `ST_MakePoint` order is longitude, latitude.
3. Run `EXPLAIN ANALYZE`. If you see a Seq Scan on the spatial table, halt and
   add `CREATE INDEX idx_<table>_geom ON <table> USING GIST (geom);` (and
   `ANALYZE <table>;`), then re-explain.
4. For joins on geography, prefer `ST_DWithin` in the join condition.

## Verification ledger
- Claim: "query returns correct POIs within N meters."
- Proof: execute against a seeded test database (Testcontainers / ephemeral
  Postgres); assert returned IDs match a precomputed expected set, including a
  point just inside and just outside the radius boundary.
- If index use cannot be shown in EXPLAIN, the query is not done.
