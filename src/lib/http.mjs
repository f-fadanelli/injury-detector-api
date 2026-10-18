/**
 * Helpers de resposta HTTP para API Gateway v2 (payload format 2.0).
 */

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export function ok(body, statusCode = 200) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

export function error(message, statusCode = 400) {
  return { statusCode, headers: CORS, body: JSON.stringify({ error: message }) };
}

/** Extrai e faz parse do corpo JSON do evento (lida com base64). */
export function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** athlete_id vindo do path (/athletes/{athlete_id}). */
export function pathAthleteId(event) {
  return event.pathParameters?.athlete_id ?? null;
}
