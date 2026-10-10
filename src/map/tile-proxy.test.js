import assert from "node:assert/strict";
import test from "node:test";
import { buildServerScene } from "./server.js";
import { fetchProxiedTile, resolvePhotorealisticRoot, resolveStyle, resolveTile } from "./tile-proxy.js";

const SERVER_KEY = "server-only-photorealistic-key";

test("raster and terrain tiles resolve to fixed hosts", async () => {
  const tile = resolveTile({ providerId: "osm-raster", z: 12, x: 2110, y: 2015 });
  assert.equal(tile.host, "tile.openstreetmap.org");
  assert.equal(tile.href, "https://tile.openstreetmap.org/12/2110/2015.png");
  assert.equal(tile.clientPath, "/map/tiles/osm-raster/12/2110/2015.png");
  assert.match(tile.headers["user-agent"], /spatial-lab/);
  let called = "";
  const fetched = await fetchProxiedTile(
    { providerId: "aws-terrarium", z: 8, x: 10, y: 12 },
    {
      fetchImpl: async (url) => {
        called = url;
        return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
      },
    },
  );
  assert.equal(called, "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/8/10/12.png");
  assert.equal(fetched.ok, true);
  assert.equal(fetched.attribution.includes("Mapzen"), true);
});

test("a supplied url is refused and the EU mirror stays unavailable", async () => {
  let called = false;
  await assert.rejects(
    () => fetchProxiedTile({ providerId: "osm-raster", z: 1, x: 0, y: 0, url: "https://evil.example/tile.png" }, { fetchImpl: async () => {
      called = true;
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
    } }),
    /user-supplied URL/,
  );
  assert.equal(called, false);
  assert.throws(() => resolveTile({ providerId: "osm-raster", z: 1, x: 0, y: 0 }, { url: "https://evil.example" }), /user-supplied URL/);
  assert.throws(() => resolveTile({ providerId: "aws-terrarium-eu", z: 1, x: 0, y: 0 }), /provider unavailable/);
  assert.throws(() => resolveTile({ providerId: "osm-raster", z: 20, x: 0, y: 0 }), /tile out of range/);
  const style = resolveStyle("openfreemap-liberty");
  assert.equal(style.href, "https://tiles.openfreemap.org/styles/liberty");
  assert.equal(style.href.includes("key="), false);
});

test("photorealistic root keeps the server key off the client path and scene", () => {
  const root = resolvePhotorealisticRoot({ serverEnv: { GOOGLE_MAP_TILES_KEY: SERVER_KEY } });
  assert.equal(root.host, "tile.googleapis.com");
  assert.equal(root.href.includes(SERVER_KEY), true);
  assert.equal(root.clientPath.includes(SERVER_KEY), false);
  assert.equal(root.clientPath, "/map/3d/photorealistic/root.json");
  assert.throws(() => resolvePhotorealisticRoot({ serverEnv: {} }), /photorealistic provider unavailable/);
  assert.throws(() => resolvePhotorealisticRoot({ url: "https://evil.example", serverEnv: { GOOGLE_MAP_TILES_KEY: SERVER_KEY } }), /user-supplied URL/);

  const scene = buildServerScene({ mode: "photorealistic", serverEnv: { GOOGLE_MAP_TILES_KEY: SERVER_KEY } });
  const text = JSON.stringify(scene);
  assert.equal(text.includes(SERVER_KEY), false);
  assert.equal(text.includes("GOOGLE_MAP_TILES_KEY"), false);
  assert.equal(scene.mode, "photorealistic");
  assert.equal(scene.fallback, false);
  assert.equal(scene.threeD && scene.threeD.rootPath, "/map/3d/photorealistic/root.json");
  assert.equal(scene.threeD && scene.threeD.keyExposure, "server");
});
