/**
 * POST /athletes/{athlete_id}/trainings   (protegido)
 * Cria uma sessao de treino. Se vier activity_id, atualiza.
 */

import { query } from "../lib/db.mjs";
import { ok, error, parseBody, pathAthleteId } from "../lib/http.mjs";

const FIELDS = [
  "workout_type", "duration_minutes", "tss", "intensity_factor", "avg_hr",
  "max_hr", "distance_km", "avg_speed_kph", "elevation_gain", "avg_pace_min_km",
  "training_effect_aerobic", "training_effect_anaerobic",
];

export const handler = async (event) => {
  try {
    const id = pathAthleteId(event);
    if (!id) return error("athlete_id ausente", 400);

    const body = parseBody(event);
    if (!body.activity_date) return error("activity_date é obrigatório", 400);
    if (!body.workout_type) return error("workout_type é obrigatório", 400);

    // UPDATE se vier activity_id
    if (body.activity_id) {
      const sets = [];
      const vals = [];
      let i = 1;
      for (const f of FIELDS) {
        if (body[f] !== undefined) {
          sets.push(`${f} = $${i++}`);
          vals.push(body[f]);
        }
      }
      sets.push(`updated_at = now()`);
      vals.push(body.activity_id, id);
      const res = await query(
        `UPDATE activity_record SET ${sets.join(", ")}
          WHERE activity_id = $${i++} AND athlete_id = $${i}
          RETURNING activity_id`,
        vals
      );
      if (res.rowCount === 0) return error("Treino não encontrado", 404);
      return ok({ activity_id: res.rows[0].activity_id, updated: true });
    }

    // INSERT
    const cols = ["athlete_id", "activity_date", "sport"];
    const vals = [id, body.activity_date, "run"];
    for (const f of FIELDS) {
      if (body[f] !== undefined) {
        cols.push(f);
        vals.push(body[f]);
      }
    }
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
    const res = await query(
      `INSERT INTO activity_record (${cols.join(", ")})
       VALUES (${placeholders})
       RETURNING activity_id`,
      vals
    );
    return ok({ activity_id: res.rows[0].activity_id, saved: true }, 201);
  } catch (e) {
    console.error("training_upsert error", e);
    return error("Erro interno", 500);
  }
};
