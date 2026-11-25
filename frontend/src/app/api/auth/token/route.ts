import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ObjectId } from "mongodb";
import { signJWT } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { getWattwiseDb } from "@/lib/mongodb";

const VALID_ROLES = [
  "Organization Admin",
  "Facility Manager",
  "Department Manager",
  "Viewer",
] as const;

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getWattwiseDb();
    let profile = await db
      .collection("wattwise_profiles")
      .findOne({ email: session.user.email });

    if (!profile) {
      const defaultOrg = await db.collection("organizations").findOne({});
      if (!defaultOrg) {
        return NextResponse.json(
          { error: "No organizations configured in database" },
          { status: 500 }
        );
      }

      const newProfile = {
        _id: new ObjectId(),
        email: session.user.email,
        name: session.user.name || session.user.email.split("@")[0],
        organizationId: defaultOrg._id,
        role: "Viewer",
        departmentIds: [],
        themePreference: "dark",
        timezone: defaultOrg.timezone || "UTC",
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection("wattwise_profiles").insertOne(newProfile);
      profile = newProfile;
    }

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
    return NextResponse.json({ error: "Failed to mint API token" }, { status: 500 });
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
    const requestedRole = VALID_ROLES.includes(body.role) ? body.role : "Organization Admin";
    const db = await getWattwiseDb();

    const existing = await db
      .collection("wattwise_profiles")
      .findOne({ email: session.user.email });

    if (existing) {
      return NextResponse.json({ ok: true, profileId: String(existing._id) });
    }

    let org = await db.collection("organizations").findOne({});
    if (body.organizationId && ObjectId.isValid(body.organizationId)) {
      const matched = await db
        .collection("organizations")
        .findOne({ _id: new ObjectId(body.organizationId) });
      if (matched) org = matched;
    } else if (typeof body.organizationName === "string" && body.organizationName.trim().length >= 2) {
      const slug = body.organizationName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const newOrg = {
        _id: new ObjectId(),
        name: body.organizationName.trim(),
        slug: `${slug}-${Date.now().toString(36)}`,
        industry: "Commercial Real Estate",
        timezone: "UTC",
        currency: "USD",
        tariffPerKwh: 0.145,
        emissionFactorKgPerKwh: 0.412,
        contactEmail: session.user.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection("organizations").insertOne(newOrg);
      org = newOrg;
    }

    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Assign sample departments if registering as Department Manager for evaluation
    let departmentIds: ObjectId[] = [];
    if (requestedRole === "Department Manager") {
      const sampleDepts = await db
        .collection("departments")
        .find({ organizationId: org._id })
        .limit(2)
        .toArray();
      departmentIds = sampleDepts.map((d) => d._id);
    }

    const profile = {
      _id: new ObjectId(),
      email: session.user.email,
      name: body.name || session.user.name || session.user.email.split("@")[0],
      organizationId: org._id,
      role: requestedRole,
      departmentIds,
      themePreference: "dark",
      timezone: org.timezone || "UTC",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("wattwise_profiles").insertOne(profile);
    return NextResponse.json({ ok: true, profileId: String(profile._id) });
  } catch (err) {
    console.error("Profile registration error:", err);
    return NextResponse.json({ error: "Failed to initialize profile" }, { status: 500 });
  }
}
