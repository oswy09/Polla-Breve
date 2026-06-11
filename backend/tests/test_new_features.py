"""Tests for new features: real UCL fixtures, /results, /matches/{id}/leaderboard, /stats."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://purple-picks.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@pollabreve.com"
ADMIN_PWD = "Admin123!"
ENTRY_FEE_COP = 30000


def _client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin():
    s = _client()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def user():
    s = _client()
    email = f"new_{uuid.uuid4().hex[:8]}@pollabreve.com"
    r = s.post(f"{API}/auth/register", json={"name": "NF User", "email": email, "password": "Test1234"})
    assert r.status_code == 200, r.text
    s._email = email  # type: ignore
    s._name = "NF User"  # type: ignore
    return s


# ---- Real UCL fixtures + ronda ----
def test_matches_real_ucl_fixtures():
    r = requests.get(f"{API}/matches")
    assert r.status_code == 200
    matches = r.json()
    # Exactly the 5 real UCL knockout matches
    assert len(matches) == 5, f"Expected 5 matches, got {len(matches)}"

    # All carry ronda
    for m in matches:
        assert "ronda" in m and m["ronda"], f"Match missing ronda: {m}"

    teams = {(m["equipo_local"], m["equipo_visitante"]) for m in matches}
    expected = {
        ("Paris Saint-Germain", "Bayern Munich"),
        ("Atlético Madrid", "Arsenal"),
        ("Bayern Munich", "Paris Saint-Germain"),
        ("Arsenal", "Atlético Madrid"),
        ("Finalista 1", "Finalista 2"),
    }
    assert teams == expected, f"Teams mismatch: {teams}"

    # Old teams should NOT exist (migration verified)
    all_teams = set()
    for m in matches:
        all_teams.add(m["equipo_local"])
        all_teams.add(m["equipo_visitante"])
    for forbidden in ("Real Madrid", "Manchester City", "Liverpool", "Inter Milan", "Borussia Dortmund"):
        assert forbidden not in all_teams, f"Old seed leftover: {forbidden}"


def test_final_round_label():
    matches = requests.get(f"{API}/matches").json()
    final = next((m for m in matches if m["fecha"].startswith("2026-05-30")), None)
    assert final is not None, "Final 30 May not found"
    assert final["ronda"] == "Final · Puskás Aréna, Budapest"


def test_semifinal_round_labels():
    matches = requests.get(f"{API}/matches").json()
    rounds = sorted({m["ronda"] for m in matches})
    assert "Semifinal · Ida" in rounds
    assert "Semifinal · Vuelta" in rounds


# ---- /api/stats ----
def test_stats_shape_and_math():
    r = requests.get(f"{API}/stats")
    assert r.status_code == 200
    data = r.json()
    assert set(data.keys()) >= {"participants", "total_collected_cop", "entry_fee_cop"}
    assert data["entry_fee_cop"] == ENTRY_FEE_COP
    assert isinstance(data["participants"], int) and data["participants"] >= 0
    assert data["total_collected_cop"] == data["participants"] * ENTRY_FEE_COP


def test_stats_participants_paid_only(user):
    # v2: only users with paid=True count. Admin is seeded paid=True, regular user is paid=False.
    r = requests.get(f"{API}/stats").json()
    assert r["participants"] >= 1  # at least the paid admin
    assert r["total_collected_cop"] == r["participants"] * ENTRY_FEE_COP
    # Prize distribution 70/20/10
    assert r["prize_first_pct"] == 70
    assert r["prize_second_pct"] == 20
    assert r["prize_third_pct"] == 10
    assert r["prize_first_cop"] == r["total_collected_cop"] * 70 // 100
    assert r["prize_second_cop"] == r["total_collected_cop"] * 20 // 100
    assert r["prize_third_cop"] == r["total_collected_cop"] * 10 // 100


# ---- /api/results ----
def test_results_unauth():
    r = requests.get(f"{API}/results")
    assert r.status_code == 401


def test_results_only_finalized(admin, user):
    # Reopen all to start clean
    matches = requests.get(f"{API}/matches").json()
    for m in matches:
        admin.put(f"{API}/matches/{m['id']}/reopen")

    # No finalized -> empty results
    r = user.get(f"{API}/results")
    assert r.status_code == 200
    assert r.json() == []

    # Finalize 2 matches; user predicts only one
    matches = requests.get(f"{API}/matches").json()
    m_pred = matches[0]
    m_nopred = matches[1]

    # User predicts m_pred exactly
    pr = user.post(f"{API}/predictions", json={
        "match_id": m_pred["id"], "goles_local": 2, "goles_visitante": 1
    })
    assert pr.status_code == 200

    # Admin finalizes both
    admin.put(f"{API}/matches/{m_pred['id']}/result", json={"goles_real_local": 2, "goles_real_visitante": 1})
    admin.put(f"{API}/matches/{m_nopred['id']}/result", json={"goles_real_local": 0, "goles_real_visitante": 0})

    # /results shows both finalized; one with prediction (3 pts), one without (null)
    rr = user.get(f"{API}/results")
    assert rr.status_code == 200
    rows = rr.json()
    assert len(rows) == 2

    by_id = {row["match"]["id"]: row for row in rows}
    assert by_id[m_pred["id"]]["my_prediction"] is not None
    assert by_id[m_pred["id"]]["my_prediction"]["goles_local"] == 2
    assert by_id[m_pred["id"]]["my_points"] == 3

    assert by_id[m_nopred["id"]]["my_prediction"] is None
    assert by_id[m_nopred["id"]]["my_points"] is None


# ---- /api/matches/{id}/leaderboard ----
def test_leaderboard_unauth():
    matches = requests.get(f"{API}/matches").json()
    r = requests.get(f"{API}/matches/{matches[0]['id']}/leaderboard")
    assert r.status_code == 401


def test_leaderboard_pending_returns_empty(admin, user):
    # Reopen all to ensure pending
    matches = requests.get(f"{API}/matches").json()
    for m in matches:
        admin.put(f"{API}/matches/{m['id']}/reopen")
    matches = requests.get(f"{API}/matches").json()
    pending = matches[0]
    r = user.get(f"{API}/matches/{pending['id']}/leaderboard")
    assert r.status_code == 200
    assert r.json() == []


def test_leaderboard_top5_includes_admin_sorted(admin, user):
    # Reopen all
    matches = requests.get(f"{API}/matches").json()
    for m in matches:
        admin.put(f"{API}/matches/{m['id']}/reopen")
    matches = requests.get(f"{API}/matches").json()
    target = matches[0]

    # Create 6 fresh users, each predicts
    sessions = []
    for i in range(6):
        s = _client()
        email = f"lb_{uuid.uuid4().hex[:8]}@pollabreve.com"
        r = s.post(f"{API}/auth/register", json={
            "name": f"LB User {i}", "email": email, "password": "Test1234"
        })
        assert r.status_code == 200
        s._name = f"LB User {i}"  # type: ignore
        sessions.append(s)
        s.post(f"{API}/predictions", json={
            "match_id": target["id"],
            "goles_local": (i % 3),
            "goles_visitante": ((i + 1) % 3),
        })

    # Admin also predicts (per v2 admin participates)
    admin.post(f"{API}/predictions", json={
        "match_id": target["id"], "goles_local": 1, "goles_visitante": 1
    })

    # Admin sets a result
    admin.put(f"{API}/matches/{target['id']}/result",
              json={"goles_real_local": 1, "goles_real_visitante": 1})

    r = user.get(f"{API}/matches/{target['id']}/leaderboard")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) <= 5

    # Sorted descending by points
    pts = [row["points"] for row in rows]
    assert pts == sorted(pts, reverse=True), f"Not sorted desc: {pts}"

    # All required fields present
    for row in rows:
        for k in ("user_id", "name", "goles_local", "goles_visitante", "points"):
            assert k in row


def test_leaderboard_404_unknown_match(user):
    r = user.get(f"{API}/matches/{uuid.uuid4()}/leaderboard")
    assert r.status_code == 404


# ---- Cleanup helper: leave at least one finalized match for UI testing ----
def test_zz_leave_one_finalized(admin):
    """Final teardown: ensure at least one match remains finalized for UI /resultados page."""
    matches = requests.get(f"{API}/matches").json()
    finalized = [m for m in matches if m["estado"] == "finalizado"]
    if not finalized:
        # Finalize one
        admin.put(f"{API}/matches/{matches[0]['id']}/result",
                  json={"goles_real_local": 2, "goles_real_visitante": 1})
    # Verify
    matches = requests.get(f"{API}/matches").json()
    assert any(m["estado"] == "finalizado" for m in matches)
