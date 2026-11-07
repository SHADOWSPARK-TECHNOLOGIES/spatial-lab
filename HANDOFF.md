# Spatial lab handoff

Repository: https://github.com/SHADOWSPARK-TECHNOLOGIES/spatial-lab.git
Directory: /home/moronto/spatial-lab
Branch: main
Commit: 3ad97a30515f5be832248c90db1417fc22d56ca0
This change is an uncommitted diff on that commit. It was not merged, deployed, or pushed. No new service was started.

## Verified behavior

Checked on 7 October 2026 with `node --test src/neighborhood/*.test.js`. 12 passed, 0 failed.

One live query to https://overpass-api.de/api/interpreter, sample pin 5.485, 7.035, radius 800 m, finished in 1380 ms. It returned two schools. Both distances were labelled straight-line. One source name was Emmanuel College. The other node had no name. At that moment the loader copied the tag "school" into the name field. That is now fixed: a missing name stays null instead of becoming a made-up name. This was one query, not a coverage survey, and not a safety finding.

A second live query, latitude 0, longitude 0, radius 200 m, did not prove an empty area. The public interpreter returned HTTP 504 in about 7.4 seconds, with the remark that the server was too busy. The loader treats that as a failure: no places, notice "Location information is unavailable right now.", reason "http". It does not turn a busy server into an empty success.

Empty success was checked with a fake 200 and no elements. Invalid coordinates throw before fetch. An aborted fetch returns reason "timeout". A thrown network error returns reason "network". HTTP 503 returns reason "http". None of those add a place, a safety score, or a coverage claim.

## Response a caller gets

There is no HTTP route in this repository. `loadAmenities(pin, { radiusM, fetchImpl, signal })` is the call.

```
{
  "ok": true,
  "experimental": true,
  "label": "Experimental lab. Not a listing, and not a statement that the area is safe.",
  "notice": "Straight-line distance estimate. This is not a walking or driving route.",
  "attribution": "© OpenStreetMap contributors",
  "stale": false,
  "items": [
    {
      "name": "Example Pharmacy",
      "category": "pharmacies",
      "lat": 5.486,
      "lng": 7.035,
      "distance_m": 111,
      "distance_label": "straight-line",
      "source_id": "osm-overpass-extract",
      "kind": "source"
    }
  ]
}
```

The place is a source fact. The metres are derived. `kind` stays `source` because that is the place, not the distance.

Empty success uses the empty notice, `items: []`, and `reason: "empty"`.
A busy or failed provider uses `ok: false`, `items: []`, the unavailable notice, and `reason` of `http`, `timeout`, `network`, `parse`, or `oversize`.
Invalid pin throws `latitude out of range` or `longitude out of range`. It does not return an empty success.
A missing OpenStreetMap name is `null`. The loader does not copy the amenity tag into the name.

Categories the loader can emit: hospitals, schools, markets, pharmacies. Not roads. Not transit.

## User-facing page

preview.html is a local explanation page. It does not call a provider. Chromium headless rendered it at 1280x800 and 390x844. Text wrapped. Nothing overlapped or was cut off. The page says the distance is not a walking or driving route, that a timeout or failed response stays empty, and that no example business is added. It does not show a safety score, a coverage claim, or a named business.

Screenshots from that check: /tmp/spatial-preview/desktop.png and /tmp/spatial-preview/mobile.png. Those files are outside the repo and may be cleaned up.

The in-app browser blocked file:// and 127.0.0.1, so that tool did not render the page. The Chromium check did.

## Pull request 4

https://github.com/SHADOWSPARK-TECHNOLOGIES/spatial-lab/pull/4
Branch docs/overpass-contract at b6450d6. Open. Docs only: README.md, docs/V0_CONTRACT.md, docs/extraction.md.
This diff does not touch those files. It does not overwrite that branch.
The pull request describes origin/main, where the loader does not emit `items`. This working tree does emit `items`. Do not merge that pull request as a description of this diff.

Untracked files left alone: .worktrees/ and docs/lodgist-integration-assessment.md.

## Lodgist integration

Owning project for the customer Spatial Lab: Lodgist, /home/moronto/src/lodgist. Not edited.

Lodgist already has its own contract in frontend/src/lib/spatialLab.js and docs/SPATIAL_LAB.md. Straight-line distance there is labelled straight-line and has no travel time. Places are loaded only if OVERPASS_INTERPRETER_URL is set. Routes only if OSRM_BASE_URL is set. Tiles only if NEXT_PUBLIC_MAP_TILE_URL is set. `GET /api/spatial/preview` and `GET /api/spatial/listings/:id` belong to Lodgist. This repository does not implement those routes.

No Lodgist change is required for this diff. Do not copy preview.html into the customer app. Do not treat `osm-overpass-extract` as cleared. docs/DATA_SOURCES.md still marks it under review.

## Limitations

Not production-ready. Not deployed.
The live Owerri query found two schools inside 800 m of the sample pin. That is not a coverage measurement for the city, and it does not clear osm-overpass-extract.
The public interpreter can return HTTP 504 when it is busy. That must stay a failure, not an empty area.
Roads, transit, tiles, and road routing are not connected.
`stale` is still always false. The loader does not yet say a result is old.
Build, type check, and lint were not run. This repo has no scripts for them. Coverage was not measured.

## Continuation check

Checked again on 7 October 2026 in this checkout only. The loader files are older than the handoff above (overpass.js 17:39, handoff 18:12), so the live Overpass queries and the 12-test run were not repeated.

Remote is still https://github.com/SHADOWSPARK-TECHNOLOGIES/spatial-lab.git. Branch main. Commit 3ad97a30515f5be832248c90db1417fc22d56ca0. The reviewable candidate is the uncommitted neighborhood diff on that commit, plus untracked preview.html. It was not committed, tagged, pushed, or deployed. It is not market-ready.

This window is not Lodgist Android and not the ShadowSpark website. Those checkouts were not opened. Device inventory, signing, contact-form delivery, and website keyboard checks were not run here.

Source still matches the recorded contract. A missing OpenStreetMap name stays null. A non-ok HTTP response, timeout, network error, oversize body, or parse failure returns ok false, items [], and reason http, timeout, network, oversize, or parse. Empty success is a 200 with no amenities and reason empty. The loader still sets stale to false. package.json has no scripts, so build, type check, and lint remain not applicable. docs/DATA_SOURCES.md still marks osm-overpass-extract under review. Pull request 4 is still open at b6450d63354e08fc1136bef45bb0cef2f3c28d53 and still describes origin/main, which does not emit items.

## Remaining blockers

The owner has not cleared osm-overpass-extract.
Pull request 4 must not be merged as a description of this diff.
No build, type check, or lint script exists in this repository.
Device and website checks cannot be completed from this checkout.

## Next action

Do not repeat the live Overpass queries or the 12-test run unless the loader changes. Do not switch this window to Lodgist Android or the ShadowSpark website.

Next actionable dependency: the owner reviews this uncommitted diff, then either clears osm-overpass-extract in docs/DATA_SOURCES.md or leaves it under review. Do not deploy from this note.

## Remaining dependencies

A cleared place source, decided by the owner, before any live Overpass call from Lodgist.
A separate decision on tiles and routing. None was added here.
Pull request 4 should be rebased or closed if this diff is committed, so the docs do not describe the old payload as current.

## Rollback

`git checkout -- src/neighborhood`, then delete preview.html and this file.
Do not delete .worktrees/ or docs/lodgist-integration-assessment.md as part of that rollback.
