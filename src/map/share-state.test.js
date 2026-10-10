import assert from "node:assert/strict";
import test from "node:test";
import { serializeShareState } from "./share-state.js";

test("share state keeps only the allowlisted view", () => {
  const share = serializeShareState({
    center: { latitude: 6.45, longitude: 3.4 },
    zoom: 11,
    pitch: 25,
    bearing: 15,
    layers: ["hospitals", "hospitals", "schools"],
    entity: { publicId: "amenity-hospital-9", visibility: "public" },
    projection: "globe",
    tilt: 80,
  });
  assert.deepEqual(share, {
    center: { latitude: 6.45, longitude: 3.4 },
    zoom: 11,
    pitch: 25,
    bearing: 15,
    layers: ["hospitals", "schools"],
    entity: { publicId: "amenity-hospital-9" },
  });
});

test("forbidden fields are stripped", () => {
  const share = serializeShareState({
    center: { latitude: 5.485, longitude: 7.035, token: "secret-token-value" },
    zoom: 14,
    pitch: 20,
    bearing: 5,
    layers: ["schools", "cctv", "flights", "transit", "roads"],
    enabledLayers: ["markets"],
    entity: {
      publicId: "school-1",
      visibility: "public",
      internalId: "db-row-1",
      listingId: "example-12",
      latitude: 5.485,
      longitude: 7.035,
    },
    selectedEntity: { publicId: "ignored-because-entity-wins", visibility: "public" },
    token: "secret-token-value",
    apiKey: "secret-api-key",
    session: "secret-session",
    cookie: "secret-cookie",
    listingId: "example-12",
    privateListing: { latitude: 5.485, longitude: 7.035, listingId: "example-12" },
  });
  const text = JSON.stringify(share);
  assert.equal(text.includes("secret-token-value"), false);
  assert.equal(text.includes("secret-api-key"), false);
  assert.equal(text.includes("secret-session"), false);
  assert.equal(text.includes("secret-cookie"), false);
  assert.equal(text.includes("example-12"), false);
  assert.equal(text.includes("db-row-1"), false);
  assert.equal(text.includes("5.485"), false);
  assert.equal(text.includes("7.035"), false);
  assert.equal(text.includes("cctv"), false);
  assert.equal(text.includes("flights"), false);
  assert.equal(text.includes("transit"), false);
  assert.deepEqual(share.layers, ["schools", "roads"]);
  assert.deepEqual(share.entity, { publicId: "school-1" });
  assert.equal(share.center.latitude, 5.49);
  assert.equal(share.center.longitude, 7.04);
  assert.equal("token" in share, false);
  assert.equal("listingId" in share, false);
});

test("a private entity and its exact coordinates are omitted", () => {
  const share = serializeShareState({
    center: { lat: 9.05, lng: 7.49 },
    zoom: 8,
    pitch: 0,
    bearing: 0,
    entity: {
      publicId: "hidden-listing",
      visibility: "private",
      latitude: 9.0571,
      longitude: 7.4955,
      internalId: "internal-99",
    },
  });
  assert.equal(share.entity, null);
  const text = JSON.stringify(share);
  assert.equal(text.includes("hidden-listing"), false);
  assert.equal(text.includes("internal-99"), false);
  assert.equal(text.includes("9.0571"), false);
  assert.equal(text.includes("7.4955"), false);
  assert.equal(share.center.latitude, 9.05);
  assert.equal(share.center.longitude, 7.49);
});
