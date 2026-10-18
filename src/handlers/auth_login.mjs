/**
 * POST /auth/login  (público)
 * Body: { email, password }
 * Resposta: { token, athlete: { id, name, email } }
 */

import { query } from "../lib/db.mjs";
import { verifyPassword, signToken } from "../lib/auth.mjs";
import { ok, error, parseBody } from "../lib/http.mjs";

export const handler = async (event) => {
  try {
    const { email, password } = parseBody(event);
    if (!email || !password) {
      return error("email e password são obrigatórios", 400);
    }

    const res = await query(
      `SELECT athlete_id, name, email, password_hash
         FROM athlete WHERE email = $1`,
      [email]
    );

    if (res.rowCount === 0) {
      return error("Credenciais inválidas", 401);
    }

    const row = res.rows[0];
    if (!row.password_hash) {
      return error("Credenciais inválidas", 401);
    }

    const valid = await verifyPassword(password, row.password_hash);
    if (!valid) {
      return error("Credenciais inválidas", 401);
    }

    const token = signToken({ athlete_id: row.athlete_id, email: row.email });
    return ok({
      token,
      athlete: { id: row.athlete_id, name: row.name, email: row.email },
    });
  } catch (e) {
    console.error("auth_login error", e);
    return error("Erro interno", 500);
  }
};
