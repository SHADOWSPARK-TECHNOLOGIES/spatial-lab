import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_PIN, assertLayerId, neighborhoodCatalog } from "./catalog.js";

const BANNED = ["flights", "military", "vessels", "satellites", "cctv", "alpr", "radio", "cables", "firms", "earthquakes"];

test("sample pin is accepted", () => {
  const view = neighborhoodCatalog(SAMPLE_PIN, "ready");
  assert.equal(view.ok, true);
  assert.equal(view.pin.listingId, "example-12");
  assert.deepEqual(view.pin, { listingId: "example-12", latitude: 5.485, longitude: 7.035 });
  assert.equal(view.amenities.length, 0);
});

test("out of range and non-finite pins are rejected", () => {
  assert.throws(() => assertLayerId("transit"), /layer not allowed/);
  assert.throws(() => neighborhoodCatalog({ listingId: "example-12", latitude: 91, longitude: 7 }, "ready"), /latitude out of range/);
  assert.throws(() => neighborhoodCatalog({ listingId: "example-12", latitude: 5.485, longitude: Number.NaN }, "ready"), /longitude out of range/);
});
test("banned layer ids throw", () => {
  for (const id of BANNED) {
    assert.throws(() => assertLayerId(id), /layer not allowed/);
  }
});

test("empty, error, and stale do not invent amenities", () => {
  for (const status of ["empty", "error", "stale"]) {
    const view = neighborhoodCatalog(SAMPLE_PIN, status);
    assert.equal(view.amenities.length, 0);
    assert.ok(!view.layers.includes("flights"));
  }
  assert.equal(neighborhoodCatalog(SAMPLE_PIN, "error").ok, false);
  assert.equal(neighborhoodCatalog(SAMPLE_PIN, "stale").stale, true);
  assert.deepEqual(neighborhoodCatalog(SAMPLE_PIN, "stale").pin, SAMPLE_PIN);
});
