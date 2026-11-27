import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getWattwiseDb } from "@/lib/mongodb";
import { provisionWattwiseProfile } from "@/lib/profile-provisioning";
import { sanitizeRedirectPath } from "@/lib/url-params";

/**
 * Post-OAuth completion endpoint for newly registered Google users.
 * Provisions their selected role/organization before redirecting into the app.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = sanitizeRedirectPath(url.searchParams.get("redirect"));

  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.redirect(new URL("/login?error=oauth_session", req.url));
    }

    const db = await getWattwiseDb();
    await provisionWattwiseProfile({
      db,
      email: session.user.email,
      name: session.user.name,
      mode: url.searchParams.get("mode"),
      requestedRole:
        url.searchParams.get("requestedRole") || url.searchParams.get("role"),
      organizationId: url.searchParams.get("orgId"),
      organizationName: url.searchParams.get("org"),
    });

    return NextResponse.redirect(new URL(target, req.url));
  } catch (err) {
    console.error("Google OAuth completion error:", err);
    return NextResponse.redirect(new URL("/login?error=oauth_setup", req.url));
  }
}
