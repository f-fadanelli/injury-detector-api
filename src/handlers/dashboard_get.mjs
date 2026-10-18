/**
 * GET /athletes/{athlete_id}/dashboard?days=90   (protegido)
 *
 * SO LE dados ja calculados. A predicao e feita 1x/dia pela Step Function.
 * Retorna:
 *   - latest:     ultima predicao (status atual de risco)
 *   - risk_series: curva diaria de risco (para o grafico)
 *   - load_series: TSS diario (carga) para sobrepor no grafico
 */

import { query } from "../lib/db.mjs";
import { ok, error, pathAthleteId } from "../lib/http.mjs";

export const handler = async (event) => {
  try {
    const id = pathAthleteId(event);
    if (!id) return error("athlete_id ausente", 400);

    const days = Math.min(
      parseInt(event.queryStringParameters?.days || "90", 10),
      365
    );

    // Ancora o período na data MAIS RECENTE de predição do atleta (não em
    // CURRENT_DATE), pois os dados podem ser históricos (ex.: dataset de 2024).
    const anchorRes = await query(
      `SELECT MAX(prediction_date) AS anchor FROM injury_prediction WHERE athlete_id = $1`,
      [id]
    );
    const anchor = anchorRes.rows[0]?.anchor || null;

    const [latest, riskSeries, loadSeries] = await Promise.all([
      query(
        `SELECT prediction_date, risk_probability, risk_flag, threshold_used,
                model_version, explanation
           FROM injury_prediction
          WHERE athlete_id = $1
          ORDER BY prediction_date DESC
          LIMIT 1`,
        [id]
      ),
      anchor
        ? query(
            `SELECT prediction_date, risk_probability, risk_flag
               FROM injury_prediction
              WHERE athlete_id = $1
                AND prediction_date >= ($2::date - $3::int)
              ORDER BY prediction_date ASC`,
            [id, anchor, days]
          )
        : Promise.resolve({ rows: [] }),
      anchor
        ? query(
            `SELECT activity_date, SUM(tss) AS tss_total
               FROM activity_record
              WHERE athlete_id = $1
                AND activity_date >= ($2::date - $3::int)
              GROUP BY activity_date
              ORDER BY activity_date ASC`,
            [id, anchor, days]
          )
        : Promise.resolve({ rows: [] }),
    ]);

    return ok({
      athlete_id: id,
      latest: latest.rows[0] || null,
      risk_series: riskSeries.rows,
      load_series: loadSeries.rows,
    });
  } catch (e) {
    console.error("dashboard_get error", e);
    return error("Erro interno", 500);
  }
};
