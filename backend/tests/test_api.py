import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://purple-picks.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@pollabreve.com"
ADMIN_PWD = "Admin123!"


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
    email = f"test_{uuid.uuid4().hex[:8]}@pollabreve.com"
    r = s.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "Test1234"})
    assert r.status_code == 200, r.text
    s._email = email  # type: ignore
    return s


# ---- Health ----
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---- Auth ----
def test_register_and_me():
    s = _client()
    email = f"reg_{uuid.uuid4().hex[:8]}@pollabreve.com"
    r = s.post(f"{API}/auth/register", json={"name": "Reg User", "email": email, "password": "Reg12345"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == email
    assert body["role"] == "user"
    # cookie set
    assert "access_token" in s.cookies
    me = s.get(f"{API}/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_register_duplicate():
    s = _client()
    email = f"dup_{uuid.uuid4().hex[:8]}@pollabreve.com"
    s.post(f"{API}/auth/register", json={"name": "Dup", "email": email, "password": "Reg12345"})
    r = s.post(f"{API}/auth/register", json={"name": "Dup", "email": email, "password": "Reg12345"})
    assert r.status_code == 400


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": "nope@x.com", "password": "wrong"})
    assert r.status_code == 401


def test_login_admin(admin):
    r = admin.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_logout():
    s = _client()
    email = f"out_{uuid.uuid4().hex[:8]}@pollabreve.com"
    s.post(f"{API}/auth/register", json={"name": "O", "email": email, "password": "Reg12345"})
    r = s.post(f"{API}/auth/logout")
    assert r.status_code == 200
    s.cookies.clear()
    me = s.get(f"{API}/auth/me")
    assert me.status_code == 401


def test_me_unauth():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---- Matches ----
def test_list_matches():
    r = requests.get(f"{API}/matches")
    assert r.status_code == 200
    matches = r.json()
    assert len(matches) >= 5
    m = matches[0]
    for k in ("id", "equipo_local", "equipo_visitante", "logo_local", "logo_visitante", "fecha", "estado"):
        assert k in m


# ---- Predictions ----
def test_prediction_upsert(user):
    matches = requests.get(f"{API}/matches").json()
    pending = [m for m in matches if m["estado"] == "pendiente"]
    assert pending, "Need pending match"
    mid = pending[0]["id"]
    r = user.post(f"{API}/predictions", json={"match_id": mid, "goles_local": 2, "goles_visitante": 1})
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    # Update (upsert same match)
    r2 = user.post(f"{API}/predictions", json={"match_id": mid, "goles_local": 3, "goles_visitante": 0})
    assert r2.status_code == 200
    assert r2.json()["id"] == pid
    assert r2.json()["goles_local"] == 3

    me_preds = user.get(f"{API}/predictions/me").json()
    found = [p for p in me_preds if p["match_id"] == mid]
    assert found and found[0]["goles_local"] == 3


def test_prediction_unauth():
    matches = requests.get(f"{API}/matches").json()
    r = requests.post(f"{API}/predictions", json={"match_id": matches[0]["id"], "goles_local": 1, "goles_visitante": 1})
    assert r.status_code == 401


# ---- Admin protections ----
def test_set_result_requires_admin(user):
    matches = requests.get(f"{API}/matches").json()
    pending = [m for m in matches if m["estado"] == "pendiente"]
    if not pending:
        pytest.skip("No pending match")
    mid = pending[0]["id"]
    r = user.put(f"{API}/matches/{mid}/result", json={"goles_real_local": 1, "goles_real_visitante": 0})
    assert r.status_code == 403


def test_reopen_requires_admin(user):
    matches = requests.get(f"{API}/matches").json()
    mid = matches[0]["id"]
    r = user.put(f"{API}/matches/{mid}/reopen")
    assert r.status_code == 403


# ---- Score logic + ranking ----
def test_score_logic_and_ranking(admin):
    # Create a fresh user with known predictions
    s = _client()
    email = f"sc_{uuid.uuid4().hex[:8]}@pollabreve.com"
    r = s.post(f"{API}/auth/register", json={"name": "Score User", "email": email, "password": "Reg12345"})
    assert r.status_code == 200
    user_name = r.json()["name"]

    # Reopen all to start fresh
    matches = requests.get(f"{API}/matches").json()
    for m in matches:
        admin.put(f"{API}/matches/{m['id']}/reopen")

    matches = requests.get(f"{API}/matches").json()
    assert len(matches) >= 4
    m_exact, m_winner, m_partial, m_zero = matches[0], matches[1], matches[2], matches[3]

    # User predictions
    s.post(f"{API}/predictions", json={"match_id": m_exact["id"], "goles_local": 2, "goles_visitante": 1})
    s.post(f"{API}/predictions", json={"match_id": m_winner["id"], "goles_local": 3, "goles_visitante": 1})
    s.post(f"{API}/predictions", json={"match_id": m_partial["id"], "goles_local": 1, "goles_visitante": 5})
    s.post(f"{API}/predictions", json={"match_id": m_zero["id"], "goles_local": 0, "goles_visitante": 3})

    # Admin sets results
    r1 = admin.put(f"{API}/matches/{m_exact['id']}/result", json={"goles_real_local": 2, "goles_real_visitante": 1})
    assert r1.status_code == 200 and r1.json()["estado"] == "finalizado"
    admin.put(f"{API}/matches/{m_winner['id']}/result", json={"goles_real_local": 2, "goles_real_visitante": 0})  # winner +2
    admin.put(f"{API}/matches/{m_partial['id']}/result", json={"goles_real_local": 1, "goles_real_visitante": 0})  # partial: 1==1 left, signs differ
    admin.put(f"{API}/matches/{m_zero['id']}/result", json={"goles_real_local": 4, "goles_real_visitante": 0})  # 0

    # Cannot predict a finalized match
    r_block = s.post(f"{API}/predictions", json={"match_id": m_exact["id"], "goles_local": 9, "goles_visitante": 9})
    assert r_block.status_code == 400

    # Ranking
    rk = requests.get(f"{API}/ranking").json()
    row = next((r for r in rk if r["name"] == user_name), None)
    assert row is not None, f"User missing from ranking: {rk}"
    # Expected: 3 + 2 + 1 + 0 = 6
    assert row["points"] == 6, row
    assert row["exactos"] == 1
    assert row["ganadores"] == 1
    assert row["parciales"] == 1


def test_ranking_includes_admin(admin):
    """Per requirement v2: admin participates and must appear in ranking."""
    rk = requests.get(f"{API}/ranking").json()
    assert any(row["name"] == "Administrador" for row in rk), rk
