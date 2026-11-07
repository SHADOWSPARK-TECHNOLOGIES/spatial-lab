import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_PIN } from "./catalog.js";
import { ATTRIBUTION, MAX_RADIUS_M, NOTICES, OVERPASS_URL, buildOverpassQuery, loadAmenities, straightLineMeters } from "./overpass.js";
import { readFileSync } from "node:fs";

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
  assert.deepEqual(view.items, []);
  assert.equal(view.notice, NOTICES.unavailable);
  assert.equal(view.reason, "http");
  assert.equal(view.experimental, true);
  assert.equal(view.label, NOTICES.experimental);
  assert.equal(view.attribution, ATTRIBUTION);
});

test("distance is straight-line metres and an empty payload stays empty", async () => {
  const same = straightLineMeters(SAMPLE_PIN.latitude, SAMPLE_PIN.longitude, SAMPLE_PIN.latitude, SAMPLE_PIN.longitude);
  assert.equal(Math.round(same), 0);
  const north = straightLineMeters(SAMPLE_PIN.latitude, SAMPLE_PIN.longitude, SAMPLE_PIN.latitude + 0.001, SAMPLE_PIN.longitude);
  assert.ok(north > 110 && north < 112, `expected about 111 m, got ${north}`);

  const view = await loadAmenities(SAMPLE_PIN, {
    radiusM: 800,
    fetchImpl: async () => fakeResponse(200, JSON.stringify({ elements: [{ id: 9, lat: SAMPLE_PIN.latitude + 0.001, lon: SAMPLE_PIN.longitude, tags: { amenity: "pharmacy", name: "Example Pharmacy" } }] })),
  });
  assert.equal(view.items.length, 1);
  assert.equal(view.items[0].distance_m, Math.round(north));
  assert.equal(view.items[0].distance_label, "straight-line");
  assert.equal(view.items[0].category, "pharmacies");
  assert.equal(view.items[0].source_id, "osm-overpass-extract");
  assert.equal(view.items[0].kind, "source");
  assert.equal(view.notice, NOTICES.straightLine);
  assert.equal("duration_s" in view.items[0], false);
  assert.equal("safety" in view.items[0], false);

  const empty = await loadAmenities(SAMPLE_PIN, { radiusM: 800, fetchImpl: async () => fakeResponse(200, "{}") });
  assert.equal(empty.ok, true);
  assert.deepEqual(empty.items, []);
  assert.equal(empty.notice, NOTICES.empty);
});

test("invalid pins are rejected before any fetch", async () => {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    return fakeResponse(200, "{}");
  };
  await assert.rejects(() => loadAmenities({ listingId: "example-12", latitude: 91, longitude: 7 }, { radiusM: 800, fetchImpl }), /latitude out of range/);
  await assert.rejects(() => loadAmenities({ listingId: "example-12", latitude: 5.485, longitude: Number.NaN }, { radiusM: 800, fetchImpl }), /longitude out of range/);
  assert.equal(called, false);
});

test("timeout and provider failure stay empty", async () => {
  const timeout = await loadAmenities(SAMPLE_PIN, {
    radiusM: 800,
    signal: AbortSignal.abort(),
    fetchImpl: async (_url, init) => {
      if (init.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
      throw new Error("timed out");
    },
  });
  const failed = await loadAmenities(SAMPLE_PIN, {
    radiusM: 800,
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });
  for (const view of [timeout, failed]) {
    assert.equal(view.ok, false);
    assert.deepEqual(view.items, []);
    assert.deepEqual(view.amenities, []);
    assert.equal(view.notice, NOTICES.unavailable);
    assert.equal(view.reason, view === timeout ? "timeout" : "network");
    assert.equal(JSON.stringify(view).includes("safety"), false);
    assert.equal(JSON.stringify(view).includes("coverage"), false);
    assert.equal(JSON.stringify(view).includes("Example"), false);
  }
});
test("a missing source name stays empty", async () => {
  const view = await loadAmenities(SAMPLE_PIN, {
    radiusM: 800,
    fetchImpl: async () => fakeResponse(200, JSON.stringify({ elements: [{ id: 3, lat: 5.486, lon: 7.035, tags: { amenity: "school" } }] })),
  });
  assert.equal(view.items.length, 1);
  assert.equal(view.items[0].name, null);
  assert.equal(view.items[0].category, "schools");
  assert.equal(view.amenities[0].name, null);
});
test("the preview page states the limits and does not call a provider", () => {
  const page = readFileSync(new URL("../../preview.html", import.meta.url), "utf8");
  for (const sentence of Object.values(NOTICES)) {
    assert.equal(page.includes(sentence), true, sentence);
  }
  assert.equal(page.includes("overpass-api.de"), false);
  assert.equal(page.includes("fetch("), false);
  assert.equal(page.includes("A timeout or a failed response stays empty."), true);
});
