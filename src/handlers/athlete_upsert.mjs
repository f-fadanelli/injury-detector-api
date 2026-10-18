/**
 * PUT /athletes/{athlete_id}   (protegido)
 * Atualiza campos do perfil. Nao altera email/senha aqui.
 */

import { query } from "../lib/db.mjs";
import { ok, error, parseBody, pathAthleteId } from "../lib/http.mjs";

const UPDATABLE = [
  "gender", "age", "height_cm", "weight_kg", "training_experience", "lifestyle",
  "nutrition_factor", "drinking_factor", "stress_factor", "hrv_baseline",
  "hrv_min", "hrv_max", "max_hr", "resting_hr", "lthr", "vo2max",
  "running_threshold_pace", "weekly_training_hours", "recovery_rate",
  "sleep_time_norm", "sleep_quality", "name",
];

export const handler = async (event) => {
  try {
    const id = pathAthleteId(event);
    if (!id) return error("athlete_id ausente", 400);

    const body = parseBody(event);
    const sets = [];
    const vals = [];
    let i = 1;
    for (const f of UPDATABLE) {
      if (body[f] !== undefined) {
        sets.push(`${f} = $${i++}`);
        vals.push(body[f]);
      }
    }
    if (sets.length === 0) return error("Nenhum campo para atualizar", 400);

    sets.push(`updated_at = now()`);
    vals.push(id);

    const res = await query(
      `UPDATE athlete SET ${sets.join(", ")}
       WHERE athlete_id = $${i}
       RETURNING athlete_id`,
      vals
    );

    if (res.rowCount === 0) return error("Atleta não encontrado", 404);
    return ok({ athlete_id: res.rows[0].athlete_id, updated: true });
  } catch (e) {
    console.error("athlete_upsert error", e);
    return error("Erro interno", 500);
  }
};
