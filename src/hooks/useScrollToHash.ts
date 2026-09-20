import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useScrollToHash() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const element = document.getElementById(hash.slice(1));
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, pathname]);
}
