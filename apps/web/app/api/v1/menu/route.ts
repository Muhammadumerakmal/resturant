import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@repo/db";
import { menuItems } from "@repo/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/menu -> MenuItem[]
export async function GET() {
  const items = await db
    .select()
    .from(menuItems)
    .orderBy(asc(menuItems.category), asc(menuItems.name));
  return NextResponse.json(items);
}
