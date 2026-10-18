/**
 * Lambda Authorizer (HTTP API, formato de resposta simples).
 *
 * Valida o JWT do header Authorization. Retorna { isAuthorized: bool }.
 * Em caso de token valido, expõe o athlete_id no context para os handlers.
 */

import { verifyToken, extractBearer } from "../lib/auth.mjs";

export const handler = async (event) => {
  try {
    const token = extractBearer(event);
    if (!token) return { isAuthorized: false };

    const decoded = verifyToken(token);
    return {
      isAuthorized: true,
      context: {
        athlete_id: decoded.athlete_id,
        email: decoded.email,
      },
    };
  } catch {
    return { isAuthorized: false };
  }
};
