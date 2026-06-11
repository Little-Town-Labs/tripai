import { createNeonAuth } from "@neondatabase/auth/next/server";

function authEnv(name: "NEON_AUTH_BASE_URL" | "NEON_AUTH_COOKIE_SECRET", fallback: string) {
  const value = process.env[name];
  return value || fallback;
}

export const auth = createNeonAuth({
  baseUrl: authEnv("NEON_AUTH_BASE_URL", "http://localhost:9999"),
  cookies: {
    secret: authEnv(
      "NEON_AUTH_COOKIE_SECRET",
      "development-only-tripai-auth-cookie-secret",
    ),
  },
  logLevel: "warn",
});
