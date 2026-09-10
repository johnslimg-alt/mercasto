import { useCallback } from "react";
export function useToast(){
  const toast = useCallback((payload={}) => {
    window.dispatchEvent(new CustomEvent("mercasto:toast", { detail: { description: payload.description || "" } }));
  }, []);
  return { toast };
}
