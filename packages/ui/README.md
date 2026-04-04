# @tomomo/ui

Shared React components, stores, hooks, styles, and IPC context for Tomomo apps. Private workspace package, never published.

## Usage

Imported as a workspace dependency by `@tomomo/desktop`, `@tomomo/vscode`, and `@tomomo/website`.

```tsx
import { Button, CharacterSprite, TerminalView, useToast } from "@tomomo/ui";
```

## Components

Button, Badge, Modal, Dropdown, Input, Select, Toast, ToggleGroup, Pill, Empty, SearchBar, CharacterSprite, TerminalView

## Stores

Theme, toast, settings

## Hooks

useIpcQuery, useUiIpc

## Styles

`src/styles/theme.css` provides CSS custom properties and Tailwind theme tokens. Consumers must add `@source` pointing to `packages/ui/src` in their CSS entry point.
