/**
 * GET /athletes/{athlete_id}/daily   (protegido)
 * Query params:
 *   from, to            (filtro de data, opcionais)
 *   page   (default 1)
 *   pageSize (default 10, max 100)
 *   sortBy (default record_date) — whitelist abaixo
 *   sortDir (asc|desc, default desc)
 *
 * Resposta: { items, total, page, pageSize, totalPages, sortBy, sortDir }
 */

import { query } from '../lib/db.mjs';
import { ok, error, pathAthleteId } from '../lib/http.mjs';

// Colunas permitidas para ordenar (evita SQL injection no ORDER BY).
const SORTABLE = new Set([
  'record_date',
  'resting_hr',
  'hrv',
  'sleep_hours',
  'sleep_quality',
  'body_battery_morning',
  'body_battery_evening',
  'stress',
  'actual_tss',
]);

export const handler = async (event) => {
  try {
    const id = pathAthleteId(event);
    if (!id) return error('athlete_id ausente', 400);

    const q = event.queryStringParameters || {};

    const page = Math.max(parseInt(q.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(q.pageSize || '10', 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const sortBy = SORTABLE.has(q.sortBy) ? q.sortBy : 'record_date';
    const sortDir = (q.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Filtros (WHERE) compartilhados entre a contagem e a página.
    const params = [id];
    let where = 'athlete_id = $1';
    if (q.from) {
      params.push(q.from);
      where += ` AND record_date >= $${params.length}`;
    }
    if (q.to) {
      params.push(q.to);
      where += ` AND record_date <= $${params.length}`;
    }

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM daily_record WHERE ${where}`,
      params
    );
    const total = countRes.rows[0].total;

    const pageParams = [...params, pageSize, offset];
    const rows = await query(
      `SELECT athlete_id, record_date, resting_hr, hrv, sleep_hours,
              deep_sleep, light_sleep, rem_sleep, sleep_quality,
              body_battery_morning, stress, body_battery_evening,
              actual_tss, injury
         FROM daily_record
        WHERE ${where}
        ORDER BY ${sortBy} ${sortDir}, record_date DESC
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
    console.error('daily_get error', e);
    return error('Erro interno', 500);
  }
};
