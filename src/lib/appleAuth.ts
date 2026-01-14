import jwt, { JwtHeader } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});

function getKey(header: JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!header.kid) {
    return callback(new Error("Missing kid in token header"));
  }

  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export interface AppleUser {
  id: string;      // Apple's stable `sub` identifier
  email?: string;
}

export interface AuthResult {
  success: true;
  user: AppleUser;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Verifies an Apple identity token from the Authorization header.
 * 
 * Usage in Next.js route handlers:
 * ```
 * const auth = await verifyAppleToken(request);
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status });
 * }
 * const userId = auth.user.id;
 * ```
 */
export async function verifyAppleToken(
  request: Request
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Missing Authorization header",
      status: 401,
    };
  }

  const token = authHeader.replace("Bearer ", "");

  return new Promise((resolve) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.APPLE_CLIENT_ID,
        issuer: "https://appleid.apple.com",
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) {
          resolve({
            success: false,
            error: "Invalid Apple identity token",
            status: 401,
          });
          return;
        }

        const payload = decoded as jwt.JwtPayload;

        if (!payload?.sub) {
          resolve({
            success: false,
            error: "Invalid Apple token payload",
            status: 401,
          });
          return;
        }

        resolve({
          success: true,
          user: {
            id: payload.sub,    // 🔑 stable Apple user ID
            email: payload.email as string | undefined,
          },
        });
      }
    );
  });
}

/**
 * Helper to extract user ID or return error response.
 * Throws if not authenticated (use in try/catch or with verifyAppleToken directly).
 */
export async function requireAuth(request: Request): Promise<AppleUser> {
  const result = await verifyAppleToken(request);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.user;
}
