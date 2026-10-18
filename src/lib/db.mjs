/**
 * Pool de conexão PostgreSQL compartilhado pelas Lambdas de API.
 *
 * Credenciais via env vars injetadas no deploy (Opção B):
 * DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.
 *
 * O pool é criado por container e reaproveitado entre invocações quentes.
 */

import pg from "pg";

const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432", 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 1, // Lambda: 1 conexão por container basta
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function query(text, params) {
  const res = await getPool().query(text, params);
  return res;
}
