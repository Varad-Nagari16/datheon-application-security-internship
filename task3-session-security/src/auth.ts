import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import type { AppDatabase } from "./database.js";
import { DEMO_PASSWORD } from "./records.js";

export const JWT_ISSUER = "bola-guard-local-lab";
export const JWT_AUDIENCE = "northstar-student-portal";
export const JWT_TTL_SECONDS = 15 * 60;
export const SESSION_ABSOLUTE_TTL_SECONDS = 8 * 60 * 60;
export const SESSION_COOKIE_NAME = "northstar_session";

export interface DemoAccount {
  userId: string;
  email: string;
  name: string;
  applicationId: number;
}

export interface VerifiedSession {
  userId: string;
  email: string;
  sessionId: string;
  jti: string;
  issuedAt: number;
  expiresAt: number;
}

export interface IssuedAccessToken {
  token: string;
  sessionId: string;
  jti: string;
  issuedAt: number;
  expiresAt: number;
  expiresIn: number;
}

interface DemoUserRow {
  id: string;
  email: string;
  student_name: string;
  password_salt: string;
  password_hash: string;
  application_id: number;
}

const dummySalt = "northstar-invalid-account-dummy-salt-v1";
const dummyHash = scryptSync(DEMO_PASSWORD, dummySalt, 64);

export function authenticateDemoUser(
  database: AppDatabase,
  emailInput: string,
  password: string,
): DemoAccount | null {
  const email = emailInput.trim().toLowerCase();
  if (email.length > 254 || password.length > 256) return null;

  const user = database
    .prepare(`
      SELECT u.id, u.email, u.student_name, u.password_salt, u.password_hash,
             a.id AS application_id
      FROM users AS u
      JOIN applications AS a ON a.owner_id = u.id
      WHERE u.email = ?
      LIMIT 1
    `)
    .get(email) as DemoUserRow | undefined;

  if (!user) {
    const probe = scryptSync(password, dummySalt, 64);
    timingSafeEqual(probe, dummyHash);
    return null;
  }

  const storedHash = Buffer.from(user.password_hash, "hex");
  const candidateHash = scryptSync(password, user.password_salt, 64);
  if (storedHash.length !== candidateHash.length || !timingSafeEqual(storedHash, candidateHash)) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.student_name,
    applicationId: user.application_id,
  };
}

export function issueAccessToken(
  account: DemoAccount,
  jwtSecret: string,
  sessionId: string,
  expiresIn: number,
  issuedAt = Math.floor(Date.now() / 1000),
): IssuedAccessToken {
  const jti = randomUUID();
  const expiresAt = issuedAt + expiresIn;
  const token = jwt.sign(
    { email: account.email, sid: sessionId, iat: issuedAt },
    jwtSecret,
    {
      algorithm: "HS256",
      audience: JWT_AUDIENCE,
      expiresIn,
      issuer: JWT_ISSUER,
      jwtid: jti,
      subject: account.userId,
    },
  );

  return { token, sessionId, jti, issuedAt, expiresAt, expiresIn };
}

export function verifyAccessToken(token: string, jwtSecret: string): VerifiedSession {
  if (token.length > 8192) throw new Error("Invalid session token");
  const payload = jwt.verify(token, jwtSecret, {
    algorithms: ["HS256"],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  });

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    typeof payload.email !== "string" ||
    typeof payload.sid !== "string" ||
    payload.sid.length === 0 ||
    typeof payload.jti !== "string" ||
    payload.jti.length === 0 ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Invalid session claims");
  }

  return {
    userId: payload.sub,
    email: payload.email,
    sessionId: payload.sid,
    jti: payload.jti,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}
