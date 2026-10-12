import { useEffect, useState } from "react";
import { tokenStore, type Side } from "./api";

/** Reactive token for one side (user/admin). null until hydrated. */
export function useToken(side: Side) {
  const [state, setState] = useState<{ ready: boolean; token: string | null }>({ ready: false, token: null });
  useEffect(() => {
    const sync = () => setState({ ready: true, token: tokenStore.get(side) });
    sync();
    window.addEventListener("eventora-auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("eventora-auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, [side]);
  return state;
}
