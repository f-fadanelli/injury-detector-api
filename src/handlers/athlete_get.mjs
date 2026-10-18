/**
 * GET /athletes/{athlete_id}   (protegido)
 * Retorna o perfil do atleta (sem o password_hash).
 */

import { query } from "../lib/db.mjs";
import { ok, error, pathAthleteId } from "../lib/http.mjs";

export const handler = async (event) => {
  try {
    const id = pathAthleteId(event);
    if (!id) return error("athlete_id ausente", 400);

    const res = await query(
      `SELECT athlete_id, gender, age, height_cm, weight_kg,
              training_experience, lifestyle, nutrition_factor, drinking_factor,
              stress_factor, hrv_baseline, hrv_min, hrv_max, max_hr, resting_hr,
              lthr, vo2max, running_threshold_pace, weekly_training_hours,
              recovery_rate, sleep_time_norm, sleep_quality, name, email,
              created_at, updated_at
         FROM athlete WHERE athlete_id = $1`,
      [id]
    );

    if (res.rowCount === 0) return error("Atleta não encontrado", 404);
    return ok(res.rows[0]);
  } catch (e) {
    console.error("athlete_get error", e);
    return error("Erro interno", 500);
  }
};
