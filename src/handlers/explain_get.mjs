/**
 * GET /athletes/{athlete_id}/explain   (protegido)
 * Explicabilidade da predição de risco (SHAP + valores de features).
 *
 * Query params:
 *   days   (default 90) — janela ancorada na data mais recente de predição
 *   date   (opcional)   — se informado, inclui a decomposição SHAP daquele dia
 *   features (opcional) — csv de features para a série temporal
 *
 * Resposta:
 *   {
 *     ranking:  [{feature, label, mean_abs_shap}]  // ordenado por contribuição média
 *     series:   [{date, risk, features:{nome:valor}}]  // séries temporais
 *     day:      { date, risk, shap:[{feature,label,contribution}] } | null
 *   }
 */

import { query } from '../lib/db.mjs';
import { ok, error, pathAthleteId } from '../lib/http.mjs';

export const handler = async (event) => {
  try {
    const id = pathAthleteId(event);
    if (!id) return error('athlete_id ausente', 400);

    const q = event.queryStringParameters || {};
    const days = Math.min(parseInt(q.days || '90', 10), 400);
    const requested = (q.features || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const anchorRes = await query(
      `SELECT MAX(prediction_date) AS anchor FROM injury_prediction WHERE athlete_id = $1`,
      [id]
    );
    const anchor = anchorRes.rows[0]?.anchor;
    if (!anchor) {
      return ok({ ranking: [], series: [], day: null });
    }

    const rowsRes = await query(
      `SELECT prediction_date, risk_probability, risk_flag, explanation
         FROM injury_prediction
        WHERE athlete_id = $1
          AND model_version = 'V4'
          AND prediction_date >= ($2::date - $3::int)
        ORDER BY prediction_date ASC`,
      [id, anchor, days]
    );

    // Ranking: média do |SHAP| de cada feature no período.
    const sumAbs = new Map();
    const labelOf = new Map();
    let n = 0;

    const series = [];
    for (const r of rowsRes.rows) {
      const exp = r.explanation || {};
      const shap = Array.isArray(exp.shap) ? exp.shap : [];
      const features = exp.features || {};

      for (const s of shap) {
        sumAbs.set(s.feature, (sumAbs.get(s.feature) || 0) + Math.abs(s.contribution));
        labelOf.set(s.feature, s.label || s.feature);
      }
      n += 1;

      // Série: só as features pedidas (ou todas as disponíveis se nenhuma pedida).
      const picked = {};
      const names = requested.length ? requested : Object.keys(features);
      for (const name of names) {
        if (features[name] !== undefined) picked[name] = features[name];
      }

      series.push({
        date: r.prediction_date.toISOString
          ? r.prediction_date.toISOString().slice(0, 10)
          : String(r.prediction_date).slice(0, 10),
        risk: Math.round(r.risk_probability * 100),
        features: picked,
      });
    }

    const ranking = Array.from(sumAbs.entries())
      .map(([feature, total]) => ({
        feature,
        label: labelOf.get(feature) || feature,
        mean_abs_shap: n ? Number((total / n).toFixed(5)) : 0,
      }))
      .sort((a, b) => b.mean_abs_shap - a.mean_abs_shap);

    // Decomposição SHAP de um dia específico (opcional).
    let day = null;
    if (q.date) {
      const dRes = await query(
        `SELECT prediction_date, risk_probability, explanation
           FROM injury_prediction
          WHERE athlete_id = $1 AND model_version = 'V4' AND prediction_date = $2`,
        [id, q.date]
      );
      if (dRes.rowCount > 0) {
        const r = dRes.rows[0];
        const exp = r.explanation || {};
        day = {
          date: q.date,
          risk: Math.round(r.risk_probability * 100),
          shap: Array.isArray(exp.shap) ? exp.shap : [],
        };
      }
    }

    return ok({ ranking, series, day });
  } catch (e) {
    console.error('explain_get error', e);
    return error('Erro interno', 500);
  }
};
