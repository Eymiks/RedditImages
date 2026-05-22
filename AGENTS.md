# AGENTS.md

Guidance for coding agents working on this repository.

## Project Overview

- Mobile-first React/Vite PWA for browsing Reddit image/video feeds.
- Main app code lives in `src/`.
- Full-screen media viewer logic is in `src/components/ImageViewer.tsx`.
- Reddit listings are public JSON from `old.reddit.com`, with worker/proxy fallbacks.
- Redgifs videos are resolved through the app's Redgifs API helpers.

## Common Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

Notes:

- The normal dev server command is `npm run dev`.
- For browser testing, `http://127.0.0.1:5173/` is usually the local app URL.
- In this sandbox, `npm run build` can fail because esbuild is denied access while loading `vite.config.ts`. If that happens, rerun the exact build command with escalated permissions instead of changing project code.

## Verification Expectations

- Run `npm run lint` after TypeScript/React changes.
- Run `npm run build` before calling work complete.
- For viewer/player changes, also verify manually in the in-app browser on a mobile-sized viewport.
- Check the browser console for errors after reloading the app.

## Video Player Test Feed

When testing the full-screen video player:

1. Open the app at `http://127.0.0.1:5173/`.
2. Open settings.
3. Enable `Contenu NSFW`.
4. Search/open `r/deepthroat`.
5. Open a video post in the viewer.
6. Verify play/pause, mute/unmute, scrub/progress, vertical swipe, and that the action column does not overlap the video controls.

This feed is specifically useful because it reliably exposes NSFW video posts for player testing.

## UI Notes

- Keep the viewer media-first: overlays should be compact and avoid covering the video.
- Keep touch targets usable on mobile even when controls are visually discreet.
- Avoid adding card-like containers inside the full-screen viewer unless they frame a real tool/modal.
- Use existing Tailwind/lucide patterns before adding new visual conventions.

## Repo Hygiene

- Do not revert or delete unrelated untracked files or user changes.
- Prefer scoped edits over broad refactors.
- Use `rg`/`rg --files` for code search.
- Use `apply_patch` for manual file edits.
- This repo may contain generated screenshots and local artifacts; ignore them unless the user explicitly asks about them.
