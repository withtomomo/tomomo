# @tomomo/ui

Shared React components, stores, hooks, styles, IPC context, and the shared onboarding feature for Tomomo apps. Private workspace package, never published.

## Usage

Imported as a workspace dependency by `@tomomo/desktop`, `@tomomo/vscode`, and `@tomomo/website`.

```tsx
import { Button, CharacterSprite, TerminalView, useToast } from "@tomomo/ui";
```

## Components

Button, Badge, Modal, Dropdown, Input, Select, Toast, ToggleGroup, Pill, Empty, SearchBar, CharacterSprite, TomoSprite, TerminalView

### TomoSprite

Renders the Tomomo brand mascot at any size with the same animation pipeline as normal agent characters. Grid is hardcoded from `assets/icon-dark.png`, color is locked to indigo `#5B6CFF`, only `size` and `animate` are configurable.

```tsx
import { TomoSprite } from "@tomomo/ui";

<TomoSprite size={180} animate />;
```

## Onboarding feature

Shared between `@tomomo/desktop` and `@tomomo/vscode`. Lives in `src/features/onboarding/`.

### `<OnboardingFlow />`

The first-run orchestrator. Renders a 6-step visual intro narrated by Tomo (only on the user's first launch, gated by `introComplete` in the global config), then a 3-character starter pick in the fixed Red / Indigo / Green trio with indigo centered in the default-selected hero slot, then a name-your-agent form with a prefilled editable suggestion from `generateAgentName(seed)`, then calls the parent-supplied `onCreateAgent` callback.

Props: `runtimes`, `onCreated`, `onCreateAgent`, plus optional `forceIntro` + `onClose` for the Settings "Replay intro" overlay. Replay never writes to persistence.

### `<CreateAgentScreen />`

The sidebar "Add agent" screen. Single random character with a Shuffle button to re-roll, shares the name form with `OnboardingFlow` via the internal `NameYourAgent` component.

Props: `runtimes`, `onCreated`, `onCancel`, `onCreateAgent`.

Both components require the host app to wire up `UiIpc.intro` (for the persistence flag) and `UiIpc.character` (for character previews with color override).

## Stores

Theme, toast, settings

## Hooks

useIpcQuery, useUiIpc

## IPC context

`UiIpc` interface with three namespaces:

- `terminal` (required): write / resize / onData / onExit
- `intro` (optional): hasSeen / markSeen
- `character` (optional): preview(seed, { color? })

Desktop provides all three via Electron's preload bridge. VS Code provides all three via postMessage. Website uses only terminal-free consumers.

## Styles

`src/styles/theme.css` provides CSS custom properties and Tailwind theme tokens. Consumers must add `@source` pointing to `packages/ui/src` in their CSS entry point.
