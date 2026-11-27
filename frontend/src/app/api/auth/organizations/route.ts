import { connection, NextResponse } from "next/server";
import { getWattwiseDb } from "@/lib/mongodb";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Public read-only directory search for organizations on the registration screen.
 * Exposes only non-sensitive display metadata (id, name, slug, industry).
 */
export async function GET(req: Request) {
  await connection();
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    const db = await getWattwiseDb();
    const filter: Record<string, unknown> = {};
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { industry: rx }, { slug: rx }];
    }

    const docs = await db
      .collection("organizations")
      .find(filter, {
        projection: { _id: 1, name: 1, slug: 1, industry: 1 },
      })
      .sort({ name: 1 })
      .limit(25)
      .toArray();

    return NextResponse.json({
      organizations: docs.map((o) => ({
        id: String(o._id),
        name: String(o.name),
        slug: String(o.slug || ""),
        industry: String(o.industry || "Commercial Real Estate"),
      })),
    });
  } catch (err) {
    console.error("Public organization directory lookup failed:", err);
    return NextResponse.json(
      { error: "Unable to search organizations right now." },
      { status: 500 }
    );
  }
}
