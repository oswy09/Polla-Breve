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
    .select("id, name, email, role, paid, active, created_at")
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

  if (!matchErr && firstMatch) {
    const start = new Date(firstMatch.match_date);
    if (new Date() >= start) {
      throw httpError(400, "El torneo ya comenzó, no puedes cambiar tus predicciones bonus");
    }
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
    .select("id, name, role, paid, active")
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
      .in("match_id", matchIds);
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

    return { user_id: user.id, name: user.name, points, exactos, ganadores };
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

  return rows.slice(0, typeof limit === "number" ? limit : 5);
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
  const activeDatesSet = new Set();
  for (const m of allMatches) {
    const dStr = getLocalDateStr(m.match_date);
    const list = matchesByDate.get(dStr) || [];
    list.push(m);
    matchesByDate.set(dStr, list);
    
    const isStarted = m.status === "finalized" || 
                      m.predictions_locked === true || 
                      (m.home_score !== null && m.away_score !== null) ||
                      new Date(m.match_date) <= new Date();
    if (isStarted) {
      activeDatesSet.add(dStr);
    }
  }

  const activeDates = Array.from(activeDatesSet).sort();
  let activeDate = null;
  let dateLabel = "";

  if (activeDates.includes(todayStr)) {
    activeDate = todayStr;
    dateLabel = "hoy";
  } else if (activeDates.length > 0) {
    // Find the latest active date before or equal to today
    const pastActiveDates = activeDates.filter(d => d <= todayStr);
    if (pastActiveDates.length > 0) {
      activeDate = pastActiveDates[pastActiveDates.length - 1];
      dateLabel = "ayer";
    } else {
      // If all active dates are in the future (e.g. testing), take the first one
      activeDate = activeDates[0];
      dateLabel = "ayer";
    }
  } else {
    // No matches have started/scored yet. Use normal schedule fallback.
    const todayMatches = matchesByDate.get(todayStr) || [];
    if (todayMatches.length > 0) {
      activeDate = todayStr;
      dateLabel = "hoy";
    } else {
      const yesterdayMatches = matchesByDate.get(yesterdayStr) || [];
      if (yesterdayMatches.length > 0) {
        activeDate = yesterdayStr;
        dateLabel = "ayer";
      } else {
        const datesWithMatches = Array.from(matchesByDate.keys())
          .filter(d => d < todayStr)
          .sort((a, b) => b.localeCompare(a));
        if (datesWithMatches.length > 0) {
          activeDate = datesWithMatches[0];
          dateLabel = "ayer";
        }
      }
    }
  }

  if (!activeDate) return null;

  const targetMatches = matchesByDate.get(activeDate) || [];
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
    dateLabel,
    dateStr: activeDate,
    user: hero.user,
    points: hero.points,
    exactos: hero.exactos,
    predictions: hero.predictions
  };
}

async function getStats() {
  const [{ count: enrolled, error: e1 }, { count: paid, error: e2 }] = await Promise.all([
    supabase.from("public_profiles").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("public_profiles").select("id", { count: "exact", head: true }).eq("active", true).eq("paid", true),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const participants = enrolled || 0;
  const paidCount = paid || 0;
  const total = paidCount * ENTRY_FEE_COP;
  return {
    participants,
    paid_participants: paidCount,
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
  const { data, error } = await supabase
    .from("matches")
    .update({ home_score: payload.home_score, away_score: payload.away_score })
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
    .select("id, user_id, match_id, pred_home, pred_away, points_earned");
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

function parseRequestPath(path) {
  const parsed = new URL(path, "https://local.app");
  return { pathname: parsed.pathname, searchParams: parsed.searchParams };
}

export const api = {
  async get(path) {
    const { pathname, searchParams } = parseRequestPath(path);

    if (pathname === "/matches")         return { data: await listMatches() };
    if (pathname === "/predictions/me") {
      const user = await getCurrentProfile({ requireAuth: true });
      return { data: await listPredictionsForUser(user.id) };
    }
    if (pathname === "/ranking")         return { data: await computeRanking() };
    if (pathname === "/ranking/daily-hero") return { data: await getDailyHero() };
    if (pathname === "/results")         return { data: await getResults() };
    if (pathname === "/stats")           return { data: await getStats() };
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

    throw httpError(404, `Ruta no implementada: GET ${pathname}`);
  },

  async post(path, payload) {
    const { pathname } = parseRequestPath(path);
    if (pathname === "/predictions")       return { data: await upsertPrediction(payload) };
    if (pathname === "/admin/predictions") return { data: await upsertPredictionByAdmin(payload) };
    if (pathname === "/chat/messages")     return { data: await sendChatMessage(payload) };
    if (pathname === "/bonus")             return { data: await upsertBonus(payload) };
    if (pathname === "/daily-trivia/answer") return { data: await answerDailyQuestion(payload) };
    if (pathname === "/daily-trivia/reset") return { data: await resetDailyQuestion() };
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

    const lockRoute = pathname.match(/^\/matches\/([^/]+)\/lock$/);
    if (lockRoute)  return { data: await lockMatchPredictions(lockRoute[1], Boolean(payload?.locked)) };

    const paidRoute = pathname.match(/^\/admin\/users\/([^/]+)\/paid$/);
    if (paidRoute)  return { data: await setPaid(paidRoute[1], Boolean(payload?.paid)) };

    throw httpError(404, `Ruta no implementada: PUT ${pathname}`);
  },

  async delete(path) {
    const { pathname } = parseRequestPath(path);
    const userRoute = pathname.match(/^\/admin\/users\/([^/]+)$/);
    if (userRoute) return { data: await softDeleteUser(userRoute[1]) };
    throw httpError(404, `Ruta no implementada: DELETE ${pathname}`);
  },
};

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
    });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY TRIVIA LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function getDailyQuestionIndex(userId, dateStr, totalQuestions = 30) {
  const str = userId + dateStr;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % totalQuestions) + 1;
}

function getUtcDateStrWithOffset(dayOffset = 0) {
  const now = new Date();
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
  const dateStr = getUtcDateStrWithOffset(Number(testDayOffset) || 0);
  
  const baseId = getDailyQuestionIndex(user.id, dateStr, 30);
  const questionId = ((baseId - 1 + testOffset) % 30) + 1;
  
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
      .select("correct_index")
      .eq("id", questionId)
      .single();
      
    return {
      answered: true,
      question: {
        id: q.id,
        question: q.question,
        options: q.options,
        correct_index: fullQ?.correct_index
      },
      selected_index: resp.selected_index,
      is_correct: resp.is_correct
    };
  }
  
  return {
    answered: false,
    question: {
      id: q.id,
      question: q.question,
      options: q.options
    }
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

  const dateStr = getUtcDateStrWithOffset(dayOffset);

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

  const isCorrect = q.correct_index === selectedIndex;
  
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

async function resetDailyQuestion() {
  const user = await getCurrentProfile({ requireAuth: true });
  
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  
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
  await getCurrentProfile({ requireAuth: true });

  const { data: questions, error: qErr } = await supabase
    .from("trivia_questions")
    .select("id, question, options, correct_index")
    .order("id", { ascending: true });
  if (qErr) throw qErr;

  const { data: responses, error: rErr } = await supabase
    .from("daily_responses")
    .select("question_id, selected_index, is_correct, answered_date")
    .eq("user_id", targetUserId);
  if (rErr) throw rErr;

  const respMap = new Map(responses.map((r) => [r.question_id, r]));
  const todayStr = getUtcDateStrWithOffset(0);

  return questions
    .map((q) => {
      const resp = respMap.get(q.id);
      if (!resp) return null;
      
      const isToday = resp.answered_date === todayStr;
      return {
        question_id: q.id,
        question: q.question,
        options: q.options,
        correct_option: q.options[q.correct_index],
        answered: true,
        is_correct: isToday ? null : resp.is_correct,
        selected_option: isToday ? "Oculto hoy" : q.options[resp.selected_index],
        answered_date: resp.answered_date,
        is_today: isToday
      };
    })
    .filter(Boolean);
}
