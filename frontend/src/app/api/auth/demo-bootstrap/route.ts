import { NextResponse } from "next/server";
import { ensureDemoAuthUsers } from "@/lib/demo-users";

export async function POST() {
  try {
    await ensureDemoAuthUsers();
    return NextResponse.json({ ready: true });
  } catch (err) {
    console.error("Demo bootstrap failed:", err);
    return NextResponse.json({ error: "Demo bootstrap failed" }, { status: 500 });
  }
}
