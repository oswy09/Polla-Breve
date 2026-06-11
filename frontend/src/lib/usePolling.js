import { useEffect, useRef } from "react";

/**
 * Calls `callback` once on mount, then every `delayMs` while document is visible.
 * Pauses while tab is hidden and resumes on focus.
 */
export default function usePolling(callback, delayMs = 20000) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    let id = null;
    const tick = () => { try { cbRef.current(); } catch {} };
    const start = () => {
      stop();
      id = setInterval(tick, delayMs);
    };
    const stop = () => {
      if (id) { clearInterval(id); id = null; }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        tick();
        start();
      } else {
        stop();
      }
    };
    tick();
    start();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [delayMs]);
}
