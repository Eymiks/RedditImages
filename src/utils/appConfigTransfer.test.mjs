import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";
import ts from "typescript";

async function loadModule() {
  const sourceUrl = new URL("./appConfigTransfer.ts", import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true
    }
  });
  const encoded = Buffer.from(outputText).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

test("creates a versioned portable config export", async () => {
  const { createAppConfigExport } = await loadModule();

  const exported = createAppConfigExport({
    settings: {
      nsfw: true,
      autoplay: false,
      viewerMuted: true,
      defaultTab: "multi",
      sort: "top",
      period: "month"
    },
    favorites: ["Pics", "r/pics", "/r/EarthPorn", ""],
    customFeeds: [
      {
        id: "mix-1",
        name: "Photos",
        subreddits: ["pics", "r/itookapicture", "pics"],
        createdAt: 1710000000000
      }
    ]
  });

  assert.equal(exported.app, "reddit-image-pwa");
  assert.equal(exported.version, 1);
  assert.match(exported.exportedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(exported.favorites, ["earthporn", "pics"]);
  assert.deepEqual(exported.customFeeds[0], {
    id: "mix-1",
    name: "Photos",
    subreddits: ["pics", "itookapicture"],
    createdAt: 1710000000000
  });
  assert.deepEqual(Object.keys(exported).sort(), [
    "app",
    "customFeeds",
    "exportedAt",
    "favorites",
    "settings",
    "version"
  ]);
});

test("parses valid config text and sanitizes imported values", async () => {
  const { parseAppConfigText } = await loadModule();

  const parsed = parseAppConfigText(
    JSON.stringify({
      app: "reddit-image-pwa",
      version: 1,
      exportedAt: "2026-05-22T10:00:00.000Z",
      settings: {
        nsfw: true,
        autoplay: true,
        viewerMuted: false,
        defaultTab: "favorites",
        sort: "new",
        period: "year"
      },
      favorites: ["r/Pics", "PICS", "/r/Art"],
      customFeeds: [
        {
          id: "abc",
          name: "  Long name that should stay  ",
          subreddits: ["pics", "r/art", "art"],
          createdAt: 42
        }
      ],
      recent: ["should-not-import"],
      saved: { also: "ignored" }
    })
  );

  assert.deepEqual(parsed.settings, {
    nsfw: true,
    autoplay: true,
    viewerMuted: false,
    defaultTab: "favorites",
    sort: "new",
    period: "year"
  });
  assert.deepEqual(parsed.favorites, ["art", "pics"]);
  assert.deepEqual(parsed.customFeeds, [
    {
      id: "abc",
      name: "Long name that should stay",
      subreddits: ["pics", "art"],
      createdAt: 42
    }
  ]);
});

test("rejects invalid json, wrong app, and unsupported versions", async () => {
  const { parseAppConfigText } = await loadModule();

  assert.throws(() => parseAppConfigText("{"), /JSON invalide/);
  assert.throws(
    () => parseAppConfigText(JSON.stringify({ app: "other", version: 1 })),
    /fichier ne correspond pas/
  );
  assert.throws(
    () => parseAppConfigText(JSON.stringify({ app: "reddit-image-pwa", version: 99 })),
    /Version de configuration/
  );
});
