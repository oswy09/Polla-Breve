import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL) {
  console.error("Missing SUPABASE_URL (or REACT_APP_SUPABASE_URL)");
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const users = [
  { fullName: "William Morales", username: "wmorales", email: "wmorales@breve.com", password: "William.M2026*" },
  { fullName: "Wilmar Alba", username: "walba", email: "walba@breve.com", password: "Wilmar.A2026*" },
  { fullName: "Alberto Giraldo", username: "agiraldo", email: "agiraldo@breve.com", password: "Alberto.G2026*" },
  { fullName: "Julian Chacon", username: "jchacon", email: "jchacon@breve.com", password: "Julian.C2026*" },
  { fullName: "Nicolas Beltran", username: "nbeltran", email: "nbeltran@breve.com", password: "Nicolas.B2026*" },
  { fullName: "Luis Chacon", username: "lchacon", email: "lchacon@breve.com", password: "Luis.C2026*" },
  { fullName: "Santiago Tovar", username: "stovar", email: "stovar@breve.com", password: "Santiago.T2026*" },
  { fullName: "Julian Tellez", username: "jtellez", email: "jtellez@breve.com", password: "Julian.T2026*" },
  { fullName: "Ivan Chacon", username: "ichacon", email: "ichacon@breve.com", password: "Ivan.C2026*" },
  { fullName: "Jorge Luengas", username: "jluengas", email: "jluengas@breve.com", password: "Jorge.L2026*" },
  { fullName: "Daniel Luengas", username: "dluengas", email: "dluengas@breve.com", password: "Daniel.L2026*" },
  { fullName: "Andres Gordillo", username: "agordillo", email: "agordillo@breve.com", password: "Andres.G2026*" },
  { fullName: "Alexander Rincon", username: "arincon", email: "arincon@breve.com", password: "Alexander.R2026*" },
];

async function upsertUser(user, existingByEmail) {
  const exists = existingByEmail.get(user.email.toLowerCase());

  if (exists) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(exists.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.fullName,
        username: user.username,
      },
    });

    if (updateError) {
      throw new Error(`Update failed for ${user.email}: ${updateError.message}`);
    }

    return { action: "updated", email: user.email };
  }

  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      name: user.fullName,
      username: user.username,
    },
  });

  if (createError) {
    throw new Error(`Create failed for ${user.email}: ${createError.message}`);
  }

  return { action: "created", email: user.email };
}

async function run() {
  const { data: existingData, error: existingError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (existingError) {
    throw new Error(`Cannot list users: ${existingError.message}`);
  }

  const existingByEmail = new Map(
    (existingData?.users || []).map((u) => [u.email?.toLowerCase(), u])
  );

  const results = [];
  for (const user of users) {
    try {
      const result = await upsertUser(user, existingByEmail);
      results.push(result);
      console.log(`${result.action.toUpperCase()}: ${result.email}`);
    } catch (error) {
      results.push({ action: "error", email: user.email, error: error.message });
      console.error(`ERROR: ${user.email} -> ${error.message}`);
    }
  }

  const created = results.filter((r) => r.action === "created").length;
  const updated = results.filter((r) => r.action === "updated").length;
  const failed = results.filter((r) => r.action === "error").length;

  console.log("\nSummary");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
