/**
 * POST /athletes/{athlete_id}/daily   (protegido)
 * Body: { record_date, resting_hr, hrv, sleep_hours, deep_sleep, light_sleep,
 *         rem_sleep, sleep_quality, body_battery_morning, stress,
 *         body_battery_evening, actual_tss }
 * Valores JA numericos (conversao de frases -> numero feita no front).
 * Upsert por (athlete_id, record_date).
 */

import { query } from "../lib/db.mjs";
import { ok, error, parseBody, pathAthleteId } from "../lib/http.mjs";

const FIELDS = [
  "resting_hr", "hrv", "sleep_hours", "deep_sleep", "light_sleep", "rem_sleep",
  "sleep_quality", "body_battery_morning", "stress", "body_battery_evening",
  "actual_tss",
];

export const handler = async (event) => {
  try {
    const id = pathAthleteId(event);
    if (!id) return error("athlete_id ausente", 400);

    const body = parseBody(event);
    if (!body.record_date) return error("record_date é obrigatório", 400);

    const cols = ["athlete_id", "record_date"];
    const vals = [id, body.record_date];
    for (const f of FIELDS) {
      if (body[f] !== undefined) {
        cols.push(f);
        vals.push(body[f]);
      }
    }
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
    const updates = cols
      .filter((c) => c !== "athlete_id" && c !== "record_date")
      .map((c) => `${c} = EXCLUDED.${c}`)
      .concat("updated_at = now()")
      .join(", ");

    await query(
      `INSERT INTO daily_record (${cols.join(", ")})
       VALUES (${placeholders})
       ON CONFLICT (athlete_id, record_date)
       DO UPDATE SET ${updates}`,
      vals
    );

    return ok({ athlete_id: id, record_date: body.record_date, saved: true });
  } catch (e) {
    console.error("daily_upsert error", e);
    return error("Erro interno", 500);
  }
};
