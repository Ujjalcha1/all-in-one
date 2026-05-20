import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    
    let tool = "pdf-forms";
    try {
      const body = await req.json();
      if (body && body.tool) {
        tool = body.tool;
      }
    } catch (_) {}

    const isLoggedIn = authHeader && authHeader.startsWith("Bearer mock-jwt-token-for-");
    const db = await getDb();

    if (!isLoggedIn) {
      // Count existing actions for this specific tool and IP
      const count = await db.collection("logs").countDocuments({ ip, tool });
      if (count >= 1) {
        return NextResponse.json({ 
          success: false, 
          error: `Limit exceeded for ${tool}. Please login for unlimited access.` 
        }, { status: 429 });
      }
    }

    // Insert log
    await db.collection("logs").insertOne({
      ip,
      timestamp: new Date(),
      tool
    });

    const totalCount = await db.collection("logs").countDocuments({ ip, tool });

    return NextResponse.json({ success: true, count: totalCount });
  } catch (err: any) {
    console.error("Usage log error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
