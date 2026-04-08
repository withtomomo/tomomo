import { useIpcQuery } from "@tomomo/ui";
import { ipc } from "../lib/ipc";

export function useRuntimes() {
  const { data, loading, error, refetch } = useIpcQuery(() =>
    ipc.runtimes.check()
  );
  return {
    runtimes: data ?? [],
    // `loaded` distinguishes "first fetch in flight" from "fetch resolved but
    // returned an empty list". Consumers that need to tell those two states
    // apart (e.g. NameYourAgent) should prefer this over `loading`.
    loaded: data !== null,
    loading,
    error,
    refetch,
  };
}
