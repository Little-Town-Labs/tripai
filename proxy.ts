import { auth } from "@/lib/auth/server";
import { NextResponse, type NextRequest } from "next/server";

function isE2EBypass(request: NextRequest) {
  return (
    process.env.TRIPAI_E2E_AUTH_BYPASS === "1" &&
    process.env.NODE_ENV !== "production" &&
    request.headers.get("x-tripai-disable-e2e-bypass") !== "1" &&
    !request.nextUrl.searchParams.has("disableE2EBypass")
  );
}

export default function proxy(request: NextRequest) {
  if (
    process.env.TRIPAI_E2E_AUTH_BYPASS === "1" &&
    process.env.NODE_ENV !== "production" &&
    (request.headers.get("x-tripai-disable-e2e-bypass") === "1" ||
      request.nextUrl.searchParams.has("disableE2EBypass"))
  ) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  if (isE2EBypass(request)) {
    return NextResponse.next();
  }

  return auth.middleware({
  loginUrl: "/auth/sign-in",
  })(request);
}

export const config = {
  matcher: ["/app/:path*"],
};
