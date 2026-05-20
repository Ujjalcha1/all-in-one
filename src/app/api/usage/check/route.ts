import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    
    // Read the specific tool name from query string
    const { searchParams } = new URL(req.url);
    const tool = searchParams.get("tool") || "pdf-forms";
    
    const isLoggedIn = authHeader && authHeader.startsWith("Bearer mock-jwt-token-for-");
    
    if (isLoggedIn) {
      return NextResponse.json({ allowed: true, count: 0, unlimited: true });
    }

    const db = await getDb();
    // Count actions by this IP for this specific tool
    const count = await db.collection("logs").countDocuments({ ip, tool });

    if (count >= 1) {
      return NextResponse.json({ allowed: false, count, unlimited: false });
    }

    return NextResponse.json({ allowed: true, count: 0, unlimited: false });
  } catch (err: any) {
    console.error("Usage check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
