import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureStorageReady } from "@/lib/storage/server";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks = { database: "failed", storage: "failed" };
  try {
    await getDb().then((db) => db.command({ ping: 1 }));
    checks.database = "ok";
    await ensureStorageReady();
    checks.storage = "ok";
    return NextResponse.json(
      { status: "ok", checks },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError("readiness", "check dependencies", error);
    return NextResponse.json(
      { status: "unavailable", checks },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
