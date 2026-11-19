import { errors, jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

export { hashPassword, verifyPassword };

export const SESSION_COOKIE_NAME = "cybrdial_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const JWT_ISSUER = "cybrdial";
const JWT_AUDIENCE = "cybrdial-web";

function getAuthKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("AUTH_SECRET debe contener al menos 32 bytes.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  if (!user) {
    throw new Error("No se pudo resolver la versión de sesión.");
  }

  return new SignJWT({ sv: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getAuthKey());
}

export async function verifySessionToken(
  token: string,
): Promise<{ userId: string; sv: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthKey(), {
      algorithms: ["HS256"],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    });

    return typeof payload.sub === "string" &&
      typeof payload.sv === "number"
      ? { userId: payload.sub, sv: payload.sv }
      : null;
  } catch (error) {
    if (
      error instanceof errors.JWTExpired ||
      error instanceof errors.JWTInvalid ||
      error instanceof errors.JWSSignatureVerificationFailed ||
      error instanceof errors.JWSInvalid ||
      error instanceof errors.JWTClaimValidationFailed
    ) {
      return null;
    }

    throw error;
  }
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function getAuthenticatedUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const cookieHeader = request.headers.get("cookie");
  const token = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
  return getAuthenticatedUserFromToken(token);
}

export async function getAuthenticatedUserFromToken(
  token: string | undefined,
): Promise<AuthenticatedUser | null> {
  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, sessionVersion: true },
  });
  if (!user || user.sessionVersion !== session.sv) {
    return null;
  }
  return { id: user.id, email: user.email, name: user.name };
}

export function createSessionCookie(
  token: string,
  maxAge = SESSION_DURATION_SECONDS,
): string {
  const appUrl = process.env.APP_URL;
  const usesHttps =
    process.env.NODE_ENV === "production" ||
    (appUrl !== undefined && appUrl.startsWith("https://"));
  const sameSite = usesHttps ? "None" : "Lax";
  const secure = usesHttps ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure}`;
}
