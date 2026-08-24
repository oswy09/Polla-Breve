import { requireSupabaseEnv, supabase } from "./supabase";

const ENTRY_FEE_COP = 50000;
const PRIZE_PCT = [50, 23, 15];

function httpError(status, detail) {
  const error = new Error(typeof detail === "string" ? detail : "Request failed");
  error.response = { status, data: { detail } };
  return error;
}

function scorePrediction(predHome, predAway, realHome, realAway, rules) {
  const exact   = rules?.exact_result   ?? 3;
  const winner  = rules?.correct_winner ?? 2;
  const draw    = rules?.correct_draw   ?? 2;

  if (predHome === realHome && predAway === realAway) return exact;

  const sign = (h, a) => (h === a ? 0 : h > a ? 1 : -1);

  if (sign(predHome, predAway) === sign(realHome, realAway)) {
    return sign(realHome, realAway) === 0 ? draw : winner;
  }

  if (predHome === realHome || predAway === realAway) {
    return 1;
  }

  return 0;
}

function normalizeProfile(p) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role || "user",
    paid: Boolean(p.paid),
    avatar_url: p.avatar_url || null,
    created_at: p.created_at || null,
  };
}

function normalizeMatch(m) {
  return {
    id: m.id,
    home_team: m.home_team,
    away_team: m.away_team,
    logo_home: m.logo_home || "",
    logo_away: m.logo_away || "",
    match_date: m.match_date,
    status: m.status,
    predictions_locked: Boolean(m.predictions_locked),
    home_score: m.home_score ?? null,
    away_score: m.away_score ?? null,
    ronda: m.ronda || null,
    phase: m.phase || null,
    group_name: m.group_name || null,
  };
}

function normalizePrediction(p) {
  return {
    id: p.id,
    user_id: p.user_id,
    match_id: p.match_id,
    pred_home: p.pred_home,
    pred_away: p.pred_away,
    points_earned: p.points_earned ?? null,
  };
}

function normalizeBonus(b) {
  return {
    id: b.id,
    user_id: b.user_id,
    type: b.type,
    value: b.value,
    points_earned: b.points_earned ?? null,
    submitted_at: b.submitted_at,
  };
}

function normalizeChatMessage(m) {
  return {
    id: m.id,
    user_id: m.user_id,
    user_name: m.user_name,
    message: m.message,
    created_at: m.created_at,
  };
}

async function getCurrentProfile({ requireAuth = false, requireAdmin = false } = {}) {
  requireSupabaseEnv();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) {
    if (requireAuth || requireAdmin) throw httpError(401, "No autenticado");
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, email, role, paid, active, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.active === false) {
    if (requireAuth || requireAdmin) throw httpError(401, "Usuario no encontrado");
    return null;
  }
  if (requireAdmin && profile.role !== "admin") throw httpError(403, "Solo administradores");
  return normalizeProfile(profile);
}

async function getMatchById(matchId) {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, "Partido no encontrado");
  return data;
}

async function getScoringRules() {
  const { data, error } = await supabase
    .from("scoring_rules")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || { exact_result: 3, correct_winner: 2, correct_draw: 2, champion_bonus: 10, top_scorer_bonus: 5 };
}

async function getTeams() {
  const { data, error } = await supabase
    .from("matches")
    .select("home_team, away_team");
  if (error) throw error;
  const teams = new Set();
  (data || []).forEach(m => {
    if (m.home_team) teams.add(m.home_team);
    if (m.away_team) teams.add(m.away_team);
  });
  return Array.from(teams).sort();
}

async function listMatches() {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });
  if (error) throw error;
  return data.map(normalizeMatch);
}

async function listPredictionsForUser(userId) {
  const { data, error } = await supabase
    .from("predictions")
    .select("id, user_id, match_id, pred_home, pred_away, points_earned")
    .eq("user_id", userId);
  if (error) throw error;
  return data.map(normalizePrediction);
}

async function listChatMessages() {
  await getCurrentProfile({ requireAuth: true });
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, user_id, user_name, message, created_at")
    .order("created_at", { ascending: true })
    .limit(60);
  if (error) throw error;
  return data.map(normalizeChatMessage);
}

async function sendChatMessage(payload) {
  const user = await getCurrentProfile({ requireAuth: true });
  const message = String(payload?.message || "").trim();
  if (!message) throw httpError(400, "Escribe un mensaje");
  if (message.length > 400) throw httpError(400, "El mensaje no puede superar 400 caracteres");
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ user_id: user.id, user_name: user.name, message })
    .select("id, user_id, user_name, message, created_at")
    .single();
  if (error) throw error;
  return normalizeChatMessage(data);
}

async function upsertPrediction(payload) {
  const user = await getCurrentProfile({ requireAuth: true });
  const match = await getMatchById(payload.match_id);

  if (match.status === "finalized" || match.predictions_locked) {
    throw httpError(400, match.status === "finalized" ? "El partido ya finalizó" : "Los pronósticos están cerrados");
  }
  if (
    payload.pred_home == null || payload.pred_away == null ||
    payload.pred_home < 0 || payload.pred_home > 20 ||
    payload.pred_away < 0 || payload.pred_away > 20
  ) {
    throw httpError(400, "Los marcadores deben estar entre 0 y 20");
  }

  const row = {
    user_id: user.id,
    match_id: payload.match_id,
    pred_home: payload.pred_home,
    pred_away: payload.pred_away,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("predictions")
    .upsert(row, { onConflict: "user_id,match_id" })
    .select("id, user_id, match_id, pred_home, pred_away, points_earned")
    .single();
  if (error) throw error;
  return normalizePrediction(data);
}

async function upsertPredictionByAdmin(payload) {
  await getCurrentProfile({ requireAdmin: true });
  const userId = payload?.user_id;
  if (!userId) throw httpError(400, "Debes seleccionar un usuario");

  await getMatchById(payload.match_id); // verify match exists
  if (
    payload.pred_home == null || payload.pred_away == null ||
    payload.pred_home < 0 || payload.pred_home > 20 ||
    payload.pred_away < 0 || payload.pred_away > 20
  ) {
    throw httpError(400, "Los marcadores deben estar entre 0 y 20");
  }

  const { data: targetUser, error: userError } = await supabase
    .from("profiles")
    .select("id, name, active")
    .eq("id", userId)
    .maybeSingle();
  if (userError) throw userError;
  if (!targetUser || targetUser.active === false) throw httpError(404, "Usuario no encontrado");

  const row = {
    user_id: userId,
    match_id: payload.match_id,
    pred_home: payload.pred_home,
    pred_away: payload.pred_away,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("predictions")
    .upsert(row, { onConflict: "user_id,match_id" })
    .select("id, user_id, match_id, pred_home, pred_away, points_earned")
    .single();
  if (error) throw error;
  return { ...normalizePrediction(data), user_name: targetUser.name };
}

async function upsertBonus(payload) {
  const user = await getCurrentProfile({ requireAuth: true });
  const type = payload?.type;
  const value = String(payload?.value || "").trim();

  if (!["champion", "runner_up", "top_scorer", "best_player", "best_goalkeeper"].includes(type)) {
    throw httpError(400, "Tipo de bonus inválido");
  }
  if (!value) throw httpError(400, "Ingresa un valor para el bonus");

  // Check if tournament has started
  const { data: firstMatch, error: matchErr } = await supabase
    .from("matches")
    .select("match_date")
    .order("match_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Bonus predictions locked after June 24 midnight Colombia (UTC-5) = June 25 05:00 UTC
  const BONUS_DEADLINE_DEFAULT = new Date("2026-06-25T05:00:00Z");
  // Excepciones por usuario: plazo extendido individualmente
  const BONUS_DEADLINE_EXCEPTIONS = {
    "298ea411-64bc-435a-9db8-1c066738a9b1": new Date("2026-06-27T05:00:00Z"), // Camilo Corredor +2 días
  };
  const deadline = BONUS_DEADLINE_EXCEPTIONS[user.id] || BONUS_DEADLINE_DEFAULT;
  if (new Date() >= deadline) {
    throw httpError(400, "El plazo para predicciones bonus ha cerrado");
  }

  const row = {
    user_id: user.id,
    type,
    value,
    submitted_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("bonus_predictions")
    .upsert(row, { onConflict: "user_id,type" })
    .select("id, user_id, type, value, points_earned, submitted_at")
    .single();
  if (error) throw error;
  return normalizeBonus(data);
}

async function getMyBonuses() {
  const user = await getCurrentProfile({ requireAuth: true });
  const { data, error } = await supabase
    .from("bonus_predictions")
    .select("id, user_id, type, value, points_earned, submitted_at")
    .eq("user_id", user.id);
  if (error) throw error;
  return data.map(normalizeBonus);
}

async function computeRanking() {
  const rules = await getScoringRules();

  const { data: users, error: usersError } = await supabase
    .from("public_profiles")
    .select("id, name, role, paid, active, avatar_url")
    .eq("active", true);
  if (usersError) throw usersError;

  const { data: firstMatch } = await supabase
    .from("matches")
    .select("match_date")
    .order("match_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const hasStarted = firstMatch && (new Date() >= new Date(firstMatch.match_date));
  let filteredUsers = users || [];
  if (hasStarted) {
    filteredUsers = filteredUsers.filter((u) => u.paid || u.role === "admin");
  }

  const { data: finalizedMatches, error: matchesError } = await supabase
    .from("matches")
    .select("id, home_score, away_score")
    .not("home_score", "is", null)
    .not("away_score", "is", null);
  if (matchesError) throw matchesError;

  const matchMap = new Map(finalizedMatches.map((m) => [m.id, m]));
  const matchIds = finalizedMatches.map((m) => m.id);

  let predictions = [];
  if (matchIds.length > 0) {
    const { data, error } = await supabase
      .from("predictions")
      .select("user_id, match_id, pred_home, pred_away")
      .in("match_id", matchIds)
      .range(0, 19999);
    if (error) throw error;
    predictions = data;
  }

  const predictionsByUser = new Map();
  for (const p of predictions) {
    const bucket = predictionsByUser.get(p.user_id) || [];
    bucket.push(p);
    predictionsByUser.set(p.user_id, bucket);
  }

  let bonusByUser = new Map();
  const { data: allBonus } = await supabase
    .from("bonus_predictions")
    .select("user_id, points_earned")
    .not("points_earned", "is", null);
  if (allBonus) {
    for (const b of allBonus) {
      bonusByUser.set(b.user_id, (bonusByUser.get(b.user_id) || 0) + b.points_earned);
    }
  }

  let dailyPointsByUser = new Map();
  const { data: allDaily } = await supabase
    .from("daily_responses")
    .select("user_id")
    .eq("is_correct", true);
  if (allDaily) {
    for (const d of allDaily) {
      dailyPointsByUser.set(d.user_id, (dailyPointsByUser.get(d.user_id) || 0) + 0.5);
    }
  }

  const rows = filteredUsers.map((user) => {
    const userPredictions = predictionsByUser.get(user.id) || [];
    let points = (bonusByUser.get(user.id) || 0) + (dailyPointsByUser.get(user.id) || 0);
    let exactos = 0;
    let ganadores = 0;

    for (const pred of userPredictions) {
      const match = matchMap.get(pred.match_id);
      if (!match) continue;
      const pts = scorePrediction(pred.pred_home, pred.pred_away, match.home_score, match.away_score, rules);
      points += pts;
      if (pts === (rules?.exact_result ?? 3)) exactos += 1;
      else if (pts > 0) ganadores += 1;
    }

    const bonus_pts = bonusByUser.get(user.id) || 0;
    return { user_id: user.id, name: user.name, avatar_url: user.avatar_url || null, points, exactos, ganadores, bonus_pts };
  });

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactos !== a.exactos) return b.exactos - a.exactos;
    if (b.ganadores !== a.ganadores) return b.ganadores - a.ganadores;
    return a.name.localeCompare(b.name, "es");
  });

  return rows;
}

async function getResults() {
  const user = await getCurrentProfile({ requireAuth: true });
  const rules = await getScoringRules();

  const { data: allMatches, error: matchesError } = await supabase
    .from("matches")
    .select("id, home_team, away_team, logo_home, logo_away, match_date, status, home_score, away_score, ronda, phase, group_name")
    .order("match_date", { ascending: true });
  if (matchesError) throw matchesError;

  const relevantMatches = allMatches.filter(m => 
    m.status === "finalized" || (m.home_score !== null && m.away_score !== null)
  );

  const matchIds = relevantMatches.map((m) => m.id);
  let predictions = [];
  if (matchIds.length > 0) {
    const { data, error } = await supabase
      .from("predictions")
      .select("id, user_id, match_id, pred_home, pred_away, points_earned")
      .eq("user_id", user.id)
      .in("match_id", matchIds);
    if (error) throw error;
    predictions = data;
  }

  const predictionMap = new Map(predictions.map((p) => [p.match_id, p]));

  return relevantMatches.map((match) => {
    const pred = predictionMap.get(match.id);
    return {
      match: normalizeMatch(match),
      my_prediction: pred ? normalizePrediction(pred) : null,
      my_points: pred
        ? scorePrediction(pred.pred_home, pred.pred_away, match.home_score, match.away_score, rules)
        : null,
    };
  });
}

async function getMatchLeaderboard(matchId, limit) {
  await getCurrentProfile({ requireAuth: true });
  const match = await getMatchById(matchId);
  if (match.status !== "finalized" && !match.predictions_locked && (match.home_score === null || match.away_score === null)) {
    return [];
  }
  const rules = await getScoringRules();

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("user_id, pred_home, pred_away")
    .eq("match_id", matchId);
  if (predictionsError) throw predictionsError;

  const userIds = [...new Set(predictions.map((p) => p.user_id))];
  let profiles = [];
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, name, active")
      .in("id", userIds)
      .eq("active", true);
    if (error) throw error;
    profiles = data;
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));
  const rows = predictions
    .filter((p) => profileMap.has(p.user_id))
    .map((p) => ({
      user_id: p.user_id,
      name: profileMap.get(p.user_id),
      pred_home: p.pred_home,
      pred_away: p.pred_away,
      points: scorePrediction(p.pred_home, p.pred_away, match.home_score, match.away_score, rules),
    }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name, "es");
  });

  return rows;
}

async function getDailyHero() {
  const rules = await getScoringRules();
  
  const { data: allMatches, error: matchesError } = await supabase
    .from("matches")
    .select("id, home_team, away_team, logo_home, logo_away, match_date, status, home_score, away_score, ronda, phase, group_name")
    .order("match_date", { ascending: true });
  if (matchesError) throw matchesError;
  
  if (!allMatches || allMatches.length === 0) return null;

  const getLocalDateStr = (isoString) => {
    const d = new Date(isoString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getLocalDateStr(new Date());
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  const matchesByDate = new Map();
  for (const m of allMatches) {
    const dStr = getLocalDateStr(m.match_date);
    const list = matchesByDate.get(dStr) || [];
    list.push(m);
    matchesByDate.set(dStr, list);
  }

  // Últimas 2 fechas con partidos ya con resultado
  const datesWithResults = Array.from(matchesByDate.entries())
    .filter(([, ms]) => ms.some(m => m.home_score !== null && m.away_score !== null))
    .map(([d]) => d)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 2);

  if (datesWithResults.length === 0) return null;

  // Partidos de esas fechas que ya tienen resultado
  const targetMatches = datesWithResults
    .flatMap(d => matchesByDate.get(d) || [])
    .filter(m => m.home_score !== null && m.away_score !== null);

  const targetMatchIds = targetMatches.map(m => m.id);

  if (targetMatchIds.length === 0) return null;

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("user_id, match_id, pred_home, pred_away")
    .in("match_id", targetMatchIds);
  if (predictionsError) throw predictionsError;

  const predictionsByUser = new Map();
  if (predictions) {
    for (const p of predictions) {
      const uList = predictionsByUser.get(p.user_id) || [];
      uList.push(p);
      predictionsByUser.set(p.user_id, uList);
    }
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("public_profiles")
    .select("id, name, role, paid, active")
    .eq("active", true);
  if (profilesError) throw profilesError;

  const { data: firstMatch } = await supabase
    .from("matches")
    .select("match_date")
    .order("match_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  const hasStarted = firstMatch && (new Date() >= new Date(firstMatch.match_date));
  let filteredUsers = profiles || [];
  if (hasStarted) {
    filteredUsers = filteredUsers.filter((u) => u.paid || u.role === "admin");
  }

  const userResults = [];

  for (const u of filteredUsers) {
    const uPreds = predictionsByUser.get(u.id) || [];
    const predMap = new Map(uPreds.map(p => [p.match_id, p]));
    
    let points = 0;
    let exactos = 0;
    let ganadores = 0;
    let hasPredictedAny = false;

    const userPredList = [];

    for (const m of targetMatches) {
      const pred = predMap.get(m.id);
      let pts = null;
      if (pred) {
        hasPredictedAny = true;
        if (m.home_score !== null && m.away_score !== null) {
          pts = scorePrediction(pred.pred_home, pred.pred_away, m.home_score, m.away_score, rules);
          points += pts;
          if (pts === (rules?.exact_result ?? 3)) exactos += 1;
          else if (pts > 0) ganadores += 1;
        }
      }
      userPredList.push({
        match: normalizeMatch(m),
        prediction: pred ? normalizePrediction(pred) : null,
        points: pts
      });
    }

    userResults.push({
      user: { id: u.id, name: u.name },
      points,
      exactos,
      ganadores,
      predictions: userPredList,
      hasPredictedAny
    });
  }

  let candidates = userResults.filter(r => r.hasPredictedAny);
  if (candidates.length === 0) candidates = userResults;

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactos !== a.exactos) return b.exactos - a.exactos;
    if (b.ganadores !== a.ganadores) return b.ganadores - a.ganadores;
    return a.user.name.localeCompare(b.user.name, "es");
  });

  const hero = candidates[0];

  return {
    dateLabel: datesWithResults.length === 1 ? datesWithResults[0] : `${datesWithResults[datesWithResults.length-1]} – ${datesWithResults[0]}`,
    user: hero.user,
    points: hero.points,
    exactos: hero.exactos,
    predictions: hero.predictions
  };
}

async function getMotivationSettings() {
  await getCurrentProfile({ requireAuth: true });
  const { data, error } = await supabase
    .from("motivation_settings")
    .select("enabled, threshold, message, title, force_targets")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data || { enabled: false, threshold: 10, message: "", title: "¡Está cerca!", force_targets: [] };
}

async function updateMotivationSettings(payload) {
  await getCurrentProfile({ requireAdmin: true });
  const updates = {};
  if (typeof payload?.enabled === "boolean") updates.enabled = payload.enabled;
  if (typeof payload?.message === "string") updates.message = payload.message;
  if (typeof payload?.title === "string") updates.title = payload.title;
  if (payload?.threshold != null) updates.threshold = Number(payload.threshold);
  if (Array.isArray(payload?.force_targets)) updates.force_targets = payload.force_targets;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("motivation_settings")
    .update(updates)
    .eq("id", 1)
    .select("enabled, threshold, message, title, force_targets")
    .single();
  if (error) throw error;
  return data;
}

async function clearMotivationForceTarget(userId) {
  // Elimina al usuario de force_targets después de que vio el modal
  const { data: current } = await supabase
    .from("motivation_settings")
    .select("force_targets")
    .eq("id", 1)
    .maybeSingle();
  if (!current) return;
  const targets = current.force_targets || [];
  if (!targets.includes("all") && !targets.includes(userId)) return;
  const next = targets.includes("all") ? [] : targets.filter(id => id !== userId);
  await supabase.from("motivation_settings").update({ force_targets: next }).eq("id", 1);
}

async function getDailyReminderSettings() {
  await getCurrentProfile({ requireAuth: true });
  const { data, error } = await supabase
    .from("daily_reminder_settings")
    .select("enabled, message")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data || { enabled: false, message: "" };
}

async function updateDailyReminderSettings(payload) {
  await getCurrentProfile({ requireAdmin: true });
  const updates = {};
  if (typeof payload?.enabled === "boolean") updates.enabled = payload.enabled;
  if (typeof payload?.message === "string") updates.message = payload.message;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("daily_reminder_settings")
    .update(updates)
    .eq("id", 1)
    .select("enabled, message")
    .single();
  if (error) throw error;
  return data;
}

async function getStats() {
  const { count, error } = await supabase
    .from("public_profiles")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  if (error) throw error;

  const participants = count || 0;
  const total = participants * ENTRY_FEE_COP;
  return {
    participants,
    total_collected_cop: total,
    entry_fee_cop: ENTRY_FEE_COP,
    prize_first_cop: Math.floor((total * PRIZE_PCT[0]) / 100),
    prize_second_cop: Math.floor((total * PRIZE_PCT[1]) / 100),
    prize_third_cop: Math.floor((total * PRIZE_PCT[2]) / 100),
    prize_first_pct: PRIZE_PCT[0],
    prize_second_pct: PRIZE_PCT[1],
    prize_third_pct: PRIZE_PCT[2],
  };
}

async function createUserByAdmin(payload) {
  await getCurrentProfile({ requireAdmin: true });
  const name = String(payload?.name || "").trim();
  const email = String(payload?.email || "").trim();
  const password = String(payload?.password || "").trim();
  if (!name) throw httpError(400, "El nombre es requerido");
  if (!email) throw httpError(400, "El correo es requerido");
  if (!password || password.length < 6) throw httpError(400, "La contraseña debe tener al menos 6 caracteres");

  // Use a secondary client so signUp doesn't replace the admin's session
  const { createClient } = await import("@supabase/supabase-js");
  const tempClient = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await tempClient.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw httpError(400, error.message);
  if (!data?.user) throw httpError(500, "No se pudo crear el usuario");

  // Upsert profile (in case trigger didn't fire yet)
  await supabase.from("profiles").upsert(
    { id: data.user.id, email, name, role: "user", paid: false, active: true },
    { onConflict: "id" }
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, role, paid, created_at")
    .eq("id", data.user.id)
    .maybeSingle();

  return normalizeProfile(profile || { id: data.user.id, email, name, role: "user", paid: false, created_at: new Date().toISOString() });
}

async function listAdminUsers() {
  await getCurrentProfile({ requireAdmin: true });
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, paid, created_at, active")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(normalizeProfile);
}

async function setPaid(userId, paid) {
  await getCurrentProfile({ requireAdmin: true });
  const { data, error } = await supabase
    .from("profiles")
    .update({ paid })
    .eq("id", userId)
    .eq("active", true)
    .select("id, name, email, role, paid, created_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, "Usuario no encontrado");
  return normalizeProfile(data);
}

async function softDeleteUser(userId) {
  const current = await getCurrentProfile({ requireAdmin: true });
  if (userId === current.id) throw httpError(400, "No puedes eliminarte a ti mismo");

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, active")
    .eq("id", userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing || existing.active === false) throw httpError(404, "Usuario no encontrado");

  const { error: predictionsError } = await supabase.from("predictions").delete().eq("user_id", userId);
  if (predictionsError) throw predictionsError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ active: false, paid: false })
    .eq("id", userId);
  if (profileError) throw profileError;
  return { ok: true };
}

async function lockMatchPredictions(matchId, locked) {
  await getCurrentProfile({ requireAdmin: true });
  const { data, error } = await supabase
    .from("matches")
    .update({ predictions_locked: locked })
    .eq("id", matchId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, "Partido no encontrado");
  return normalizeMatch(data);
}

async function saveMatchScore(matchId, payload) {
  await getCurrentProfile({ requireAdmin: true });
  // Guardar un marcador (incluso el 0-0 inicial) significa que el partido ya
  // empezó, así que cerramos pronósticos automáticamente sin depender del
  // cron ni de que match_date esté correcta.
  const { data, error } = await supabase
    .from("matches")
    .update({ home_score: payload.home_score, away_score: payload.away_score, predictions_locked: true })
    .eq("id", matchId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, "Partido no encontrado");
  return normalizeMatch(data);
}

async function setMatchResult(matchId, payload) {
  await getCurrentProfile({ requireAdmin: true });

  const { data, error } = await supabase
    .from("matches")
    .update({
      home_score: payload.home_score,
      away_score: payload.away_score,
      status: "finalized",
      predictions_locked: true,
    })
    .eq("id", matchId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, "Partido no encontrado");

  const match = normalizeMatch(data);
  const rules = await getScoringRules();

  const { data: predictions } = await supabase
    .from("predictions")
    .select("id, pred_home, pred_away")
    .eq("match_id", matchId);

  if (predictions && predictions.length > 0) {
    for (const pred of predictions) {
      const pts = scorePrediction(pred.pred_home, pred.pred_away, payload.home_score, payload.away_score, rules);
      await supabase.from("predictions").update({ points_earned: pts }).eq("id", pred.id);
    }
  }

  return match;
}

async function propagateBracketWinner(matchId, winner) {
  // winner: 'home' | 'away' — para partidos que se definieron por penales
  await getCurrentProfile({ requireAdmin: true });
  const { data: match, error } = await supabase
    .from("matches")
    .select("home_team, away_team, logo_home, logo_away, winner_next_match_id, winner_next_slot, loser_next_match_id, loser_next_slot")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;
  if (!match) throw httpError(404, "Partido no encontrado");

  const isHome = winner === "home";
  const winnerTeam = isHome ? match.home_team : match.away_team;
  const winnerLogo = isHome ? match.logo_home  : match.logo_away;
  const loserTeam  = isHome ? match.away_team  : match.home_team;
  const loserLogo  = isHome ? match.logo_away  : match.logo_home;

  if (match.winner_next_match_id) {
    const updateWinner = match.winner_next_slot === "home"
      ? { home_team: winnerTeam, logo_home: winnerLogo }
      : { away_team: winnerTeam, logo_away: winnerLogo };
    await supabase.from("matches").update(updateWinner).eq("id", match.winner_next_match_id);
  }

  if (match.loser_next_match_id) {
    const updateLoser = match.loser_next_slot === "home"
      ? { home_team: loserTeam, logo_home: loserLogo }
      : { away_team: loserTeam, logo_away: loserLogo };
    await supabase.from("matches").update(updateLoser).eq("id", match.loser_next_match_id);
  }
}

async function getBonusSubmittedValues() {
  await getCurrentProfile({ requireAdmin: true });
  const { data } = await supabase
    .from("bonus_predictions")
    .select("type, value");
  const result = {};
  for (const row of data || []) {
    if (!result[row.type]) result[row.type] = new Set();
    if (row.value) result[row.type].add(row.value.trim());
  }
  // Convertir Sets a arrays ordenados
  const out = {};
  for (const [type, set] of Object.entries(result)) out[type] = [...set].sort();
  return out;
}

async function getBonusOfficialResults() {
  await getCurrentProfile({ requireAdmin: true });
  const { data } = await supabase.from("bonus_official").select("type, official_value");
  const result = {};
  for (const row of data || []) result[row.type] = row.official_value;
  return result;
}

async function gradeBonusPredictions(results) {
  // results: { champion, runner_up, top_scorer, best_player, best_goalkeeper }
  await getCurrentProfile({ requireAdmin: true });

  const POINTS = { champion: 5, runner_up: 3, top_scorer: 3, best_player: 3, best_goalkeeper: 3 };

  for (const [type, officialValue] of Object.entries(results)) {
    if (!officialValue || !officialValue.trim()) continue;
    const official = officialValue.trim().toLowerCase();

    // Guardar resultado oficial
    await supabase.from("bonus_official").upsert(
      { type, official_value: officialValue.trim(), updated_at: new Date().toISOString() },
      { onConflict: "type" }
    );

    const { data: preds } = await supabase
      .from("bonus_predictions")
      .select("id, value")
      .eq("type", type);

    if (!preds || preds.length === 0) continue;

    for (const pred of preds) {
      const isCorrect = pred.value?.trim().toLowerCase() === official;
      const { error: upErr } = await supabase
        .from("bonus_predictions")
        .update({ points_earned: isCorrect ? POINTS[type] : 0 })
        .eq("id", pred.id);
      if (upErr) throw new Error(`[${type}] ${upErr.message}`);
    }
  }
}

async function revertBonusPredictions() {
  await getCurrentProfile({ requireAdmin: true });
  // Quitar puntos a todos los bonus_predictions
  const { error } = await supabase
    .from("bonus_predictions")
    .update({ points_earned: null })
    .not("id", "is", null);
  if (error) throw new Error(error.message);
  // Borrar resultados oficiales guardados
  await supabase.from("bonus_official").delete().not("type", "is", null);
}

async function reopenMatch(matchId) {
  await getCurrentProfile({ requireAdmin: true });
  await supabase.from("predictions").update({ points_earned: null }).eq("match_id", matchId);
  const { data, error } = await supabase
    .from("matches")
    .update({ home_score: null, away_score: null, status: "pending", predictions_locked: false })
    .eq("id", matchId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, "Partido no encontrado");
  return normalizeMatch(data);
}

async function listAdminPredictions() {
  await getCurrentProfile({ requireAdmin: true });
  const rules = await getScoringRules();

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, home_team, away_team, logo_home, logo_away, match_date, status, ronda, phase, group_name, home_score, away_score")
    .order("match_date", { ascending: true });
  if (matchesError) throw matchesError;

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("id, user_id, match_id, pred_home, pred_away, points_earned")
    .range(0, 19999);
  if (predictionsError) throw predictionsError;

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("active", true);
  if (profilesError) throw profilesError;

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return matches.map((match) => {
    const matchPredictions = predictions
      .filter((pred) => pred.match_id === match.id)
      .map((pred) => ({
        ...normalizePrediction(pred),
        user_name: profileMap.get(pred.user_id)?.name || "?",
        user_email: profileMap.get(pred.user_id)?.email || "",
        points: match.status === "finalized"
          ? scorePrediction(pred.pred_home, pred.pred_away, match.home_score, match.away_score, rules)
          : null,
      }));
    matchPredictions.sort((a, b) => a.user_name.localeCompare(b.user_name, "es"));
    return { match: normalizeMatch(match), predictions: matchPredictions };
  });
}

async function getEstadisticas() {
  await getCurrentProfile({ requireAuth: true });
  const rules = await getScoringRules();

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, name, avatar_url, role, paid")
    .eq("active", true);

  const { data: firstMatch } = await supabase
    .from("matches")
    .select("match_date")
    .order("match_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  const hasStarted = firstMatch && new Date() >= new Date(firstMatch.match_date);

  let eligibleUsers = profiles || [];
  if (hasStarted) eligibleUsers = eligibleUsers.filter(u => u.paid || u.role === "admin");

  const { data: finalizedMatches } = await supabase
    .from("matches")
    .select("id, match_date, home_score, away_score")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("match_date", { ascending: true });

  const fMatches = finalizedMatches || [];
  const matchMap = new Map(fMatches.map(m => [m.id, m]));
  const fMatchIds = fMatches.map(m => m.id);

  let finPredictions = [];
  if (fMatchIds.length > 0) {
    const { data } = await supabase
      .from("predictions")
      .select("user_id, match_id, pred_home, pred_away, updated_at")
      .in("match_id", fMatchIds)
      .range(0, 19999);
    finPredictions = data || [];
  }

  // All predictions (for count + "anticipado": updated_at vs match_date)
  const { data: allUserPreds } = await supabase
    .from("predictions")
    .select("user_id, match_id, updated_at")
    .range(0, 19999);

  const { data: triviaAnswers } = await supabase
    .from("daily_responses")
    .select("user_id, is_correct, answered_date");

  const { data: bonusAnswers } = await supabase
    .from("bonus_predictions")
    .select("user_id, points_earned")
    .not("points_earned", "is", null);

  const { data: allMatches } = await supabase.from("matches").select("id");
  const totalMatches = (allMatches || []).length;

  // Fetch all matches (with match_date) for "anticipado" stat
  const { data: allMatchesFull } = await supabase
    .from("matches")
    .select("id, match_date");
  const allMatchDateMap = new Map((allMatchesFull || []).map(m => [m.id, m.match_date]));

  const userStats = new Map();
  for (const u of eligibleUsers) {
    userStats.set(u.id, {
      id: u.id, name: u.name, avatar_url: u.avatar_url || null,
      exactos: 0, ganadores: 0, zeroPts: 0, onePts: 0,
      predCount: 0, finPredCount: 0, triviaCorrect: 0, triviaTotal: 0,
      anticipadoMinutes: [], // minutes before match for each pred
    });
  }

  for (const pred of finPredictions) {
    const s = userStats.get(pred.user_id);
    if (!s) continue;
    const match = matchMap.get(pred.match_id);
    if (!match) continue;
    const pts = scorePrediction(pred.pred_home, pred.pred_away, match.home_score, match.away_score, rules);
    s.finPredCount++;
    if (pts === (rules?.exact_result ?? 3)) s.exactos++;
    else if (pts === 1) { s.ganadores++; s.onePts++; }
    else if (pts > 1) s.ganadores++;
    if (pts === 0) s.zeroPts++;
  }

  for (const p of (allUserPreds || [])) {
    const s = userStats.get(p.user_id);
    if (!s) continue;
    s.predCount++;
    // "Anticipado": how many minutes before match start
    const matchDate = allMatchDateMap.get(p.match_id);
    if (matchDate && p.updated_at) {
      const minsBefore = (new Date(matchDate).getTime() - new Date(p.updated_at).getTime()) / 60000;
      if (minsBefore > 0) s.anticipadoMinutes.push(minsBefore); // only pre-match
    }
  }

  for (const t of (triviaAnswers || [])) {
    const s = userStats.get(t.user_id);
    if (!s) continue;
    s.triviaTotal++;
    if (t.is_correct) s.triviaCorrect++;
  }

  // Days at 1st place: cumulative ranking per day
  const getColDate = (iso) => {
    const d = new Date(new Date(iso).getTime() - 5 * 3600000);
    return d.toISOString().slice(0, 10);
  };

  const matchesByDay = new Map();
  for (const m of fMatches) {
    const day = getColDate(m.match_date);
    const list = matchesByDay.get(day) || [];
    list.push(m);
    matchesByDay.set(day, list);
  }

  const predByUserMatch = new Map();
  for (const pred of finPredictions) {
    predByUserMatch.set(`${pred.user_id}:${pred.match_id}`, pred);
  }

  // Bonus total por usuario (sin fecha, igual que en performanceData)
  const bonusByUser = new Map();
  for (const b of bonusAnswers || []) {
    bonusByUser.set(b.user_id, (bonusByUser.get(b.user_id) || 0) + b.points_earned);
  }

  // Trivia correctas indexadas por usuario+fecha
  const triviaByUserDay = new Map();
  for (const t of triviaAnswers || []) {
    if (!t.is_correct || !t.answered_date) continue;
    const key = t.user_id;
    const arr = triviaByUserDay.get(key) || [];
    arr.push(t.answered_date);
    triviaByUserDay.set(key, arr);
  }

  const sortedDays = Array.from(matchesByDay.keys()).sort();
  const cumMatchPts = new Map(eligibleUsers.map(u => [u.id, 0]));
  const daysAtFirst = new Map(eligibleUsers.map(u => [u.id, 0]));
  const daysAtBottom = new Map(eligibleUsers.map(u => [u.id, 0]));
  const positionByDay = new Map(); // userId -> [position per day]

  const totalUsers = eligibleUsers.length;

  for (const day of sortedDays) {
    for (const m of (matchesByDay.get(day) || [])) {
      for (const u of eligibleUsers) {
        const pred = predByUserMatch.get(`${u.id}:${m.id}`);
        if (pred) {
          const pts = scorePrediction(pred.pred_home, pred.pred_away, m.home_score, m.away_score, rules);
          cumMatchPts.set(u.id, (cumMatchPts.get(u.id) || 0) + pts);
        }
      }
    }
    // Puntos totales = partidos + trivia hasta ese día + bonus (igual que performanceData)
    const totalPts = (u) => {
      const matchPts = cumMatchPts.get(u.id) || 0;
      const triviaPts = (triviaByUserDay.get(u.id) || []).filter(d => d <= day).length * 0.5;
      const bonusPts = bonusByUser.get(u.id) || 0;
      return matchPts + triviaPts + bonusPts;
    };
    const sorted = [...eligibleUsers].sort((a, b) => totalPts(b) - totalPts(a));
    const maxPts = totalPts(sorted[0]);
    const bottomThreshold = Math.floor(totalUsers * 0.67);
    for (const [i, u] of sorted.entries()) {
      if (!positionByDay.has(u.id)) positionByDay.set(u.id, []);
      positionByDay.get(u.id).push(i + 1);
      if (totalPts(u) === maxPts && maxPts > 0) {
        daysAtFirst.set(u.id, (daysAtFirst.get(u.id) || 0) + 1);
      }
      if (i >= bottomThreshold) {
        daysAtBottom.set(u.id, (daysAtBottom.get(u.id) || 0) + 1);
      }
    }
  }

  // Climb / drop: first recorded position vs latest position
  const climbMap = new Map();
  const dropMap = new Map();
  const positionRangeMap = new Map(); // for "tibios": max - min
  const avgPositionMap = new Map();   // for "tibios": average position
  for (const u of eligibleUsers) {
    const hist = positionByDay.get(u.id) || [];
    if (hist.length >= 2) {
      const delta = hist[0] - hist[hist.length - 1]; // positive = improved
      climbMap.set(u.id, Math.max(0, delta));
      dropMap.set(u.id, Math.max(0, -delta));
      positionRangeMap.set(u.id, Math.max(...hist) - Math.min(...hist));
      avgPositionMap.set(u.id, hist.reduce((a, b) => a + b, 0) / hist.length);
    } else {
      climbMap.set(u.id, 0);
      dropMap.set(u.id, 0);
      positionRangeMap.set(u.id, 0);
      avgPositionMap.set(u.id, hist[0] || totalUsers);
    }
  }

  const users = Array.from(userStats.values()).map(s => {
    const mins = s.anticipadoMinutes;
    const avgMinsBefore = mins.length > 0
      ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)
      : 0;
    return {
      id: s.id, name: s.name, avatar_url: s.avatar_url,
      exactos: s.exactos,
      ganadores: s.ganadores,
      zeroPts: s.zeroPts,
      onePts: s.onePts,
      predCount: s.predCount,
      finPredCount: s.finPredCount,
      triviaCorrect: s.triviaCorrect,
      triviaTotal: s.triviaTotal,
      daysAtFirst: daysAtFirst.get(s.id) || 0,
      daysAtBottom: daysAtBottom.get(s.id) || 0,
      climb: climbMap.get(s.id) || 0,
      drop: dropMap.get(s.id) || 0,
      positionRange: positionRangeMap.get(s.id) || 0,
      avgPosition: Math.round(avgPositionMap.get(s.id) || totalUsers),
      avgMinsBefore,
      anticipadoCount: mins.length,
    };
  });

  return { users, totalMatches, finalizedCount: fMatches.length, totalUsers };
}

// Calcula la tabla de cada grupo y rellena los equipos reales de 16avos
// (R32) reemplazando los placeholders "Winner Group X", "Runner-up Group X"
// y "3rd Group A/B/C/..." por los equipos que realmente clasificaron.
// Desempate: puntos, diferencia de gol, goles a favor (sin fair-play ni
// head-to-head — suficiente para casi todos los casos reales).
async function calculateRound32Qualifiers() {
  await getCurrentProfile({ requireAdmin: true });

  const { data: allMatches, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, logo_home, logo_away, home_score, away_score, status, phase, group_name");
  if (error) throw error;

  const groupMatches = allMatches.filter((m) => m.phase === "group" && m.group_name);
  const r32Matches = allMatches.filter((m) => m.phase === "R32");

  // Mapa de logos por nombre de equipo (de cualquier partido de grupos)
  const logoMap = new Map();
  for (const m of groupMatches) {
    if (m.home_team && m.logo_home) logoMap.set(m.home_team, m.logo_home);
    if (m.away_team && m.logo_away) logoMap.set(m.away_team, m.logo_away);
  }

  // Tabla por grupo
  const tableByGroup = new Map(); // group -> Map(team -> stats)
  for (const m of groupMatches) {
    if (m.home_score == null || m.away_score == null) continue;
    const g = m.group_name;
    if (!tableByGroup.has(g)) tableByGroup.set(g, new Map());
    const table = tableByGroup.get(g);

    const ensure = (team) => {
      if (!table.has(team)) table.set(team, { team, pts: 0, gf: 0, ga: 0, played: 0 });
      return table.get(team);
    };
    const home = ensure(m.home_team);
    const away = ensure(m.away_team);
    home.played++; away.played++;
    home.gf += m.home_score; home.ga += m.away_score;
    away.gf += m.away_score; away.ga += m.home_score;
    if (m.home_score > m.away_score) home.pts += 3;
    else if (m.home_score < m.away_score) away.pts += 3;
    else { home.pts += 1; away.pts += 1; }
  }

  const sortTeams = (arr) =>
    [...arr].sort((a, b) => (b.pts - a.pts) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.gf - a.gf));

  const winners = new Map();   // group -> team name
  const runnerUps = new Map(); // group -> team name
  const thirdsList = [];       // [{ group, team, pts, gd, gf }]

  for (const [group, table] of tableByGroup.entries()) {
    const sorted = sortTeams([...table.values()]);
    if (sorted[0]) winners.set(group, sorted[0].team);
    if (sorted[1]) runnerUps.set(group, sorted[1].team);
    if (sorted[2]) thirdsList.push({ group, team: sorted[2].team, pts: sorted[2].pts, gd: sorted[2].gf - sorted[2].ga, gf: sorted[2].gf });
  }

  const bestThirds = [...thirdsList]
    .sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf))
    .slice(0, 8);
  const qualifiedThirdGroups = new Map(bestThirds.map((t) => [t.group, t.team]));

  const resolvePlaceholder = (placeholder) => {
    if (!placeholder) return null;
    let m = placeholder.match(/^Winner Group (\w)$/);
    if (m) return winners.get(m[1]) || null;
    m = placeholder.match(/^Runner-up Group (\w)$/);
    if (m) return runnerUps.get(m[1]) || null;
    m = placeholder.match(/^3rd Group ([\w/]+)$/);
    if (m) {
      const candidateGroups = m[1].split("/");
      for (const g of candidateGroups) {
        if (qualifiedThirdGroups.has(g)) return qualifiedThirdGroups.get(g);
      }
      return null;
    }
    return null;
  };

  let updated = 0;
  const unresolved = [];

  for (const match of r32Matches) {
    const realHome = resolvePlaceholder(match.home_team);
    const realAway = resolvePlaceholder(match.away_team);

    if (!realHome && !realAway) continue; // ya tiene nombres reales o no se pudo resolver nada

    const updates = {};
    if (realHome && realHome !== match.home_team) {
      updates.home_team = realHome;
      updates.logo_home = logoMap.get(realHome) || "";
    }
    if (realAway && realAway !== match.away_team) {
      updates.away_team = realAway;
      updates.logo_away = logoMap.get(realAway) || "";
    }

    if (Object.keys(updates).length === 0) continue;

    const { error: updError } = await supabase.from("matches").update(updates).eq("id", match.id);
    if (updError) throw updError;
    updated++;

    if (!realHome) unresolved.push(match.home_team);
    if (!realAway) unresolved.push(match.away_team);
  }

  return {
    ok: true,
    updated,
    totalR32: r32Matches.length,
    unresolved: [...new Set(unresolved)],
    bestThirds: bestThirds.map((t) => ({ group: t.group, team: t.team, pts: t.pts })),
  };
}

function parseRequestPath(path) {
  const parsed = new URL(path, "https://local.app");
  return { pathname: parsed.pathname, searchParams: parsed.searchParams };
}

export const api = {
  async get(path) {
    const { pathname, searchParams } = parseRequestPath(path);

    if (pathname === "/teams")           return { data: await getTeams() };
    if (pathname === "/matches")         return { data: await listMatches() };
    if (pathname === "/predictions/me") {
      const user = await getCurrentProfile({ requireAuth: true });
      return { data: await listPredictionsForUser(user.id) };
    }
    if (pathname === "/ranking")         return { data: await computeRanking() };
    if (pathname === "/ranking/daily-hero") return { data: await getDailyHero() };
    if (pathname === "/results")         return { data: await getResults() };
    if (pathname === "/stats")           return { data: await getStats() };
    if (pathname === "/motivation-settings") return { data: await getMotivationSettings() };
    if (pathname === "/daily-reminder-settings") return { data: await getDailyReminderSettings() };
    if (pathname === "/estadisticas")    return { data: await getEstadisticas() };
    if (pathname === "/admin/users")     return { data: await listAdminUsers() };
    if (pathname === "/admin/predictions") return { data: await listAdminPredictions() };
    if (pathname === "/chat/messages")   return { data: await listChatMessages() };
    if (pathname === "/bonus/me")        return { data: await getMyBonuses() };
    if (pathname === "/scoring-rules")   return { data: await getScoringRules() };
    if (pathname === "/daily-trivia/question") {
      const offset = Number(searchParams.get("testOffset") || 0);
      const testDayOffset = Number(searchParams.get("testDayOffset") || 0);
      return { data: await getDailyQuestion(offset, testDayOffset) };
    }
    if (pathname === "/admin/trivia/question") {
      const userId = searchParams.get("userId");
      return { data: await getAdminTriviaQuestion(userId) };
    }
    if (pathname === "/admin/trivia/vip-overrides") return { data: await listVipOverrides() };
    if (pathname === "/admin/bonus/official")   return { data: await getBonusOfficialResults() };
    if (pathname === "/admin/bonus/submitted")  return { data: await getBonusSubmittedValues() };

    const userPredictionsMatch = pathname.match(/^\/users\/([^/]+)\/predictions$/);
    if (userPredictionsMatch) return { data: await getUserPredictions(userPredictionsMatch[1]) };

    const userBonusMatch = pathname.match(/^\/users\/([^/]+)\/bonus$/);
    if (userBonusMatch) return { data: await getUserBonus(userBonusMatch[1]) };

    const userTriviaMatch = pathname.match(/^\/users\/([^/]+)\/trivia$/);
    if (userTriviaMatch) return { data: await getUserTrivia(userTriviaMatch[1]) };

    const leaderboardMatch = pathname.match(/^\/matches\/([^/]+)\/leaderboard$/);
    if (leaderboardMatch) {
      return { data: await getMatchLeaderboard(leaderboardMatch[1], Number(searchParams.get("limit") || 5)) };
    }

    const userProfileMatch = pathname.match(/^\/users\/([^/]+)\/profile$/);
    if (userProfileMatch) return { data: await getUserProfile(userProfileMatch[1]) };

    throw httpError(404, `Ruta no implementada: GET ${pathname}`);
  },

  async post(path, payload) {
    const { pathname } = parseRequestPath(path);
    if (pathname === "/predictions")       return { data: await upsertPrediction(payload) };
    if (pathname === "/admin/predictions") return { data: await upsertPredictionByAdmin(payload) };
    if (pathname === "/admin/users")       return { data: await createUserByAdmin(payload) };
    if (pathname === "/chat/messages")     return { data: await sendChatMessage(payload) };
    if (pathname === "/bonus")             return { data: await upsertBonus(payload) };
    if (pathname === "/daily-trivia/answer") return { data: await answerDailyQuestion(payload) };
    if (pathname === "/daily-trivia/reset") return { data: await resetDailyQuestion() };
    if (pathname === "/admin/trivia/answer") return { data: await answerTriviaByAdmin(payload) };
    if (pathname === "/admin/trivia/vip-override") return { data: await setVipOverride(payload) };
    if (pathname === "/admin/trivia/vip-override/delete") return { data: await deleteVipOverride(payload) };
    if (pathname === "/admin/calculate-qualifiers") return { data: await calculateRound32Qualifiers() };
    if (pathname === "/admin/bonus/grade")  return { data: await gradeBonusPredictions(payload) };
    if (pathname === "/admin/bonus/revert") return { data: await revertBonusPredictions() };
    throw httpError(404, `Ruta no implementada: POST ${pathname}`);
  },

  async put(path, payload) {
    const { pathname } = parseRequestPath(path);

    const scoreRoute  = pathname.match(/^\/matches\/([^/]+)\/score$/);
    if (scoreRoute)  return { data: await saveMatchScore(scoreRoute[1], payload) };

    const resultMatch = pathname.match(/^\/matches\/([^/]+)\/result$/);
    if (resultMatch) return { data: await setMatchResult(resultMatch[1], payload) };

    const reopen = pathname.match(/^\/matches\/([^/]+)\/reopen$/);
    if (reopen)     return { data: await reopenMatch(reopen[1]) };

    const propagate = pathname.match(/^\/matches\/([^/]+)\/propagate$/);
    if (propagate)  return { data: await propagateBracketWinner(propagate[1], payload.winner) };

    if (pathname === "/admin/bonus/grade") return { data: await gradeBonusPredictions(payload) };

    const lockRoute = pathname.match(/^\/matches\/([^/]+)\/lock$/);
    if (lockRoute)  return { data: await lockMatchPredictions(lockRoute[1], Boolean(payload?.locked)) };

    const paidRoute = pathname.match(/^\/admin\/users\/([^/]+)\/paid$/);
    if (paidRoute)  return { data: await setPaid(paidRoute[1], Boolean(payload?.paid)) };

    if (pathname === "/profile/me") return { data: await updateMyProfile(payload) };
    if (pathname === "/motivation-settings") return { data: await updateMotivationSettings(payload) };
    if (pathname === "/motivation-settings/clear-force") return { data: await clearMotivationForceTarget(payload?.user_id) };
    if (pathname === "/daily-reminder-settings") return { data: await updateDailyReminderSettings(payload) };

    throw httpError(404, `Ruta no implementada: PUT ${pathname}`);
  },

  async delete(path) {
    const { pathname } = parseRequestPath(path);
    const userRoute = pathname.match(/^\/admin\/users\/([^/]+)$/);
    if (userRoute) return { data: await softDeleteUser(userRoute[1]) };
    throw httpError(404, `Ruta no implementada: DELETE ${pathname}`);
  },
};

export { uploadMyAvatar };

export async function triggerSync() {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta REACT_APP_SUPABASE_SERVICE_ROLE_KEY en .env");

  const res = await fetch(`${url}/functions/v1/sync-results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: "{}",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data; // { ok, synced, pointsUpdated, log }
}

export async function sendPushNotification({ title, body, url, target = "all" }) {
  const supaUrl = process.env.REACT_APP_SUPABASE_URL;
  if (!supaUrl) throw new Error("Falta REACT_APP_SUPABASE_URL en .env");

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error("No hay sesión activa");

  const res = await fetch(`${supaUrl}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ title, body, url, target }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data; // { ok, sent, failed, total }
}

export function formatApiError(detail) {
  if (detail == null) return "Algo salió mal. Intenta de nuevo.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", {
      weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/Bogota",
    });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY TRIVIA LOGIC
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_TRIVIA_QUESTIONS = 42;
// Tournament start date — used to compute "day number" for question ordering
const TRIVIA_START_DATE = new Date("2026-06-11T00:00:00Z");

/**
 * Seeded LCG shuffle — produces a stable, user-specific permutation of question IDs.
 * Same userId always yields the same order; different userIds yield different orders.
 */
function seededShuffle(arr, seed) {
  let s = (seed | 0) || 1;
  const next = () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashStringToInt(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Returns the question ID for a given user on a given UTC date.
 * - Each user gets a unique random order of all 42 questions (seeded by userId).
 * - Day 0 = June 11 2026; day 1 = June 12; etc.
 * - After 42 days the cycle repeats, but the tournament only lasts ~46 days so
 *   only 4 questions could repeat — well after the final.
 */
function getDailyQuestionForUser(userId, dateStr, totalQuestions = TOTAL_TRIVIA_QUESTIONS) {
  const userSeed = hashStringToInt(userId);
  const allIds = Array.from({ length: totalQuestions }, (_, i) => i + 1);
  const userOrder = seededShuffle(allIds, userSeed);

  const current = new Date(dateStr + "T00:00:00Z");
  const daysSinceStart = Math.floor((current - TRIVIA_START_DATE) / 86400000);
  // Keep index in [0, total-1], handle dates before start gracefully
  const idx = ((daysSinceStart % totalQuestions) + totalQuestions) % totalQuestions;
  return userOrder[idx];
}

function getColombiaDateStr(dayOffset = 0) {
  // Colombia is UTC-5, trivia day resets at midnight Colombia time
  const now = new Date(Date.now() - 5 * 60 * 60 * 1000);
  if (Number.isFinite(dayOffset) && dayOffset !== 0) {
    now.setUTCDate(now.getUTCDate() + dayOffset);
  }
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getDailyQuestion(testOffset = 0, testDayOffset = 0) {
  const user = await getCurrentProfile({ requireAuth: true });
  const dateStr = getColombiaDateStr(Number(testDayOffset) || 0);

  // Verifica si el admin asignó una pregunta VIP para este usuario hoy
  const { data: override } = await supabase
    .from("trivia_overrides")
    .select("question_id")
    .eq("user_id", user.id)
    .eq("override_date", dateStr)
    .maybeSingle();

  const baseId = getDailyQuestionForUser(user.id, dateStr);
  const questionId = override?.question_id
    ?? ((baseId - 1 + Number(testOffset)) % TOTAL_TRIVIA_QUESTIONS) + 1;

  const { data: q, error: qErr } = await supabase
    .from("trivia_questions")
    .select("id, question, options")
    .eq("id", questionId)
    .maybeSingle();

  if (qErr || !q) throw httpError(500, "No se pudo cargar la pregunta del día");

  const { data: resp } = await supabase
    .from("daily_responses")
    .select("selected_index, is_correct, question_id")
    .eq("user_id", user.id)
    .eq("answered_date", dateStr)
    .maybeSingle();

  if (resp) {
    const { data: fullQ } = await supabase
      .from("trivia_questions")
      .select("correct_index, note")
      .eq("id", questionId)
      .single();

    return {
      answered: true,
      question: {
        id: q.id,
        question: q.question,
        options: q.options,
        correct_index: fullQ?.correct_index,
        note: fullQ?.note || null,
      },
      selected_index: resp.selected_index,
      is_correct: resp.is_correct,
    };
  }

  return {
    answered: false,
    question: {
      id: q.id,
      question: q.question,
      options: q.options,
    },
  };
}

async function answerDailyQuestion(payload) {
  const user = await getCurrentProfile({ requireAuth: true });
  const selectedIndex = payload?.selected_index;
  const questionId = payload?.question_id;
  const dayOffset = Number(payload?.testDayOffset || 0);

  if (selectedIndex == null || questionId == null) {
    throw httpError(400, "Faltan parámetros de respuesta");
  }

  const dateStr = getColombiaDateStr(dayOffset);

  const { data: existing } = await supabase
    .from("daily_responses")
    .select("id")
    .eq("user_id", user.id)
    .eq("answered_date", dateStr)
    .maybeSingle();

  if (existing) {
    throw httpError(400, "Ya respondiste la pregunta del día hoy");
  }

  const { data: q, error: qErr } = await supabase
    .from("trivia_questions")
    .select("correct_index")
    .eq("id", questionId)
    .maybeSingle();

  if (qErr || !q) {
    throw httpError(400, "Pregunta no encontrada");
  }

  // correct_index = -1 significa pregunta bonus: siempre correcta sin importar la opción
  const isCorrect = q.correct_index === -1 || q.correct_index === selectedIndex;
  
  const { error: insErr } = await supabase
    .from("daily_responses")
    .insert({
      user_id: user.id,
      question_id: questionId,
      selected_index: selectedIndex,
      is_correct: isCorrect,
      answered_date: dateStr
    });

  if (insErr) {
    throw httpError(500, "No se pudo registrar tu respuesta");
  }

  return {
    ok: true,
    is_correct: isCorrect,
    correct_index: q.correct_index
  };
}

async function getAdminTriviaQuestion(targetUserId) {
  await getCurrentProfile({ requireAdmin: true });
  const dateStr = getColombiaDateStr(0);
  const questionId = getDailyQuestionForUser(targetUserId, dateStr);

  const { data: q, error: qErr } = await supabase
    .from("trivia_questions")
    .select("id, question, options, correct_index")
    .eq("id", questionId)
    .maybeSingle();
  if (qErr || !q) throw httpError(500, "No se pudo cargar la pregunta");

  const { data: resp } = await supabase
    .from("daily_responses")
    .select("selected_index, is_correct")
    .eq("user_id", targetUserId)
    .eq("answered_date", dateStr)
    .maybeSingle();

  return { question: q, answered: !!resp, dateStr };
}

async function answerTriviaByAdmin(payload) {
  await getCurrentProfile({ requireAdmin: true });
  const { user_id, question_id, selected_index } = payload;
  if (!user_id || question_id == null || selected_index == null) {
    throw httpError(400, "Faltan parámetros");
  }
  const dateStr = getColombiaDateStr(0);

  const { data: existing } = await supabase
    .from("daily_responses")
    .select("id")
    .eq("user_id", user_id)
    .eq("answered_date", dateStr)
    .maybeSingle();
  if (existing) throw httpError(400, "Este usuario ya respondió hoy");

  const { data: q } = await supabase
    .from("trivia_questions")
    .select("correct_index")
    .eq("id", question_id)
    .maybeSingle();
  if (!q) throw httpError(404, "Pregunta no encontrada");

  const isCorrect = q.correct_index === selected_index;
  const { error } = await supabase.from("daily_responses").insert({
    user_id,
    question_id,
    selected_index,
    is_correct: isCorrect,
    answered_date: dateStr,
  });
  if (error) throw httpError(500, "No se pudo guardar la respuesta");
  return { ok: true, is_correct: isCorrect, correct_index: q.correct_index };
}

async function setVipOverride({ user_id, override_date }) {
  await getCurrentProfile({ requireAdmin: true });
  if (!user_id || !override_date) throw httpError(400, "Faltan user_id o override_date");

  const { error } = await supabase
    .from("trivia_overrides")
    .upsert({ user_id, question_id: 43, override_date }, { onConflict: "user_id,override_date" });

  if (error) throw httpError(500, "No se pudo guardar el override: " + error.message);
  return { ok: true };
}

async function deleteVipOverride({ user_id, override_date }) {
  await getCurrentProfile({ requireAdmin: true });
  const { error } = await supabase
    .from("trivia_overrides")
    .delete()
    .eq("user_id", user_id)
    .eq("override_date", override_date);
  if (error) throw httpError(500, error.message);
  return { ok: true };
}

async function listVipOverrides() {
  await getCurrentProfile({ requireAdmin: true });
  const { data, error } = await supabase
    .from("trivia_overrides")
    .select("id, user_id, override_date, profiles(name)")
    .order("override_date", { ascending: false });
  if (error) throw httpError(500, error.message);
  return data;
}

async function resetDailyQuestion() {
  const user = await getCurrentProfile({ requireAuth: true });
  
  const dateStr = getColombiaDateStr(0);
  
  const { error } = await supabase
    .from("daily_responses")
    .delete()
    .eq("user_id", user.id)
    .eq("answered_date", dateStr);
    
  if (error) throw error;
  return { ok: true };
}

async function getUserPredictions(targetUserId) {
  await getCurrentProfile({ requireAuth: true });
  
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, home_team, away_team, logo_home, logo_away, match_date, status, home_score, away_score, ronda, phase, group_name, predictions_locked")
    .order("match_date", { ascending: true });
  if (matchesError) throw matchesError;

  const { data: predictions, error: predError } = await supabase
    .from("predictions")
    .select("id, user_id, match_id, pred_home, pred_away, points_earned")
    .eq("user_id", targetUserId);
  if (predError) throw predError;

  const rules = await getScoringRules();
  const predMap = new Map(predictions.map(p => [p.match_id, p]));

  return matches.map(match => {
    const isVisible = match.status === "finalized" || match.predictions_locked;
    const pred = predMap.get(match.id);
    const hasScores = match.home_score !== null && match.away_score !== null;
    return {
      match: normalizeMatch(match),
      prediction: isVisible && pred ? normalizePrediction(pred) : null,
      points: isVisible && pred && hasScores
        ? scorePrediction(pred.pred_home, pred.pred_away, match.home_score, match.away_score, rules)
        : null,
      is_visible: isVisible,
      has_prediction: !!pred
    };
  });
}

async function getUserBonus(targetUserId) {
  await getCurrentProfile({ requireAuth: true });
  
  // Find out if the tournament has started
  const { data: firstMatch } = await supabase
    .from("matches")
    .select("match_date")
    .order("match_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const hasStarted = firstMatch && (new Date() >= new Date(firstMatch.match_date));
  
  // If not started, only allow reading if they are viewing themselves or are admin
  const current = await getCurrentProfile();
  if (!hasStarted && current.id !== targetUserId && current.role !== "admin") {
    return [];
  }

  const { data, error } = await supabase
    .from("bonus_predictions")
    .select("id, user_id, type, value, points_earned, submitted_at")
    .eq("user_id", targetUserId);
  if (error) throw error;
  return data.map(normalizeBonus);
}

async function getUserTrivia(targetUserId) {
  const currentUser = await getCurrentProfile({ requireAuth: true });
  const isOwnProfile = currentUser.id === targetUserId;

  const { data: questions, error: qErr } = await supabase
    .from("trivia_questions")
    .select("id, question, options, correct_index, note")
    .lte("id", 42)
    .order("id", { ascending: true });
  if (qErr) throw qErr;

  const { data: responses, error: rErr } = await supabase
    .from("daily_responses")
    .select("question_id, selected_index, is_correct, answered_date")
    .eq("user_id", targetUserId);
  if (rErr) throw rErr;

  const qMap = new Map(questions.map((q) => [q.id, q]));
  const todayStr = getColombiaDateStr(0);

  // Iterar por fecha respondida (no por pregunta) para evitar duplicados.
  // Si la respuesta fue insertada por admin (question_id=43), usar la pregunta
  // asignada por el algoritmo para esa fecha.
  return responses
    .map((resp) => {
      const assignedQid = resp.question_id === 43
        ? getDailyQuestionForUser(targetUserId, resp.answered_date)
        : resp.question_id;
      const q = qMap.get(assignedQid);
      if (!q) return null;
      
      const isToday = resp.answered_date === todayStr;
      // Hide today's answer only when viewing someone else's trivia (privacy)
      const hideToday = isToday && !isOwnProfile;
      return {
        question_id: q.id,
        question: q.question,
        options: q.options,
        correct_option: q.options[q.correct_index],
        note: hideToday ? null : (q.note || null),
        answered: true,
        is_correct: hideToday ? null : resp.is_correct,
        selected_option: hideToday ? "Oculto hoy" : q.options[resp.selected_index],
        answered_date: resp.answered_date,
        is_today: isToday,
        hide_today: hideToday
      };
    })
    .filter(Boolean);
}

async function updateMyProfile(payload) {
  const current = await getCurrentProfile({ requireAuth: true });
  const updates = {};
  if (typeof payload?.name === "string" && payload.name.trim()) {
    updates.name = payload.name.trim();
  }
  if (typeof payload?.avatar_url === "string") {
    updates.avatar_url = payload.avatar_url;
  }
  if (Object.keys(updates).length === 0) return current;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", current.id)
    .select("id, name, email, role, paid, active, avatar_url, created_at")
    .single();
  if (error) throw error;
  return normalizeProfile(data);
}

// Comprime y redimensiona la imagen en el navegador antes de subirla
async function compressImage(file, maxSize = 480, quality = 0.82) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  let { width, height } = img;
  if (width > height && width > maxSize) {
    height = Math.round((height * maxSize) / width);
    width = maxSize;
  } else if (height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  return blob;
}

async function uploadMyAvatar(file) {
  const current = await getCurrentProfile({ requireAuth: true });

  if (!file.type.startsWith("image/")) {
    throw httpError(400, "El archivo debe ser una imagen");
  }

  const compressed = await compressImage(file);
  const path = `${current.id}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, compressed, { contentType: "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  return updateMyProfile({ avatar_url: avatarUrl });
}

async function getUserProfile(targetUserId) {
  await getCurrentProfile({ requireAuth: true });
  const rules = await getScoringRules();

  // Info básica del usuario
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, name, active, avatar_url")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!profile) throw new Error("Usuario no encontrado");

  // Todos los partidos finalizados con fecha
  const { data: finalizedMatches } = await supabase
    .from("matches")
    .select("id, home_score, away_score, match_date, home_team, away_team")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("match_date", { ascending: true });

  // Todos los usuarios activos para calcular posición
  const { data: allUsers } = await supabase
    .from("public_profiles")
    .select("id, name")
    .eq("active", true);

  // Predicciones de todos los usuarios en partidos finalizados
  const matchIds = (finalizedMatches || []).map(m => m.id);
  let allPredictions = [];
  if (matchIds.length > 0) {
    const { data } = await supabase
      .from("predictions")
      .select("user_id, match_id, pred_home, pred_away")
      .in("match_id", matchIds)
      .range(0, 19999);
    allPredictions = data || [];
  }

  // Trivia correctas de todos
  const { data: allDaily } = await supabase
    .from("daily_responses")
    .select("user_id, answered_date, is_correct");

  // Bonus de todos
  const { data: allBonus } = await supabase
    .from("bonus_predictions")
    .select("user_id, points_earned")
    .not("points_earned", "is", null);

  // Agrupa predicciones por usuario
  const predsByUser = new Map();
  for (const p of allPredictions) {
    const arr = predsByUser.get(p.user_id) || [];
    arr.push(p);
    predsByUser.set(p.user_id, arr);
  }

  const matchMap = new Map((finalizedMatches || []).map(m => [m.id, m]));

  // Bonus por usuario
  const bonusByUser = new Map();
  for (const b of allBonus || []) {
    bonusByUser.set(b.user_id, (bonusByUser.get(b.user_id) || 0) + b.points_earned);
  }

  // Calcula puntos totales de un usuario hasta cierta fecha (inclusive)
  function pointsUpTo(userId, untilDate) {
    const matchPts = (predsByUser.get(userId) || []).reduce((sum, p) => {
      const m = matchMap.get(p.match_id);
      if (!m || m.match_date > untilDate) return sum;
      return sum + scorePrediction(p.pred_home, p.pred_away, m.home_score, m.away_score, rules);
    }, 0);
    const triviaPts = (allDaily || [])
      .filter(d => d.user_id === userId && d.is_correct && (d.answered_date + "T23:59:59Z") <= untilDate)
      .length * 0.5;
    const bonusPts = bonusByUser.get(userId) || 0;
    return matchPts + triviaPts + bonusPts;
  }

  // Días únicos con partidos finalizados
  const matchDays = [...new Set((finalizedMatches || []).map(m => m.match_date.slice(0, 10)))]
    .sort();

  // Para cada día, calcula la posición del usuario target
  const performanceData = matchDays.map(day => {
    const untilDate = day + "T23:59:59Z";
    const scores = (allUsers || []).map(u => ({
      user_id: u.id,
      pts: pointsUpTo(u.id, untilDate),
    }));
    scores.sort((a, b) => b.pts - a.pts);
    const pos = scores.findIndex(s => s.user_id === targetUserId) + 1;
    const myPts = scores.find(s => s.user_id === targetUserId)?.pts ?? 0;
    return { day, position: pos || scores.length, points: myPts, total: scores.length };
  });

  // Stats del usuario target
  const myPreds = predsByUser.get(targetUserId) || [];
  let exactos = 0, ganadores = 0, parciales = 0, sinAcierto = 0;
  for (const p of myPreds) {
    const m = matchMap.get(p.match_id);
    if (!m) continue;
    const pts = scorePrediction(p.pred_home, p.pred_away, m.home_score, m.away_score, rules);
    if (pts === (rules?.exact_result ?? 3)) exactos++;
    else if (pts === (rules?.correct_winner ?? 2) || pts === (rules?.correct_draw ?? 2)) ganadores++;
    else if (pts === 1) parciales++;
    else sinAcierto++;
  }

  const triviaCorrect = (allDaily || []).filter(d => d.user_id === targetUserId && d.is_correct).length;
  const triviaTotal = (allDaily || []).filter(d => d.user_id === targetUserId).length;
  const currentPoints = pointsUpTo(targetUserId, new Date().toISOString());
  const currentRank = (() => {
    const scores = (allUsers || []).map(u => ({ user_id: u.id, pts: pointsUpTo(u.id, new Date().toISOString()) }));
    scores.sort((a, b) => b.pts - a.pts);
    return scores.findIndex(s => s.user_id === targetUserId) + 1;
  })();

  return {
    profile: { id: profile.id, name: profile.name, avatar_url: profile.avatar_url || null },
    currentPoints,
    currentRank,
    totalUsers: (allUsers || []).length,
    stats: { exactos, ganadores, parciales, sinAcierto, triviaCorrect, triviaTotal, matchesPlayed: myPreds.length },
    performanceData,
  };
}
