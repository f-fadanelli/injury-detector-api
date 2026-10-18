/**
 * Utilitários de autenticação: JWT e hash de senha.
 *
 * JWT_SECRET vem de env var injetada no deploy.
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** Extrai o token do header Authorization: "Bearer <token>". */
export function extractBearer(event) {
  const h =
    event.headers?.authorization || event.headers?.Authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
