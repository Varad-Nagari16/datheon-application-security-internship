import { randomUUID } from "node:crypto";
import {
  issueAccessToken,
  JWT_TTL_SECONDS,
  SESSION_ABSOLUTE_TTL_SECONDS,
  type DemoAccount,
  type IssuedAccessToken,
  type VerifiedSession,
} from "./auth.js";

interface ActiveSession {
  account: DemoAccount;
  sessionId: string;
  currentJti: string;
  currentExpiresAt: number;
  absoluteExpiresAt: number;
}

export interface SessionIssue extends IssuedAccessToken {
  account: DemoAccount;
}

export class SessionStore {
  private readonly sessions = new Map<string, ActiveSession>();

  constructor(private readonly jwtSecret: string) {}

  create(account: DemoAccount, now = Math.floor(Date.now() / 1000)): SessionIssue {
    this.pruneExpired(now);
    const sessionId = randomUUID();
    const absoluteExpiresAt = now + SESSION_ABSOLUTE_TTL_SECONDS;
    const expiresIn = Math.min(JWT_TTL_SECONDS, absoluteExpiresAt - now);
    const issued = issueAccessToken(account, this.jwtSecret, sessionId, expiresIn, now);
    this.sessions.set(sessionId, {
      account,
      sessionId,
      currentJti: issued.jti,
      currentExpiresAt: issued.expiresAt,
      absoluteExpiresAt,
    });
    return { ...issued, account };
  }

  isActive(claims: VerifiedSession, now = Math.floor(Date.now() / 1000)): boolean {
    const active = this.sessions.get(claims.sessionId);
    return Boolean(
      active &&
      active.currentJti === claims.jti &&
      active.account.userId === claims.userId &&
      active.account.email === claims.email &&
      active.currentExpiresAt === claims.expiresAt &&
      now < active.currentExpiresAt &&
      now < active.absoluteExpiresAt,
    );
  }

  accountFor(claims: VerifiedSession): DemoAccount | null {
    if (!this.isActive(claims)) return null;
    return this.sessions.get(claims.sessionId)?.account ?? null;
  }

  rotate(claims: VerifiedSession, now = Math.floor(Date.now() / 1000)): SessionIssue | null {
    const active = this.sessions.get(claims.sessionId);
    if (!active || !this.isActive(claims, now)) return null;
    if (now >= active.absoluteExpiresAt) {
      this.sessions.delete(claims.sessionId);
      return null;
    }

    const expiresIn = Math.min(JWT_TTL_SECONDS, active.absoluteExpiresAt - now);
    if (expiresIn <= 0) {
      this.sessions.delete(claims.sessionId);
      return null;
    }

    const issued = issueAccessToken(active.account, this.jwtSecret, active.sessionId, expiresIn, now);
    active.currentJti = issued.jti;
    active.currentExpiresAt = issued.expiresAt;
    return { ...issued, account: active.account };
  }

  revoke(claims: VerifiedSession): boolean {
    if (!this.isActive(claims)) return false;
    return this.sessions.delete(claims.sessionId);
  }

  private pruneExpired(now: number): void {
    for (const [sessionId, session] of this.sessions) {
      if (now >= session.currentExpiresAt || now >= session.absoluteExpiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
