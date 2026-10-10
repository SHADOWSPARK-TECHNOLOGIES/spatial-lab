import assert from "node:assert/strict";
import test from "node:test";
import { selectProvider } from "./fallback.js";
import { buildScene, switchMapSource } from "./scene.js";
import { createDefaultRegistry } from "./providers.js";
import * as client from "./index.js";

test("client entry publishes the scene API and not the server proxy", () => {
  assert.equal(typeof client.buildScene, "function");
  assert.equal(typeof client.serializeShareState, "function");
  assert.equal(typeof client.selectProvider, "function");
  assert.equal("resolveTile" in client, false);
  assert.equal("buildServerScene" in client, false);
  assert.equal("readServerKey" in client, false);
});

test("selectProvider falls through an unavailable preferred provider", () => {
  const providers = [
    { id: "primary", available: () => false },
    { id: "backup", available: () => true },
  ];
  assert.equal(selectProvider(providers).id, "backup");
  assert.equal(selectProvider(providers, "primary").id, "backup");
  assert.equal(selectProvider(providers, "backup").id, "backup");
  assert.equal(selectProvider(providers, "missing").id, "backup");
  assert.throws(() => selectProvider([{ id: "down", available: () => false }]), /no provider available/);
  assert.throws(() => selectProvider([]), /no provider available/);
});

test("default terrain chain falls back from the EU mirror to the US bucket", () => {
  const registry = createDefaultRegistry();
  const terrain = selectProvider(registry.terrain, "aws-terrarium-eu");
  assert.equal(terrain.id, "aws-terrarium");
  assert.equal(terrain.available(), true);
  assert.equal(registry.terrain[0].id, "aws-terrarium-eu");
  assert.equal(registry.terrain[0].available(), false);
});

test("photorealistic mode falls back to the terrain mesh without a server flag", () => {
  const scene = buildScene({ mode: "photorealistic" });
  assert.equal(scene.requestedMode, "photorealistic");
  assert.equal(scene.mode, "3d-terrain");
  assert.equal(scene.fallback, true);
  assert.equal(scene.threeD && scene.threeD.id, "maplibre-terrain-mesh");
  assert.equal(scene.mesh, true);
  assert.equal(scene.style.photorealistic, null);
});

test("map source switching changes basemap, terrain, and 3d mode", () => {
  const flat = buildScene({ mode: "2d" });
  assert.equal(flat.basemap.id, "openfreemap-liberty");
  assert.equal(flat.basemap.type, "style-url");
  assert.equal(flat.terrain, null);
  assert.equal(flat.style.basemap.kind, "remote-style");
  const raster = switchMapSource(flat, { basemapId: "osm-raster" });
  assert.equal(raster.basemap.id, "osm-raster");
  assert.equal(raster.basemap.type, "raster");
  assert.deepEqual(raster.basemap.tiles, ["/map/tiles/osm-raster/{z}/{x}/{y}.png"]);
  const shaded = switchMapSource(raster, { mode: "terrain" });
  assert.equal(shaded.hillshade, true);
  assert.equal(shaded.mesh, false);
  assert.equal(shaded.terrain && shaded.terrain.id, "aws-terrarium");
  assert.equal(shaded.style.style.terrain, undefined);
  const mesh = switchMapSource(shaded, { mode: "3d-terrain", terrainId: "aws-terrarium-eu" });
  assert.equal(mesh.mesh, true);
  assert.equal(mesh.terrain && mesh.terrain.id, "aws-terrarium");
  assert.deepEqual(mesh.style.style.terrain, { source: "terrain", exaggeration: 1 });
  const style = /** @type {{ sources: { terrain: { tiles: string[] } } }} */ (mesh.style.style);
  assert.deepEqual(style.sources.terrain.tiles, ["/map/tiles/aws-terrarium/{z}/{x}/{y}.png"]);
});

test("an unscoped public client token is rejected", () => {
  const registry = {
    basemaps: [
      {
        id: "scoped-off",
        role: /** @type {const} */ ("basemap"),
        label: "Scoped off",
        attribution: "none",
        keyExposure: /** @type {const} */ ("public-client-token"),
        fixedHosts: [],
        available: () => true,
        clientView: () => ({
          id: "scoped-off",
          role: /** @type {const} */ ("basemap"),
          label: "Scoped off",
          attribution: "none",
          keyExposure: /** @type {const} */ ("public-client-token"),
          scoped: false,
        }),
      },
    ],
    terrain: [],
    threeD: [],
  };
  assert.throws(() => buildScene({ mode: "2d", registry }), /public client token must be scoped/);
});
