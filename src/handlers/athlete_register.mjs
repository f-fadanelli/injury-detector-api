/**
 * POST /athletes   (público — cadastro)
 * Body: campos do perfil + { email, password }
 * Cria o atleta com senha hasheada (bcrypt) e retorna token + perfil.
 */

import { query } from "../lib/db.mjs";
import { hashPassword, signToken } from "../lib/auth.mjs";
import { ok, error, parseBody } from "../lib/http.mjs";

const PROFILE_FIELDS = [
  "gender", "age", "height_cm", "weight_kg", "training_experience", "lifestyle",
  "nutrition_factor", "drinking_factor", "stress_factor", "hrv_baseline",
  "hrv_min", "hrv_max", "max_hr", "resting_hr", "lthr", "vo2max",
  "running_threshold_pace", "weekly_training_hours", "recovery_rate",
  "sleep_time_norm", "sleep_quality", "name",
];

export const handler = async (event) => {
  try {
    const body = parseBody(event);
    const { email, password } = body;
    if (!email || !password) {
      return error("email e password são obrigatórios", 400);
    }

    const exists = await query(`SELECT 1 FROM athlete WHERE email = $1`, [email]);
    if (exists.rowCount > 0) return error("E-mail já cadastrado", 409);

    const password_hash = await hashPassword(password);

    const cols = ["email", "password_hash"];
    const vals = [email, password_hash];
    for (const f of PROFILE_FIELDS) {
      if (body[f] !== undefined) {
        cols.push(f);
        vals.push(body[f]);
      }
    }
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");

    const res = await query(
      `INSERT INTO athlete (${cols.join(", ")})
       VALUES (${placeholders})
       RETURNING athlete_id, name, email`,
      vals
    );

    const row = res.rows[0];
    const token = signToken({ athlete_id: row.athlete_id, email: row.email });
    return ok(
      { token, athlete: { id: row.athlete_id, name: row.name, email: row.email } },
      201
    );
  } catch (e) {
    console.error("athlete_register error", e);
    return error("Erro interno", 500);
  }
};
