# v0 neighborhood contract

Neighborhood context for one property. Not a safety rating.

## Response

```json
{
  "property": { "lat": 5.4836, "lng": 7.0333 },
  "items": [
    {
      "name": "Example Pharmacy",
      "category": "pharmacies",
      "lat": 5.4841,
      "lng": 7.0340,
      "distance_m": 92,
      "source_id": "lab-sample-geometry",
      "kind": "source"
    }
  ]
}
```

## Fields

- `property`: the property pin, `lat` and `lng` in WGS84 decimal degrees.
- `category`: the contract names `roads`, `hospitals`, `schools`, `markets`, `pharmacies`, `transit`. The loader emits only `hospitals`, `schools`, `markets`, and `pharmacies`. Roads and transit are not queried. Transit is not an allowed layer id.
- `name`, `lat`, `lng`: the item as given by its source.
- `distance_m`: straight-line metres from the property pin.
- `source_id`: must match an `id` in docs/DATA_SOURCES.md.
- `kind`: `source` (SOURCE FACT), `derived` (DERIVED VALUE), or `inference` (MODEL INFERENCE).

Area context is not a statement that a neighborhood, landlord, or property is safe.
