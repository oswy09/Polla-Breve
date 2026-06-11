from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# -------------------- DB --------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

# -------------------- App --------------------
app = FastAPI(title="Polla Breve API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("polla")


# -------------------- Auth helpers --------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none",
        max_age=7 * 24 * 3600, path="/",
    )

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    return user


# -------------------- Models --------------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    paid: bool = False

class AuthOut(BaseModel):
    user: UserOut
    token: str

class AdminUserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    paid: bool = False
    created_at: Optional[str] = None

class PaidIn(BaseModel):
    paid: bool

class MatchOut(BaseModel):
    id: str
    equipo_local: str
    equipo_visitante: str
    logo_local: str
    logo_visitante: str
    fecha: str
    estado: Literal["pendiente", "finalizado"]
    goles_real_local: Optional[int] = None
    goles_real_visitante: Optional[int] = None
    ronda: Optional[str] = None

class PredictionIn(BaseModel):
    match_id: str
    goles_local: int = Field(ge=0, le=20)
    goles_visitante: int = Field(ge=0, le=20)

class PredictionOut(BaseModel):
    id: str
    user_id: str
    match_id: str
    goles_local: int
    goles_visitante: int

class MatchResultIn(BaseModel):
    goles_real_local: int = Field(ge=0, le=20)
    goles_real_visitante: int = Field(ge=0, le=20)

class RankingRow(BaseModel):
    user_id: str
    name: str
    points: int
    exactos: int
    ganadores: int
    parciales: int


# -------------------- Auth endpoints --------------------
@api.post("/auth/register", response_model=AuthOut)
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "paid": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return AuthOut(
        user=UserOut(id=user_id, name=doc["name"], email=email, role="user", paid=False),
        token=token,
    )

@api.post("/auth/login", response_model=AuthOut)
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return AuthOut(
        user=UserOut(id=user["id"], name=user["name"], email=user["email"], role=user["role"], paid=user.get("paid", False)),
        token=token,
    )

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(id=user["id"], name=user["name"], email=user["email"], role=user["role"], paid=user.get("paid", False))


# -------------------- Matches --------------------
@api.get("/matches", response_model=List[MatchOut])
async def list_matches():
    matches = await db.matches.find({}, {"_id": 0}).sort("fecha", 1).to_list(100)
    return matches

@api.put("/matches/{match_id}/result", response_model=MatchOut)
async def set_match_result(match_id: str, payload: MatchResultIn, _: dict = Depends(require_admin)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    update = {
        "goles_real_local": payload.goles_real_local,
        "goles_real_visitante": payload.goles_real_visitante,
        "estado": "finalizado",
    }
    await db.matches.update_one({"id": match_id}, {"$set": update})
    match.update(update)
    return match

@api.put("/matches/{match_id}/reopen", response_model=MatchOut)
async def reopen_match(match_id: str, _: dict = Depends(require_admin)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    update = {"estado": "pendiente", "goles_real_local": None, "goles_real_visitante": None}
    await db.matches.update_one({"id": match_id}, {"$set": update})
    match.update(update)
    return match


# -------------------- Predictions --------------------
@api.post("/predictions", response_model=PredictionOut)
async def upsert_prediction(payload: PredictionIn, user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({"id": payload.match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    if match["estado"] == "finalizado":
        raise HTTPException(status_code=400, detail="El partido ya finalizó")
    existing = await db.predictions.find_one(
        {"user_id": user["id"], "match_id": payload.match_id}, {"_id": 0}
    )
    if existing:
        await db.predictions.update_one(
            {"id": existing["id"]},
            {"$set": {
                "goles_local": payload.goles_local,
                "goles_visitante": payload.goles_visitante,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        existing.update({
            "goles_local": payload.goles_local,
            "goles_visitante": payload.goles_visitante,
        })
        return PredictionOut(**{k: existing[k] for k in ("id", "user_id", "match_id", "goles_local", "goles_visitante")})
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "match_id": payload.match_id,
        "goles_local": payload.goles_local,
        "goles_visitante": payload.goles_visitante,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.predictions.insert_one(doc)
    return PredictionOut(**{k: doc[k] for k in ("id", "user_id", "match_id", "goles_local", "goles_visitante")})

@api.get("/predictions/me", response_model=List[PredictionOut])
async def my_predictions(user: dict = Depends(get_current_user)):
    items = await db.predictions.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return [PredictionOut(**{k: x[k] for k in ("id", "user_id", "match_id", "goles_local", "goles_visitante")}) for x in items]


# -------------------- Ranking --------------------
def _score(pred_l: int, pred_v: int, real_l: int, real_v: int) -> int:
    """3: exacto | 2: ganador correcto | 1: acierta goles de un equipo | 0"""
    if pred_l == real_l and pred_v == real_v:
        return 3
    def sign(a, b):
        return 0 if a == b else (1 if a > b else -1)
    if sign(pred_l, pred_v) == sign(real_l, real_v):
        return 2
    if pred_l == real_l or pred_v == real_v:
        return 1
    return 0

@api.get("/ranking", response_model=List[RankingRow])
async def ranking():
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    finalized = await db.matches.find({"estado": "finalizado"}, {"_id": 0}).to_list(200)
    finalized_map = {m["id"]: m for m in finalized}
    rows: List[RankingRow] = []
    for u in users:
        preds = await db.predictions.find({"user_id": u["id"]}, {"_id": 0}).to_list(200)
        pts = exactos = ganadores = parciales = 0
        for p in preds:
            m = finalized_map.get(p["match_id"])
            if not m:
                continue
            s = _score(p["goles_local"], p["goles_visitante"], m["goles_real_local"], m["goles_real_visitante"])
            pts += s
            if s == 3: exactos += 1
            elif s == 2: ganadores += 1
            elif s == 1: parciales += 1
        rows.append(RankingRow(user_id=u["id"], name=u["name"], points=pts, exactos=exactos, ganadores=ganadores, parciales=parciales))
    rows.sort(key=lambda r: (-r.points, -r.exactos, -r.ganadores, r.name.lower()))
    return rows


# -------------------- Results & Leaderboard --------------------
class ResultRow(BaseModel):
    match: MatchOut
    my_prediction: Optional[PredictionOut] = None
    my_points: Optional[int] = None

class MatchLeaderRow(BaseModel):
    user_id: str
    name: str
    goles_local: int
    goles_visitante: int
    points: int

class StatsOut(BaseModel):
    participants: int
    total_collected_cop: int
    entry_fee_cop: int
    prize_first_cop: int
    prize_second_cop: int
    prize_third_cop: int
    prize_first_pct: int = 70
    prize_second_pct: int = 20
    prize_third_pct: int = 10

ENTRY_FEE_COP = 30000
PRIZE_PCT = (70, 20, 10)

@api.get("/results", response_model=List[ResultRow])
async def my_results(user: dict = Depends(get_current_user)):
    finalized = await db.matches.find({"estado": "finalizado"}, {"_id": 0}).sort("fecha", 1).to_list(200)
    rows: List[ResultRow] = []
    for m in finalized:
        pred = await db.predictions.find_one(
            {"user_id": user["id"], "match_id": m["id"]}, {"_id": 0}
        )
        my_pred_out = None
        my_points = None
        if pred:
            my_points = _score(pred["goles_local"], pred["goles_visitante"], m["goles_real_local"], m["goles_real_visitante"])
            my_pred_out = PredictionOut(**{k: pred[k] for k in ("id", "user_id", "match_id", "goles_local", "goles_visitante")})
        rows.append(ResultRow(match=MatchOut(**m), my_prediction=my_pred_out, my_points=my_points))
    return rows

@api.get("/matches/{match_id}/leaderboard", response_model=List[MatchLeaderRow])
async def match_leaderboard(match_id: str, limit: int = 5, user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    if match["estado"] != "finalizado":
        return []
    preds = await db.predictions.find({"match_id": match_id}, {"_id": 0}).to_list(1000)
    user_ids = list({p["user_id"] for p in preds})
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "role": 1}).to_list(1000)
    name_map = {u["id"]: u["name"] for u in users}
    rows: List[MatchLeaderRow] = []
    for p in preds:
        if p["user_id"] not in name_map:
            continue
        pts = _score(p["goles_local"], p["goles_visitante"], match["goles_real_local"], match["goles_real_visitante"])
        rows.append(MatchLeaderRow(
            user_id=p["user_id"], name=name_map[p["user_id"]],
            goles_local=p["goles_local"], goles_visitante=p["goles_visitante"], points=pts,
        ))
    rows.sort(key=lambda r: (-r.points, r.name.lower()))
    return rows[: max(1, min(limit, 20))]

@api.get("/stats", response_model=StatsOut)
async def stats():
    participants = await db.users.count_documents({"paid": True})
    total = participants * ENTRY_FEE_COP
    return StatsOut(
        participants=participants,
        total_collected_cop=total,
        entry_fee_cop=ENTRY_FEE_COP,
        prize_first_cop=total * PRIZE_PCT[0] // 100,
        prize_second_cop=total * PRIZE_PCT[1] // 100,
        prize_third_cop=total * PRIZE_PCT[2] // 100,
        prize_first_pct=PRIZE_PCT[0],
        prize_second_pct=PRIZE_PCT[1],
        prize_third_pct=PRIZE_PCT[2],
    )


# -------------------- Admin: Users --------------------
@api.get("/admin/users", response_model=List[AdminUserOut])
async def admin_list_users(_: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", 1).to_list(2000)
    return [AdminUserOut(
        id=u["id"], name=u["name"], email=u["email"], role=u["role"],
        paid=u.get("paid", False), created_at=u.get("created_at"),
    ) for u in users]

@api.put("/admin/users/{user_id}/paid", response_model=AdminUserOut)
async def admin_set_paid(user_id: str, payload: PaidIn, _: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await db.users.update_one({"id": user_id}, {"$set": {"paid": payload.paid}})
    u["paid"] = payload.paid
    return AdminUserOut(
        id=u["id"], name=u["name"], email=u["email"], role=u["role"],
        paid=u.get("paid", False), created_at=u.get("created_at"),
    )

@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current: dict = Depends(require_admin)):
    if user_id == current["id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await db.predictions.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


# -------------------- Health --------------------
@api.get("/")
async def root():
    return {"name": "Polla Breve API", "ok": True}


# -------------------- Seed --------------------
SEED_VERSION = "2026-ucl-knockout-v2"
LOGO_PSG = "https://a.espncdn.com/i/teamlogos/soccer/500/160.png"
LOGO_BAY = "https://a.espncdn.com/i/teamlogos/soccer/500/132.png"
LOGO_ATM = "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png"
LOGO_ARS = "https://a.espncdn.com/i/teamlogos/soccer/500/359.png"
LOGO_UCL = "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png"

# Real Champions League 2025-26 fixtures (knockout: SF + Final)
SEED_MATCHES = [
    {
        "equipo_local": "Paris Saint-Germain", "equipo_visitante": "Bayern Munich",
        "logo_local": LOGO_PSG, "logo_visitante": LOGO_BAY,
        "fecha": "2026-04-28T19:00:00+00:00",
        "ronda": "Semifinal · Ida",
    },
    {
        "equipo_local": "Atlético Madrid", "equipo_visitante": "Arsenal",
        "logo_local": LOGO_ATM, "logo_visitante": LOGO_ARS,
        "fecha": "2026-04-29T19:00:00+00:00",
        "ronda": "Semifinal · Ida",
    },
    {
        "equipo_local": "Bayern Munich", "equipo_visitante": "Paris Saint-Germain",
        "logo_local": LOGO_BAY, "logo_visitante": LOGO_PSG,
        "fecha": "2026-05-05T19:00:00+00:00",
        "ronda": "Semifinal · Vuelta",
    },
    {
        "equipo_local": "Arsenal", "equipo_visitante": "Atlético Madrid",
        "logo_local": LOGO_ARS, "logo_visitante": LOGO_ATM,
        "fecha": "2026-05-06T19:00:00+00:00",
        "ronda": "Semifinal · Vuelta",
    },
    {
        "equipo_local": "Finalista 1", "equipo_visitante": "Finalista 2",
        "logo_local": LOGO_UCL, "logo_visitante": LOGO_UCL,
        "fecha": "2026-05-30T16:00:00+00:00",
        "ronda": "Final · Puskás Aréna, Budapest",
    },
]

async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@pollabreve.com").lower()
    pwd = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Administrador",
            "email": email,
            "password_hash": hash_password(pwd),
            "role": "admin",
            "paid": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin sembrado: {email}")
    else:
        updates = {}
        if not verify_password(pwd, existing["password_hash"]):
            updates["password_hash"] = hash_password(pwd)
        if "paid" not in existing:
            updates["paid"] = True
        if updates:
            await db.users.update_one({"email": email}, {"$set": updates})

async def seed_matches():
    meta = await db.app_meta.find_one({"key": "seed_version"}, {"_id": 0})
    if meta and meta.get("value") == SEED_VERSION:
        return
    # Migration: drop old seeded matches and their predictions, then reseed
    old_matches = await db.matches.find({}, {"_id": 0, "id": 1}).to_list(500)
    old_ids = [m["id"] for m in old_matches]
    if old_ids:
        await db.predictions.delete_many({"match_id": {"$in": old_ids}})
        await db.matches.delete_many({"id": {"$in": old_ids}})
    for m in SEED_MATCHES:
        await db.matches.insert_one({
            "id": str(uuid.uuid4()),
            **m,
            "estado": "pendiente",
            "goles_real_local": None,
            "goles_real_visitante": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    await db.app_meta.update_one(
        {"key": "seed_version"},
        {"$set": {"key": "seed_version", "value": SEED_VERSION}},
        upsert=True,
    )
    logger.info(f"Partidos sembrados (version={SEED_VERSION})")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.matches.create_index("id", unique=True)
    await db.predictions.create_index([("user_id", 1), ("match_id", 1)], unique=True)
    await seed_admin()
    await seed_matches()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# Mount router & CORS
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
