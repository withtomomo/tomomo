# @tomomo/desktop

Electron desktop app for Tomomo. Game-launcher style UI with two views: Agent Hero (detail with embedded chat panel) and Hub (terminal grid).

## Development

```bash
npm run desktop:dev
```

## Build

```bash
npm run desktop:build
```

Outputs to `out/`. Use `electron-builder` for platform-specific distributables (DMG, NSIS, AppImage).

## Architecture

- **Electron + React + electron-vite + Tailwind v4**
- Imports shared components from `@tomomo/ui`
- Imports core functions from `@tomomo/core` as a workspace dependency
- Main process in `src/main/`, renderer in `src/renderer/`
- Preload bridge provides `UiIpc` for terminal operations
