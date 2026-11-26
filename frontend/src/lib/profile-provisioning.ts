import { ObjectId, type Db } from "mongodb";

export const VALID_ROLES = [
  "Organization Admin",
  "Facility Manager",
  "Department Manager",
  "Viewer",
] as const;

export type ProvisionRole = (typeof VALID_ROLES)[number];

export interface ProvisionOptions {
  db: Db;
  email: string;
  name?: string | null;
  role?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  defaultRole?: ProvisionRole;
}

/**
 * Resolve or provision a WattWise profile and optional organization in MongoDB.
 * Existing profiles are returned untouched so permissions are never overwritten.
 */
export async function provisionWattwiseProfile({
  db,
  email,
  name,
  role,
  organizationId,
  organizationName,
  defaultRole = "Organization Admin",
}: ProvisionOptions) {
  const existing = await db.collection("wattwise_profiles").findOne({ email });
  if (existing) {
    return { profile: existing, created: false as const };
  }

  const requestedRole: ProvisionRole =
    role && VALID_ROLES.includes(role as ProvisionRole)
      ? (role as ProvisionRole)
      : defaultRole;

  let org = await db.collection("organizations").findOne({});
  if (organizationId && ObjectId.isValid(organizationId)) {
    const matched = await db
      .collection("organizations")
      .findOne({ _id: new ObjectId(organizationId) });
    if (matched) org = matched;
  } else if (
    typeof organizationName === "string" &&
    organizationName.trim().length >= 2
  ) {
    const trimmed = organizationName.trim();
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const newOrg = {
      _id: new ObjectId(),
      name: trimmed,
      slug: `${slug || "org"}-${Date.now().toString(36)}`,
      industry: "Commercial Real Estate",
      timezone: "UTC",
      currency: "USD",
      tariffPerKwh: 0.145,
      emissionFactorKgPerKwh: 0.412,
      contactEmail: email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("organizations").insertOne(newOrg);
    org = newOrg;
  }

  if (!org) {
    throw new Error("No organizations configured in database");
  }

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
    email,
    name: name?.trim() || email.split("@")[0],
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
  return { profile, created: true as const };
}
