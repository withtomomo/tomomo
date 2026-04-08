// Components
export { ErrorBoundary } from "./components/error-boundary";
export { Button } from "./components/button";
export { Badge } from "./components/badge";
export { Modal } from "./components/modal";
export {
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from "./components/dropdown-menu";
export { Input } from "./components/input";
export { Select } from "./components/select";
export { ToastViewport } from "./components/toast";
export { ToggleGroup } from "./components/toggle-group";
export { Pill } from "./components/pill";
export { Empty } from "./components/empty-state";
export { SearchBar } from "./components/search-bar";
export { CharacterSprite } from "./components/character-sprite";
export { TomoSprite } from "./components/tomo-sprite";
export type { TomoSpriteProps } from "./components/tomo-sprite";
export {
  TerminalView,
  disposeTerminal,
  refitTerminal,
} from "./components/terminal-view";

// Stores
export { ThemeProvider, useTheme } from "./stores/theme-store";
export { ToastProvider, useToast } from "./stores/toast-store";
export { SettingsProvider, useSettings } from "./stores/settings-store";

// Hooks
export { useIpcQuery } from "./hooks/use-ipc-query";

// IPC Context
export { IpcProvider, useUiIpc } from "./ipc-context";
export type { UiIpc } from "./ipc-context";

// Lib
export {
  getStoredValue,
  setStoredValue,
  removeStoredValue,
} from "./lib/storage";

// Types
export type { TerminalSession } from "./types/terminal";

// Onboarding feature (shared between desktop and vscode)
export { OnboardingFlow } from "./features/onboarding/onboarding-flow";
export type { OnboardingFlowProps } from "./features/onboarding/onboarding-flow";
export { CreateAgentScreen } from "./features/onboarding/create-agent-screen";
export type { CreateAgentScreenProps } from "./features/onboarding/create-agent-screen";
