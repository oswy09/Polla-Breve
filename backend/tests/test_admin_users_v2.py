"""v2 tests: admin user management (paid toggle, delete), stats with paid count, ESPN logos, /auth/me paid field."""
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


@pytest.fixture
def fresh_user():
    s = _client()
    email = f"v2_{uuid.uuid4().hex[:8]}@pollabreve.com"
    r = s.post(f"{API}/auth/register", json={"name": "V2 User", "email": email, "password": "Test1234"})
    assert r.status_code == 200, r.text
    s._email = email  # type: ignore
    me = s.get(f"{API}/auth/me").json()
    s._id = me["id"]  # type: ignore
    return s


# ---- /auth/me returns paid field ----
def test_auth_me_admin_has_paid_true(admin):
    r = admin.get(f"{API}/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "admin"
    assert body["paid"] is True


def test_auth_me_new_user_has_paid_false(fresh_user):
    r = fresh_user.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["paid"] is False


# ---- Admin user list ----
def test_admin_list_users_requires_admin(fresh_user):
    r = fresh_user.get(f"{API}/admin/users")
    assert r.status_code == 403


def test_admin_list_users_unauth():
    r = requests.get(f"{API}/admin/users")
    assert r.status_code == 401


def test_admin_list_users_includes_admin(admin):
    r = admin.get(f"{API}/admin/users")
    assert r.status_code == 200
    users = r.json()
    assert len(users) >= 1
    a = next((u for u in users if u["role"] == "admin"), None)
    assert a is not None, "Admin missing from list"
    assert a["paid"] is True
    # required fields
    for u in users:
        for k in ("id", "name", "email", "role", "paid"):
            assert k in u


# ---- Toggle paid ----
def test_admin_toggle_paid(admin, fresh_user):
    uid = fresh_user._id  # type: ignore
    # Initially false
    r0 = admin.put(f"{API}/admin/users/{uid}/paid", json={"paid": True})
    assert r0.status_code == 200, r0.text
    assert r0.json()["paid"] is True

    me = fresh_user.get(f"{API}/auth/me").json()
    assert me["paid"] is True

    # Flip back
    r1 = admin.put(f"{API}/admin/users/{uid}/paid", json={"paid": False})
    assert r1.status_code == 200
    assert r1.json()["paid"] is False


def test_set_paid_requires_admin(fresh_user):
    r = fresh_user.put(f"{API}/admin/users/{fresh_user._id}/paid", json={"paid": True})  # type: ignore
    assert r.status_code == 403


def test_set_paid_unknown_user(admin):
    r = admin.put(f"{API}/admin/users/{uuid.uuid4()}/paid", json={"paid": True})
    assert r.status_code == 404


# ---- Stats reflect paid-only ----
def test_stats_increments_when_user_marked_paid(admin):
    before = requests.get(f"{API}/stats").json()["participants"]

    # Create new user paid=False
    s = _client()
    email = f"pay_{uuid.uuid4().hex[:8]}@pollabreve.com"
    r = s.post(f"{API}/auth/register", json={"name": "Pay User", "email": email, "password": "Test1234"})
    assert r.status_code == 200
    uid = s.get(f"{API}/auth/me").json()["id"]

    mid = requests.get(f"{API}/stats").json()["participants"]
    assert mid == before, "Unpaid user must NOT increment participants"

    # Mark paid
    admin.put(f"{API}/admin/users/{uid}/paid", json={"paid": True})
    after = requests.get(f"{API}/stats").json()
    assert after["participants"] == before + 1
    assert after["total_collected_cop"] == after["participants"] * ENTRY_FEE_COP
    # Prize math
    assert after["prize_first_cop"] == after["total_collected_cop"] * 70 // 100
    assert after["prize_second_cop"] == after["total_collected_cop"] * 20 // 100
    assert after["prize_third_cop"] == after["total_collected_cop"] * 10 // 100

    # cleanup
    admin.delete(f"{API}/admin/users/{uid}")


# ---- Delete user ----
def test_admin_delete_user_and_predictions(admin):
    # Create user
    s = _client()
    email = f"del_{uuid.uuid4().hex[:8]}@pollabreve.com"
    s.post(f"{API}/auth/register", json={"name": "Del User", "email": email, "password": "Test1234"})
    uid = s.get(f"{API}/auth/me").json()["id"]

    # Make a prediction
    matches = requests.get(f"{API}/matches").json()
    pending = next((m for m in matches if m["estado"] == "pendiente"), None)
    if pending:
        pr = s.post(f"{API}/predictions", json={"match_id": pending["id"], "goles_local": 1, "goles_visitante": 0})
        assert pr.status_code == 200

    # Delete
    r = admin.delete(f"{API}/admin/users/{uid}")
    assert r.status_code == 200, r.text

    # Verify gone in admin list
    users = admin.get(f"{API}/admin/users").json()
    assert all(u["id"] != uid for u in users)


def test_admin_cannot_delete_self(admin):
    me = admin.get(f"{API}/auth/me").json()
    r = admin.delete(f"{API}/admin/users/{me['id']}")
    assert r.status_code == 400


def test_delete_user_requires_admin(fresh_user):
    r = fresh_user.delete(f"{API}/admin/users/{fresh_user._id}")  # type: ignore
    assert r.status_code == 403


def test_delete_unknown_user(admin):
    r = admin.delete(f"{API}/admin/users/{uuid.uuid4()}")
    assert r.status_code == 404


# ---- Logos via ESPN CDN ----
def test_match_logos_use_espn_cdn():
    matches = requests.get(f"{API}/matches").json()
    assert matches
    for m in matches:
        for k in ("logo_local", "logo_visitante"):
            url = m[k]
            assert "a.espncdn.com" in url, f"Logo not on ESPN CDN: {url}"
            # Sanity: HEAD must respond ok (no wikipedia 404)
    # Hit one logo via HTTP HEAD/GET to verify reachable
    sample = matches[0]["logo_local"]
    h = requests.get(sample, timeout=10)
    assert h.status_code == 200, f"Logo not reachable {sample}: {h.status_code}"


def test_atletico_madrid_logo_present():
    matches = requests.get(f"{API}/matches").json()
    atm = [m for m in matches if "Atlético" in m["equipo_local"] or "Atlético" in m["equipo_visitante"]]
    assert atm, "No Atlético Madrid match found"
    for m in atm:
        if "Atlético" in m["equipo_local"]:
            assert "espncdn.com" in m["logo_local"]
        if "Atlético" in m["equipo_visitante"]:
            assert "espncdn.com" in m["logo_visitante"]


# ---- Ranking now includes admin ----
def test_ranking_includes_admin():
    rk = requests.get(f"{API}/ranking").json()
    assert any(row["name"] == "Administrador" for row in rk), "Admin must be in ranking per v2"
