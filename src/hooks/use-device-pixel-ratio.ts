import { useState, useEffect } from "react";

export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(
    typeof window !== "undefined" ? window.devicePixelRatio : 1
  );

  useEffect(() => {
    const handler = () => setDpr(window.devicePixelRatio);
    window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener("change", handler);
    return () => window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).removeEventListener("change", handler);
  }, []);

  return dpr;
}
