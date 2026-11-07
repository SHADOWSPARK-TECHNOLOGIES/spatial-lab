import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_PIN } from "./catalog.js";
import { SOURCE_ID, assembleNeighborhood, haversineMeters } from "./assemble.js";
import { buildOverpassQuery } from "./overpass.js";

function fakeResponse(status, body) {
  return { ok: status >= 200 && status < 300, text: async () => body };
}

function fakeFetch(elements) {
  return async () => fakeResponse(200, JSON.stringify({ elements }));
}

test("assemble emits exactly the v0 contract shape", async () => {
  const view = await assembleNeighborhood(SAMPLE_PIN, 800, {
    fetchImpl: fakeFetch([
      { id: 9, lat: 5.49, lon: 7.04, tags: { amenity: "hospital", name: "Example Clinic" } },
      { type: "way", id: 11, center: { lat: 5.486, lon: 7.036 }, tags: { amenity: "pharmacy", name: "Way Pharmacy" } },
    ]),
  });
  assert.deepEqual(Object.keys(view).sort(), ["items", "property"]);
  assert.deepEqual(Object.keys(view.property).sort(), ["lat", "lng"]);
  assert.equal(view.property.lat, SAMPLE_PIN.latitude);
  assert.equal(view.property.lng, SAMPLE_PIN.longitude);
  assert.equal(view.items.length, 2);
  for (const item of view.items) {
    assert.deepEqual(Object.keys(item).sort(), [
      "category",
      "distance_m",
      "kind",
      "lat",
      "lng",
      "name",
      "source_id",
    ]);
    assert.equal(item.source_id, SOURCE_ID);
    assert.equal(item.source_id, "osm-overpass-extract");
    assert.equal(item.kind, "source");
    assert.equal(typeof item.distance_m, "number");
    assert.ok(item.distance_m >= 0);
  }
  // Sorted by distance ascending.
  assert.ok(view.items[0].distance_m <= view.items[1].distance_m);
  // Way/relation center is used as coordinates.
  const pharmacy = view.items.find((i) => i.category === "pharmacies");
  assert.equal(pharmacy.lat, 5.486);
  assert.equal(pharmacy.lng, 7.036);
});

test("haversine distance is sane", () => {
  // ~0.001 deg lon near lat 5.5N is roughly 111 m.
  const d = haversineMeters(5.485, 7.035, 5.485, 7.036);
  assert.ok(d > 100 && d < 120, `expected ~111m, got ${d}`);
  assert.equal(haversineMeters(5.485, 7.035, 5.485, 7.035), 0);
});

test("loader failure yields empty items, no ok/stale keys", async () => {
  const view = await assembleNeighborhood(SAMPLE_PIN, 800, {
    fetchImpl: async () => fakeResponse(503, ""),
  });
  assert.deepEqual(Object.keys(view).sort(), ["items", "property"]);
  assert.deepEqual(view.items, []);
  assert.equal(view.ok, undefined);
  assert.equal(view.stale, undefined);
});

test("user-supplied url is still refused (anti-SSRF preserved)", async () => {
  await assert.rejects(
    () =>
      assembleNeighborhood(SAMPLE_PIN, 800, {
        url: "https://evil.example",
        fetchImpl: fakeFetch([]),
      }),
    /user-supplied URL/,
  );
});

test("query uses nwr + per-subquery out center 10", () => {
  const query = buildOverpassQuery(SAMPLE_PIN, 800);
  assert.equal((query.match(/nwr\["amenity"=/g) || []).length, 4);
  assert.equal((query.match(/out center 10;/g) || []).length, 4);
  assert.equal(query.includes("node["), false);
  assert.equal(query.includes("out body 20"), false);
  assert.equal(query.includes("surveillance"), false);
});
