import assert from "node:assert/strict";
import { buildSearchShortcuts } from "../src/components/searchShortcuts.ts";

const shortcuts = buildSearchShortcuts({
  current: "pics",
  favorites: ["pics", "aww", "EarthPorn", "aww", "longexposure", ""],
  recent: ["aww", "space", "pics", "itookapicture", "EarthPorn"],
  favoriteLimit: 3,
  recentLimit: 3
});

assert.deepEqual(shortcuts.favorites, ["aww", "EarthPorn", "longexposure"]);
assert.deepEqual(shortcuts.recent, ["space", "itookapicture"]);

assert.deepEqual(
  buildSearchShortcuts({
    current: "reactjs",
    favorites: [],
    recent: ["ReactJS", "javascript", "reactjs"],
    favoriteLimit: 3,
    recentLimit: 3
  }).recent,
  ["javascript"],
  "recent shortcuts should compare names case-insensitively"
);
