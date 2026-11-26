import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ObjectId } from "mongodb";
import { signJWT } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { getWattwiseDb } from "@/lib/mongodb";
import { provisionWattwiseProfile } from "@/lib/profile-provisioning";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getWattwiseDb();
    const { profile } = await provisionWattwiseProfile({
      db,
      email: session.user.email,
      name: session.user.name,
      defaultRole: "Viewer",
    });

    if (profile.status === "Suspended") {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const org = await db
      .collection("organizations")
      .findOne({ _id: profile.organizationId });

    const secret =
      process.env.BETTER_AUTH_SECRET ||
      "wattwise-local-dev-secret-change-in-production-32chars";

    const departmentIds = Array.isArray(profile.departmentIds)
      ? profile.departmentIds.map((id: ObjectId | string) => String(id))
      : [];

    const token = await signJWT(
      {
        sub: String(session.user.id || profile._id),
        email: profile.email,
        name: profile.name,
        organizationId: String(profile.organizationId),
        role: profile.role,
        departmentIds,
      },
      secret,
      60 * 60 * 12 // 12 hours
    );

    return NextResponse.json({
      token,
      user: {
        id: session.user.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        organizationId: String(profile.organizationId),
        departmentIds,
        themePreference: profile.themePreference || "dark",
        timezone: profile.timezone || "UTC",
      },
      organization: org
        ? {
            id: String(org._id),
            name: org.name,
            slug: org.slug,
            industry: org.industry,
            currency: org.currency,
            tariffPerKwh: org.tariffPerKwh,
            emissionFactorKgPerKwh: org.emissionFactorKgPerKwh,
            timezone: org.timezone,
          }
        : null,
    });
  } catch (err) {
    console.error("Token bridge error:", err);
    return NextResponse.json(
      { error: "Failed to mint API token" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const db = await getWattwiseDb();

    const { profile } = await provisionWattwiseProfile({
      db,
      email: session.user.email,
      name: body.name || session.user.name,
      role: body.role,
      organizationId: body.organizationId,
      organizationName: body.organizationName,
      defaultRole: "Organization Admin",
    });

    return NextResponse.json({ ok: true, profileId: String(profile._id) });
  } catch (err) {
    console.error("Profile registration error:", err);
    return NextResponse.json(
      { error: "Failed to initialize profile" },
      { status: 500 }
    );
  }
}
