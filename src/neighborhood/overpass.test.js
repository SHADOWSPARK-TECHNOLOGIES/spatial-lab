import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_PIN } from "./catalog.js";
import { ATTRIBUTION, MAX_RADIUS_M, OVERPASS_URL, buildOverpassQuery, loadAmenities } from "./overpass.js";

function fakeResponse(status, body) {
  return { ok: status >= 200 && status < 300, text: async () => body };
}

test("query is bounded to four amenity types", () => {
  const query = buildOverpassQuery(SAMPLE_PIN, 1500);
  assert.match(query, /amenity"="hospital"/);
  assert.match(query, /amenity"="school"/);
  assert.match(query, /amenity"="marketplace"/);
  assert.match(query, /amenity"="pharmacy"/);
  assert.equal(query.includes("surveillance"), false);
  assert.throws(() => buildOverpassQuery(SAMPLE_PIN, MAX_RADIUS_M + 1), /radius out of range/);
});

test("load uses only the fixed host and a fake payload", async () => {
  let called;
  const view = await loadAmenities(SAMPLE_PIN, {
    radiusM: 800,
    fetchImpl: async (url) => {
      called = url;
      return fakeResponse(200, JSON.stringify({ elements: [{ id: 9, lat: 5.49, lon: 7.04, tags: { amenity: "hospital", name: "Example Clinic" } }, { id: 10, lat: 5.5, lon: 7.05, tags: { amenity: "surveillance" } }] }));
    },
  });
  assert.equal(called, OVERPASS_URL);
  assert.equal(view.ok, true);
  assert.equal(view.attribution, ATTRIBUTION);
  assert.equal(view.amenities.length, 1);
  assert.equal(view.amenities[0].layer, "hospitals");
});

test("a supplied url is refused and errors invent nothing", async () => {
  await assert.rejects(() => loadAmenities(SAMPLE_PIN, { radiusM: 800, url: "https://evil.example", fetchImpl: async () => fakeResponse(200, "{}") }), /user-supplied URL/);
  const view = await loadAmenities(SAMPLE_PIN, { radiusM: 800, fetchImpl: async () => fakeResponse(503, "") });
  assert.equal(view.ok, false);
  assert.deepEqual(view.amenities, []);
  assert.equal(view.attribution, ATTRIBUTION);
});
