import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { requireSupabaseEnv, supabase } from "./supabase";

const LiveContext = createContext({ onlineUsers: [], onlineCount: 0 });

function normalizePresenceState(state) {
  const latestByUser = new Map();

  Object.values(state || {}).flat().forEach((entry) => {
    const userId = entry?.user_id;
    if (!userId) return;

    const existing = latestByUser.get(userId);
    const nextTs = new Date(entry.online_at || 0).getTime();
    const prevTs = new Date(existing?.online_at || 0).getTime();

    if (!existing || nextTs >= prevTs) {
      latestByUser.set(userId, {
        user_id: userId,
        name: entry.name || "Jugador",
        email: entry.email || "",
        role: entry.role || "user",
        online_at: entry.online_at || null,
      });
    }
  });

  return [...latestByUser.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
}

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user || user === false) {
      setOnlineUsers([]);
      return undefined;
    }

    requireSupabaseEnv();

    const channel = supabase.channel("breve-online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const syncPresence = () => {
      setOnlineUsers(normalizePresenceState(channel.presenceState()));
    };

    channel.on("presence", { event: "sync" }, syncPresence);
    channel.on("presence", { event: "join" }, syncPresence);
    channel.on("presence", { event: "leave" }, syncPresence);

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;

      await channel.track({
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        online_at: new Date().toISOString(),
      });

      syncPresence();
    });

    return () => {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value = useMemo(() => ({
    onlineUsers,
    onlineCount: onlineUsers.length,
  }), [onlineUsers]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  return useContext(LiveContext);
}