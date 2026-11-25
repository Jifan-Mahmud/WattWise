import { auth } from "./auth";
import { getWattwiseDb } from "./mongodb";

export const DEMO_ACCOUNTS = [
  {
    email: "admin@wattwise.io",
    name: "Elena Rostova",
    role: "Organization Admin",
    org: "Northgrid Commercial Holdings",
    description: "Full organization, building, floor, department, meter, and user control.",
  },
  {
    email: "facility@wattwise.io",
    name: "Marcus Vance",
    role: "Facility Manager",
    org: "Northgrid Commercial Holdings",
    description: "Manage meters, configure alert thresholds, resolve anomalies, export reports.",
  },
  {
    email: "dept@wattwise.io",
    name: "Nadia Chen",
    role: "Department Manager",
    org: "Northgrid Commercial Holdings",
    description: "Scoped access to assigned department usage, costs, history, and insights.",
  },
  {
    email: "viewer@wattwise.io",
    name: "Tariq Al-Mansoor",
    role: "Viewer",
    org: "Northgrid Commercial Holdings",
    description: "Read-only access to dashboards, analytics, comparisons, and reports.",
  },
] as const;

export const DEMO_PASSWORD = "WattWise#2026!";

let bootstrapped = false;

export async function ensureDemoAuthUsers() {
  if (bootstrapped) return;
  const db = await getWattwiseDb();

  for (const acct of DEMO_ACCOUNTS) {
    const existing = await db.collection("user").findOne({ email: acct.email });
    if (!existing) {
      try {
        await auth.api.signUpEmail({
          body: {
            email: acct.email,
            password: DEMO_PASSWORD,
            name: acct.name,
          },
        });
      } catch {
        // Ignore race condition if user was created concurrently
      }
    }
  }

  bootstrapped = true;
}
