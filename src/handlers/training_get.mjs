/**
 * GET /athletes/{athlete_id}/trainings   (protegido)
 * Query params:
 *   from, to            (filtro de data, opcionais)
 *   workout_type        (filtro, opcional)
 *   page   (default 1)
 *   pageSize (default 10, max 100)
 *   sortBy (default activity_date) — whitelist abaixo
 *   sortDir (asc|desc, default desc)
 *
 * Resposta: { items, total, page, pageSize, totalPages, sortBy, sortDir }
 */

import { query } from '../lib/db.mjs';
import { ok, error, pathAthleteId } from '../lib/http.mjs';

const SORTABLE = new Set([
  'activity_date',
  'workout_type',
  'duration_minutes',
  'distance_km',
  'elevation_gain',
  'avg_hr',
  'max_hr',
  'avg_speed_kph',
  'avg_pace_min_km',
  'tss',
  'intensity_factor',
  'training_effect_aerobic',
  'training_effect_anaerobic',
]);

export const handler = async (event) => {
  try {
    const id = pathAthleteId(event);
    if (!id) return error('athlete_id ausente', 400);

    const q = event.queryStringParameters || {};

    const page = Math.max(parseInt(q.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(q.pageSize || '10', 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const sortBy = SORTABLE.has(q.sortBy) ? q.sortBy : 'activity_date';
    const sortDir = (q.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const params = [id];
    let where = 'athlete_id = $1';
    if (q.from) {
      params.push(q.from);
      where += ` AND activity_date >= $${params.length}`;
    }
    if (q.to) {
      params.push(q.to);
      where += ` AND activity_date <= $${params.length}`;
    }
    if (q.workout_type) {
      params.push(q.workout_type);
      where += ` AND workout_type = $${params.length}`;
    }

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM activity_record WHERE ${where}`,
      params
    );
    const total = countRes.rows[0].total;

    const pageParams = [...params, pageSize, offset];
    const rows = await query(
      `SELECT activity_id, athlete_id, activity_date, sport, workout_type,
              duration_minutes, tss, intensity_factor, avg_hr, max_hr,
              distance_km, avg_speed_kph, elevation_gain, avg_pace_min_km,
              training_effect_aerobic, training_effect_anaerobic
         FROM activity_record
        WHERE ${where}
        ORDER BY ${sortBy} ${sortDir}, activity_date DESC
        LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams
    );

    return ok({
      items: rows.rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
      sortBy,
      sortDir: sortDir.toLowerCase(),
    });
  } catch (e) {
    console.error('training_get error', e);
    return error('Erro interno', 500);
  }
};
