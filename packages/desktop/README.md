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

- Electron + React + electron-vite + Tailwind v4
- Imports shared components from `@tomomo/ui`
- Imports core functions from `@tomomo/core` (Node-only) in the main process, and from `@tomomo/core/character` (browser-safe) in the renderer
- Main process in `src/main/`, renderer in `src/renderer/`, preload bridge in `src/preload/`

## IPC bridge

The preload script exposes a typed `window.api` that the renderer facade (`src/renderer/src/lib/ipc.ts`) wraps into a clean `ipc` object. The renderer then constructs a `desktopUiIpc` implementing the `UiIpc` interface from `@tomomo/ui` with three namespaces: `terminal`, `intro` (hasSeen / markSeen), and `character` (preview with optional color override).

## Onboarding

The first-run onboarding flow is shared with the vscode extension via `@tomomo/ui`'s `<OnboardingFlow />`. The desktop renderer mounts it whenever there are no agents, no active sessions, and the user is on the Agents view. The "Replay intro" button in Settings mounts a second `<OnboardingFlow forceIntro />` as a z-50 overlay without touching the persisted `introComplete` flag.

The sidebar "+ Add agent" button opens the shared `<CreateAgentScreen />` from `@tomomo/ui` as a full-screen overlay. Single random character with a Shuffle button to re-roll.
