/**
 * sync-results — Supabase Edge Function
 * Free API Live Football Data (RapidAPI)
 *
 * Endpoints usados:
 *   /football-current-live              — partidos EN VIVO ahora
 *   /football-get-matches-by-date       — partidos de una fecha (finalizados)
 *   /football-get-all-matches-by-league — todos los partidos de una liga
 *
 * Secrets:
 *   RAPIDAPI_KEY              — tu X-RapidAPI-Key
 *   WC_LEAGUE_ID (opcional)   — ID del Mundial en esta API (lo buscamos con /debug-leagues)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeTeamName } from "./team-map.ts";

const API_HOST   = "free-api-live-football-data.p.rapidapi.com";
const BASE_URL   = `https://${API_HOST}`;
const WC_LEAGUE_ID = Deno.env.get("WC_LEAGUE_ID") ?? "77"; // FIFA World Cup

// ─── Puntuación ───────────────────────────────────────────────────────────────

function scorePrediction(
  ph: number, pa: number, rh: number, ra: number,
  rules: { exact_result: number; correct_winner: number; correct_draw: number }
): number {
  if (ph === rh && pa === ra) return rules.exact_result;
  const sign = (h: number, a: number) => h === a ? 0 : h > a ? 1 : -1;
  if (sign(ph, pa) === sign(rh, ra))
    return sign(rh, ra) === 0 ? rules.correct_draw : rules.correct_winner;
  if (ph === rh || pa === ra) return 1;
  return 0;
}

// ─── Llamadas a la API ────────────────────────────────────────────────────────

async function apiGet(apiKey: string, path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "x-rapidapi-key":  apiKey,
      "x-rapidapi-host": API_HOST,
      "Content-Type":    "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// Extrae array de partidos de cualquier estructura que devuelva la API
function extractMatches(data: unknown): unknown[] {
  if (Array.isArray(data))                return data;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d?.matches))          return d.matches as unknown[];
  if (Array.isArray(d?.data))             return d.data as unknown[];
  if (Array.isArray(d?.response))         return d.response as unknown[];
  if (Array.isArray(d?.events))           return d.events as unknown[];
  if (Array.isArray(d?.data?.matches))    return (d.data as Record<string,unknown>).matches as unknown[];
  console.log("Formato desconocido:", JSON.stringify(data).slice(0, 400));
  return [];
}

// Parsea un partido de la API a estructura normalizada
interface ParsedMatch {
  homeTeam: string; awayTeam: string;
  homeScore: number | null; awayScore: number | null;
  finished: boolean; live: boolean;
  logoHome: string; logoAway: string;
}

function parseMatch(m: Record<string, unknown>): ParsedMatch | null {
  try {
    const homeTeam =
      (m?.homeTeam  as Record<string,unknown>)?.name as string ||
      (m?.home_team as Record<string,unknown>)?.name as string ||
      m?.homeName as string || m?.home as string || "";

    const awayTeam =
      (m?.awayTeam  as Record<string,unknown>)?.name as string ||
      (m?.away_team as Record<string,unknown>)?.name as string ||
      m?.awayName as string || m?.away as string || "";

    if (!homeTeam || !awayTeam) return null;

    const logoHome =
      (m?.homeTeam  as Record<string,unknown>)?.logo as string ||
      (m?.home_team as Record<string,unknown>)?.logo as string || "";
    const logoAway =
      (m?.awayTeam  as Record<string,unknown>)?.logo as string ||
      (m?.away_team as Record<string,unknown>)?.logo as string || "";

    const rawStatus = (
      (m?.status as Record<string,unknown>)?.short as string ||
      m?.status as string || m?.statusShort as string || m?.matchStatus as string || ""
    ).toUpperCase();

    const finished = ["FT","AET","PEN","FINISHED","AP","END"].some(s => rawStatus.includes(s));
    const live     = ["1H","2H","HT","ET","IN_PLAY","LIVE","INPLAY"].some(s => rawStatus.includes(s));

    const score = m?.score as Record<string,unknown>;
    const goals = m?.goals as Record<string,unknown>;

    const homeScore: number | null =
      ((score?.fulltime ?? score?.fullTime) as Record<string,unknown>)?.home as number ??
      goals?.home as number ??
      m?.homeScore as number ?? m?.home_score as number ?? null;

    const awayScore: number | null =
      ((score?.fulltime ?? score?.fullTime) as Record<string,unknown>)?.away as number ??
      goals?.away as number ??
      m?.awayScore as number ?? m?.away_score as number ?? null;

    return { homeTeam, awayTeam, homeScore, awayScore, finished, live, logoHome, logoAway };
  } catch {
    return null;
  }
}

// ─── Actualizar un partido y calcular puntos ──────────────────────────────────

async function finalizeAndScore(
  supabase: ReturnType<typeof createClient>,
  matchId: string,
  homeScore: number,
  awayScore: number,
  logoHome: string,
  logoAway: string,
  rules: { exact_result: number; correct_winner: number; correct_draw: number }
): Promise<number> {
  await supabase.from("matches").update({
    home_score: homeScore, away_score: awayScore,
    status: "finalized", predictions_locked: true,
    ...(logoHome && { logo_home: logoHome }),
    ...(logoAway && { logo_away: logoAway }),
  }).eq("id", matchId);

  const { data: preds } = await supabase
    .from("predictions")
    .select("id, pred_home, pred_away")
    .eq("match_id", matchId)
    .is("points_earned", null);

  if (!preds?.length) return 0;

  for (const pred of preds) {
    const pts = scorePrediction(pred.pred_home, pred.pred_away, homeScore, awayScore, rules);
    await supabase.from("predictions").update({ points_earned: pts }).eq("id", pred.id);
  }
  return preds.length;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const apiKey = Deno.env.get("RAPIDAPI_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "Falta RAPIDAPI_KEY" }), { status: 500 });

  const params = new URL(req.url).searchParams;

  // ── MODO DEBUG: ver ligas para encontrar ID del Mundial ───────────────────
  if (params.get("debug") === "leagues") {
    const data = await apiGet(apiKey, "/football-get-all-leagues");
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // ── MODO DEBUG: ver partidos de una fecha ─────────────────────────────────
  if (params.get("debug") === "date") {
    const date = params.get("d") ?? new Date().toISOString().slice(0,10).replace(/-/g,"");
    const data = await apiGet(apiKey, `/football-get-matches-by-date?date=${date}`);
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // ── MODO DEBUG: ver livescores ahora ─────────────────────────────────────
  if (params.get("debug") === "live") {
    const data = await apiGet(apiKey, "/football-current-live");
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SYNC PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const { data: rulesRow } = await supabase
      .from("scoring_rules")
      .select("exact_result, correct_winner, correct_draw")
      .order("updated_at", { ascending: false })
      .limit(1).maybeSingle();
    const rules = rulesRow ?? { exact_result: 3, correct_winner: 2, correct_draw: 2 };

    // Partidos pendientes cuya fecha ya pasó
    const { data: pending, error: pendErr } = await supabase
      .from("matches")
      .select("id, home_team, away_team, match_date, logo_home, logo_away")
      .eq("status", "pending")
      .lt("match_date", new Date().toISOString())
      .order("match_date", { ascending: true });

    if (pendErr) throw pendErr;
    if (!pending?.length) return new Response(
      JSON.stringify({ ok: true, message: "Sin partidos pendientes", synced: 0 }),
      { headers: { "Content-Type": "application/json" } }
    );

    const log: string[] = [];
    let synced = 0, pointsUpdated = 0;

    // ── PASO 1: Traer TODOS los partidos del Mundial (liga 77) ─────────────
    let wcMatches: ParsedMatch[] = [];
    try {
      const wcData = await apiGet(apiKey, `/football-get-all-matches-by-league?leagueid=${WC_LEAGUE_ID}`);
      wcMatches = extractMatches(wcData)
        .map(m => parseMatch(m as Record<string,unknown>))
        .filter((m): m is ParsedMatch => m !== null);
      log.push(`Mundial (liga ${WC_LEAGUE_ID}): ${wcMatches.length} partidos totales`);
    } catch (e) {
      log.push(`⚠ Error liga Mundial: ${e}`);
    }

    // ── PASO 2: Livescores para partidos en curso ahora ───────────────────
    let liveMatches: ParsedMatch[] = [];
    try {
      const liveData = await apiGet(apiKey, "/football-current-live");
      liveMatches = extractMatches(liveData)
        .map(m => parseMatch(m as Record<string,unknown>))
        .filter((m): m is ParsedMatch => m !== null);
      log.push(`En vivo ahora: ${liveMatches.length} partidos`);
    } catch (e) {
      log.push(`⚠ Livescores error: ${e}`);
    }

    // Todos los candidatos: livescores tienen prioridad sobre la liga
    const allApiMatches = [...liveMatches, ...wcMatches];

    // ── PASO 3: Cruzar y actualizar ───────────────────────────────────────
    for (const match of pending) {
      const homeNorm = match.home_team;
      const awayNorm = match.away_team;

      const found = allApiMatches.find(api => {
        const ah = normalizeTeamName(api.homeTeam);
        const aa = normalizeTeamName(api.awayTeam);
        return ah === homeNorm && aa === awayNorm;
      });

      if (!found) {
        log.push(`⚠ Sin datos: ${homeNorm} vs ${awayNorm}`);
        continue;
      }

      if (found.live) {
        await supabase.from("matches").update({
          home_score: found.homeScore,
          away_score: found.awayScore,
        }).eq("id", match.id);
        log.push(`⏳ En vivo: ${homeNorm} ${found.homeScore}-${found.awayScore} ${awayNorm}`);
        continue;
      }

      if (!found.finished || found.homeScore == null || found.awayScore == null) {
        log.push(`⚠ Sin resultado final aún: ${homeNorm} vs ${awayNorm}`);
        continue;
      }

      const pts = await finalizeAndScore(
        supabase, match.id,
        found.homeScore, found.awayScore,
        match.logo_home || found.logoHome,
        match.logo_away || found.logoAway,
        rules
      );
      synced++;
      pointsUpdated += pts;
      log.push(`✓ ${homeNorm} ${found.homeScore}–${found.awayScore} ${awayNorm} | ${pts} pronósticos calculados`);
    }

    return new Response(
      JSON.stringify({ ok: true, synced, pointsUpdated, log }, null, 2),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
