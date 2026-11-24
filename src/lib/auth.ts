import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keyLength: number) => Promise<Buffer>;

export const SESSION_COOKIE = "lp_session";
const SESSION_DAYS = 30;

/** Returns "scrypt$<salt>$<hash>" (base64). The plain password is never stored. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

const tokenId = (token: string) => createHash("sha256").update(token).digest("hex");

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

function readSessionToken(req: Request) {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join("="));
  }
  return null;
}

/** Signs the user in on this browser: stores a session and sets the cookie on `response`. */
export async function startSession(response: NextResponse, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.$transaction([
    db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } }),
    db.session.create({ data: { id: tokenId(token), userId, expiresAt } })
  ]);
  response.cookies.set(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
  return response;
}

/** Signs this browser out: deletes its session and clears the cookie. */
export async function endSession(req: Request, response: NextResponse) {
  const token = readSessionToken(req);
  if (token) await db.session.deleteMany({ where: { id: tokenId(token) } });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}

/** The signed-in user for this request, or null. */
export async function sessionUser(req: Request) {
  const token = readSessionToken(req);
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: tokenId(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** The signed-in user's id, or null. */
export async function getUserId(req: Request) {
  return (await sessionUser(req))?.id ?? null;
}
