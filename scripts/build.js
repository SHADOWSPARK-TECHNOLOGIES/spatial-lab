import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildScene } from "../src/map/scene.js";
import { serializeShareState } from "../src/map/share-state.js";

const root = process.cwd();
const dist = path.join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(path.join(dist, "client"), { recursive: true });
mkdirSync(path.join(dist, "scenes"), { recursive: true });

const entry = path.join(root, "src/map/index.js");
/** @type {Set<string>} */
const clientFiles = new Set();

/**
 * @param {string} file
 */
function collect(file) {
  const resolved = path.normalize(file);
  if (clientFiles.has(resolved)) return;
  clientFiles.add(resolved);
  const source = readFileSync(resolved, "utf8");
  const imports = source.matchAll(/from\s+"(\.[^"]+)"/g);
  for (const match of imports) {
    const specifier = match[1];
    if (!specifier) continue;
    collect(path.resolve(path.dirname(resolved), specifier));
  }
}

collect(entry);

for (const file of clientFiles) {
  const relative = path.relative(path.join(root, "src/map"), file);
  if (relative.includes(`${path.sep}server`) || path.basename(file).startsWith("server") || path.basename(file) === "tile-proxy.js") {
    throw new Error(`client graph imports server code: ${relative}`);
  }
  const target = path.join(dist, "client", relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(file));
}

const scenes = {
  "2d": buildScene({ mode: "2d" }),
  terrain: buildScene({ mode: "terrain", basemapId: "osm-raster" }),
  "3d-terrain": buildScene({ mode: "3d-terrain" }),
  share: serializeShareState({
    center: { latitude: 6.45, longitude: 3.4 },
    zoom: 11,
    pitch: 20,
    bearing: 0,
    layers: ["property", "hospitals"],
    entity: { publicId: "amenity-hospital-9", visibility: "public" },
  }),
};

for (const [name, value] of Object.entries(scenes)) {
  writeFileSync(path.join(dist, "scenes", `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

const forbidden = [/process\.env/, /GOOGLE_MAP_TILES_KEY/, /eval\s*\(/, /new\s+Function\s*\(/, /key=/];

/**
 * @param {string} directory
 */
function scan(directory) {
  for (const name of readdirSync(directory)) {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) {
      scan(full);
      continue;
    }
    const text = readFileSync(full, "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(text)) throw new Error(`${full} matches ${pattern}`);
    }
  }
}

scan(dist);
process.stdout.write(`build ok (${clientFiles.size} client files)\n`);
