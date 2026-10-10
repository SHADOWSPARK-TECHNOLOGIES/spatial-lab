import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCameraControl,
  createCamera,
  fitBounds,
  GLOBE_RESET,
  MAP_RESET,
  northUp,
  resetGlobe,
  resetMap,
  setBearing,
  setPitch,
  setTilt,
  toMapLibreCamera,
} from "./camera.js";

test("camera state keeps pitch and tilt as one clamped angle", () => {
  const tilted = setTilt(resetMap(), 40);
  assert.equal(tilted.pitch, 40);
  assert.equal(tilted.tilt, 40);
  const pitched = setPitch(tilted, 10);
  assert.equal(pitched.pitch, 10);
  assert.equal(pitched.tilt, 10);
  assert.equal(setPitch(pitched, 120).pitch, 85);
  assert.equal(setTilt(pitched, -4).tilt, 0);
  assert.throws(() => createCamera({ pitch: Number.NaN }), /pitch out of range/);
});

test("bearing wraps and north-up clears it", () => {
  const camera = setBearing(resetMap(), 370);
  assert.equal(camera.bearing, 10);
  assert.equal(setBearing(camera, -20).bearing, 340);
  const north = northUp(setPitch(setBearing(camera, 90), 25));
  assert.equal(north.bearing, 0);
  assert.equal(north.pitch, 25);
  assert.notEqual(north, camera);
});

test("reset map and reset globe are explicit states", () => {
  const map = resetMap();
  assert.deepEqual(map, {
    projection: "mercator",
    center: { latitude: 5.48, longitude: 7.03 },
    zoom: 12,
    pitch: 0,
    tilt: 0,
    bearing: 0,
  });
  assert.notDeepEqual(map.center, { latitude: 5.485, longitude: 7.035 });
  const globe = applyCameraControl(map, { type: "reset-globe" });
  assert.equal(globe.projection, "globe");
  assert.equal(globe.zoom, GLOBE_RESET.zoom);
  assert.deepEqual(globe.center, GLOBE_RESET.center);
  assert.equal(applyCameraControl(globe, { type: "reset-map" }).projection, "mercator");
  assert.equal(MAP_RESET.zoom, 12);
});

test("fit bounds frames the box north-up", () => {
  const wide = fitBounds({ west: 0, south: 0, east: 20, north: 10 }, { width: 512, height: 512, padding: 0 });
  const tight = fitBounds({ west: 0, south: 0, east: 2, north: 1 }, { width: 512, height: 512, padding: 0 });
  assert.equal(wide.bearing, 0);
  assert.equal(wide.pitch, 0);
  assert.equal(wide.tilt, 0);
  assert.equal(wide.projection, "mercator");
  assert.equal(wide.center.longitude, 10);
  assert.equal(wide.center.latitude, 5);
  assert.ok(tight.zoom > wide.zoom);
  const crossed = fitBounds({ west: 170, south: -5, east: -170, north: 5 }, { width: 800, height: 600, padding: 0 });
  assert.ok(Math.abs(Math.abs(crossed.center.longitude) - 180) < 1e-9);
  assert.throws(() => fitBounds({ west: 0, south: 2, east: 1, north: 1 }), /bounds out of range/);
});

test("maplibre camera uses longitude then latitude", () => {
  const camera = toMapLibreCamera(resetMap());
  assert.deepEqual(camera.center, [7.03, 5.48]);
  assert.equal(camera.pitch, 0);
  assert.throws(() => Object.assign(resetMap(), { zoom: 1 }));
});
