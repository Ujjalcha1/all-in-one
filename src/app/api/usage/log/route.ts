import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { saveDeviceData } from "@/lib/device-db";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const deviceId = req.headers.get("x-device-id") || ip;
    const userAgent = req.headers.get("user-agent") || "";
    
    let tool = "pdf-forms";
    try {
      const body = await req.json();
      if (body && body.tool) {
        tool = body.tool;
      }
    } catch {}

    const isLoggedIn = authHeader && authHeader.startsWith("Bearer mock-jwt-token-for-");
    const db = await getDb();

    let email: string | null = null;
    if (isLoggedIn) {
      email = authHeader.replace("Bearer mock-jwt-token-for-", "").trim().toLowerCase();
    }

    // Save device data in the database
    await saveDeviceData(db, deviceId, email, userAgent, ip);

    if (isLoggedIn && email) {
      const user = await db.collection("users").findOne({ email });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // If user doesn't have a device bound yet, bind this one
      if (!user.deviceId) {
        await db.collection("users").updateOne({ email }, { $set: { deviceId } });
      } else if (user.deviceId !== deviceId) {
        return NextResponse.json({ 
          success: false, 
          error: "This account is bound to another device. You can only use tools on your registered device." 
        }, { status: 403 });
      }
    } else {
      // Not logged in: Count logs across ALL tools by this deviceId or IP
      const count = await db.collection("logs").countDocuments({
        $or: [
          { deviceId },
          { ip }
        ]
      });
      if (count >= 1) {
        return NextResponse.json({ 
          success: false, 
          error: "Limit exceeded. Please login for unlimited access." 
        }, { status: 429 });
      }
    }

    // Insert log
    await db.collection("logs").insertOne({
      ip,
      deviceId,
      timestamp: new Date(),
      tool
    });

    const totalCount = await db.collection("logs").countDocuments({
      $or: [
        { deviceId },
        { ip }
      ]
    });

    return NextResponse.json({ success: true, count: totalCount });
  } catch (err) {
    console.error("Usage log error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

