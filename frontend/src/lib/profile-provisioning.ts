import { ObjectId, type Db } from "mongodb";

export const VALID_ROLES = [
  "Organization Admin",
  "Facility Manager",
  "Department Manager",
  "Viewer",
] as const;

export const REQUESTABLE_JOIN_ROLES = [
  "Facility Manager",
  "Department Manager",
] as const;

export type ProvisionRole = (typeof VALID_ROLES)[number];
export type RequestableJoinRole = (typeof REQUESTABLE_JOIN_ROLES)[number];

export interface ProvisionOptions {
  db: Db;
  email: string;
  name?: string | null;
  mode?: string | null;
  role?: string | null;
  requestedRole?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
}

/**
 * Resolve or provision a WattWise profile and optional organization in MongoDB.
 * Security guarantees:
 * - Existing profiles are returned untouched so roles cannot be escalated via login/register replay.
 * - Creating a new organization strictly assigns Organization Admin to its creator.
 * - Joining any existing organization strictly provisions the account as read-only Viewer,
 *   recording Facility Manager or Department Manager selections as a pending request for Admin review.
 */
export async function provisionWattwiseProfile({
  db,
  email,
  name,
  mode,
  role,
  requestedRole,
  organizationId,
  organizationName,
}: ProvisionOptions) {
  const existing = await db.collection("wattwise_profiles").findOne({ email });
  if (existing) {
    return { profile: existing, created: false as const };
  }

  const trimmedOrgName =
    typeof organizationName === "string" ? organizationName.trim() : "";
  const isCreateMode =
    mode === "create" || (trimmedOrgName.length >= 2 && !organizationId);

  let org = null;
  let assignedRole: ProvisionRole = "Viewer";
  let pendingRole: RequestableJoinRole | null = null;
  let requestStatus: "Pending" | null = null;

  if (isCreateMode) {
    if (trimmedOrgName.length < 2) {
      throw new Error("Organization name must be at least 2 characters.");
    }
    const slug = trimmedOrgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const newOrg = {
      _id: new ObjectId(),
      name: trimmedOrgName,
      slug: `${slug || "org"}-${Date.now().toString(36)}`,
      industry: "Commercial Real Estate",
      timezone: "UTC",
      currency: "USD",
      tariffPerKwh: 0.145,
      emissionFactorKgPerKwh: 0.412,
      contactEmail: email,
      ownerEmail: email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("organizations").insertOne(newOrg);
    org = newOrg;
    assignedRole = "Organization Admin";
  } else {
    if (organizationId) {
      if (!ObjectId.isValid(organizationId)) {
        throw new Error("Invalid organization selected.");
      }
      org = await db
        .collection("organizations")
        .findOne({ _id: new ObjectId(organizationId) });
      if (!org) {
        throw new Error("Selected organization was not found.");
      }
    } else {
      org = await db.collection("organizations").findOne({});
    }

    if (!org) {
      throw new Error("No organizations configured in database.");
    }

    // Never allow a joiner to self-assign Admin, Facility Manager, or Department Manager directly.
    assignedRole = "Viewer";
    const candidateRequest = requestedRole || role;
    if (
      candidateRequest &&
      REQUESTABLE_JOIN_ROLES.includes(candidateRequest as RequestableJoinRole)
    ) {
      pendingRole = candidateRequest as RequestableJoinRole;
      requestStatus = "Pending";
    }
  }

  const profile = {
    _id: new ObjectId(),
    email,
    name: name?.trim() || email.split("@")[0],
    organizationId: org._id,
    role: assignedRole,
    requestedRole: pendingRole,
    requestStatus,
    requestedAt: pendingRole ? new Date() : null,
    departmentIds: [] as ObjectId[],
    themePreference: "dark",
    timezone: org.timezone || "UTC",
    status: "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection("wattwise_profiles").insertOne(profile);
  return { profile, created: true as const };
}
