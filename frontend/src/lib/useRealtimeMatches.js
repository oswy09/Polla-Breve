import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

/**
 * Subscribes to realtime changes on the `matches` table.
 * Calls `onUpdate` immediately when any match is inserted or updated.
 * Returns a cleanup function automatically via useEffect.
 */
export default function useRealtimeMatches(onUpdate) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          try { cbRef.current(); } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
