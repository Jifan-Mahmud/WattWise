import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
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
      role: url.searchParams.get("role"),
      organizationName: url.searchParams.get("org"),
      defaultRole: "Organization Admin",
    });

    return NextResponse.redirect(new URL(target, req.url));
  } catch (err) {
    console.error("Google OAuth completion error:", err);
    return NextResponse.redirect(new URL("/login?error=oauth_setup", req.url));
  }
}
