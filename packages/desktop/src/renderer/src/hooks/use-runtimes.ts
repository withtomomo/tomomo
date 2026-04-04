import { useIpcQuery } from "@tomomo/ui";
import { ipc } from "../lib/ipc";

export function useRuntimes() {
  const { data, loading, error, refetch } = useIpcQuery(() =>
    ipc.runtimes.check()
  );
  return {
    runtimes: data ?? [],
    loading,
    error,
    refetch,
  };
}
