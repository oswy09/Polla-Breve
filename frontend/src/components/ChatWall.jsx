import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquareMore, Search, Send, Sticker, Users, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError, formatDate, getInitials } from "../lib/api";
import { useLive } from "../lib/live";
import { requireSupabaseEnv, supabase } from "../lib/supabase";
import usePolling from "../lib/usePolling";

const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_API_KEY || "dc6zaTOxFJmzC";
const STICKER_PREFIX = "STICKER::";
const FALLBACK_STICKERS = [
  { id: "fallback-1", url: "https://media.giphy.com/media/l3vRlT2k2L35Cnn5C/giphy.gif", title: "Vamos" },
  { id: "fallback-2", url: "https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif", title: "Celebracion" },
  { id: "fallback-3", url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif", title: "Golazo" },
  { id: "fallback-4", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif", title: "No lo puedo creer" },
  { id: "fallback-5", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", title: "Fuego" },
];

function mergeMessages(previous, incoming) {
  const byId = new Map(previous.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return [...byId.values()].sort((left, right) => new Date(left.created_at) - new Date(right.created_at));
}

function parseStickerUrl(message = "") {
  const value = String(message || "");
  if (!value.startsWith(STICKER_PREFIX)) return null;
  const url = value.slice(STICKER_PREFIX.length).trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

async function fetchGiphyStickers(query) {
  const endpoint = query
    ? `https://api.giphy.com/v1/stickers/search?api_key=${encodeURIComponent(GIPHY_API_KEY)}&q=${encodeURIComponent(query)}&limit=20&rating=pg&lang=es`
    : `https://api.giphy.com/v1/stickers/trending?api_key=${encodeURIComponent(GIPHY_API_KEY)}&limit=20&rating=pg`;

  const response = await fetch(endpoint);
  if (!response.ok) throw new Error("No se pudo cargar stickers");

  const payload = await response.json();
  return (payload?.data || [])
    .map((item) => ({
      id: item.id,
      title: item.title || "Sticker",
      url: item.images?.fixed_height?.url || item.images?.downsized?.url,
      preview: item.images?.fixed_height_small?.url || item.images?.preview_gif?.url,
    }))
    .filter((item) => item.url);
}

export default function ChatWall() {
  const { onlineCount } = useLive();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerSearch, setStickerSearch] = useState("");
  const [stickerResults, setStickerResults] = useState(FALLBACK_STICKERS);
  const [stickersLoading, setStickersLoading] = useState(false);
  const [stickersError, setStickersError] = useState("");
  const scrollerRef = useRef(null);

  const loadMessages = async () => {
    try {
      const { data } = await api.get("/chat/messages");
      setMessages((prev) => mergeMessages(prev, data));
    } catch {
      // polling fallback should stay silent on transient failures
    }
  };

  usePolling(loadMessages, 8000);

  useEffect(() => {
    requireSupabaseEnv();

    const channel = supabase
      .channel("breve-chat-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) => mergeMessages(prev, [payload.new]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!showStickers) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setStickersLoading(true);
      setStickersError("");
      try {
        const data = await fetchGiphyStickers(stickerSearch.trim());
        if (!cancelled) {
          setStickerResults(data.length > 0 ? data : FALLBACK_STICKERS);
        }
      } catch {
        if (!cancelled) {
          setStickerResults(FALLBACK_STICKERS);
          setStickersError("No se pudo conectar con la API, mostrando stickers base.");
        }
      } finally {
        if (!cancelled) setStickersLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showStickers, stickerSearch]);

  const canSend = useMemo(() => text.trim().length > 0 && text.trim().length <= 400, [text]);

  const submit = async (event) => {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;

    setSending(true);
    try {
      const { data } = await api.post("/chat/messages", { message });
      setMessages((prev) => mergeMessages(prev, [data]));
      setText("");
      setShowStickers(false);
      setStickerSearch("");
    } catch (error) {
      toast.error(formatApiError(error.response?.data?.detail) || "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  const sendSticker = async (sticker) => {
    setSending(true);
    try {
      const { data } = await api.post("/chat/messages", {
        message: `${STICKER_PREFIX}${sticker.url}`,
      });
      setMessages((prev) => mergeMessages(prev, [data]));
      setShowStickers(false);
      setStickerSearch("");
    } catch (error) {
      toast.error(formatApiError(error.response?.data?.detail) || "No se pudo enviar el sticker");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="pt-2">
      <div className="card-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <div className="label-eyebrow text-slate-400">Comunidad en vivo</div>
            <h2 className="font-display font-black text-xl mt-1 flex items-center gap-2 text-slate-800">
              <MessageSquareMore className="w-5 h-5 text-emerald-600" /> Muro del torneo
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold self-start sm:self-auto">
            <Users className="w-4 h-4" /> {onlineCount} conectado{onlineCount === 1 ? "" : "s"}
          </div>
        </div>

        <div ref={scrollerRef} className="max-h-72 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">Todavía no hay mensajes. Abre la conversación.</div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-display font-bold flex items-center justify-center text-sm shrink-0">
                  {getInitials(message.user_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800">{message.user_name}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{formatDate(message.created_at)}</span>
                  </div>
                  {(() => {
                    const stickerUrl = parseStickerUrl(message.message);
                    if (!stickerUrl) {
                      return (
                        <div className="mt-1 text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 break-words">
                          {message.message}
                        </div>
                      );
                    }

                    return (
                      <div className="mt-1 inline-block rounded-2xl border border-slate-100 bg-slate-50 p-2">
                        <img
                          src={stickerUrl}
                          alt="Sticker"
                          loading="lazy"
                          className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-xl"
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>

        {showStickers && (
          <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-2 font-bold">Stickers desde API</div>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={stickerSearch}
                  onChange={(event) => setStickerSearch(event.target.value)}
                  placeholder="Buscar sticker: gol, celebration, wow..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-slate-800 placeholder-slate-400"
                />
                {stickerSearch && (
                  <button
                    type="button"
                    onClick={() => setStickerSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {stickersError && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">{stickersError}</div>}
            {stickersLoading ? (
              <div className="text-sm text-slate-400">Cargando stickers...</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
                {stickerResults.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    disabled={sending}
                    onClick={() => sendSticker(sticker)}
                    className="rounded-xl border border-slate-200 bg-white p-1.5 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all disabled:opacity-60"
                  >
                    <img
                      src={sticker.preview || sticker.url}
                      alt={sticker.title}
                      loading="lazy"
                      className="w-full h-20 object-contain rounded-lg"
                    />
                  </button>
                ))}
              </div>
            )}
            {!stickersLoading && stickerResults.length === 0 && (
              <div className="text-sm text-slate-400">No se encontraron stickers para esa búsqueda.</div>
            )}
            <div className="text-[10px] text-slate-400 mt-2">Fuente: API de Giphy Stickers</div>
          </div>
        )}

        <form onSubmit={submit} className="border-t border-slate-100 p-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setShowStickers((prev) => !prev)}
            className="btn-ghost inline-flex items-center justify-center gap-2 sm:w-auto"
          >
            <Sticker className="w-4 h-4" /> Stickers
          </button>
          <input
            type="text"
            maxLength={400}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Escribe algo para todos o manda un sticker..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-colors"
          />
          <button
            type="submit"
            disabled={sending || !canSend}
            className="btn-primary inline-flex items-center justify-center gap-2 min-w-36"
          >
            <Send className="w-4 h-4" /> {sending ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </div>
    </section>
  );
}
