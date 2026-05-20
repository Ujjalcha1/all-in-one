import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { saveDeviceData } from "@/lib/device-db";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const deviceId = req.headers.get("x-device-id") || ip;
    const userAgent = req.headers.get("user-agent") || "";
    
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
        return NextResponse.json({ allowed: false, error: "User not found" }, { status: 404 });
      }

      // If user doesn't have a device bound yet, bind this one
      if (!user.deviceId) {
        await db.collection("users").updateOne({ email }, { $set: { deviceId } });
        return NextResponse.json({ allowed: true, count: 0, unlimited: true });
      }

      // If user's bound deviceId does not match the request's deviceId, deny access
      if (user.deviceId !== deviceId) {
        return NextResponse.json({ 
          allowed: false, 
          error: "This account is bound to another device. You can only use it on your registered device.",
          unlimited: false 
        });
      }

      return NextResponse.json({ allowed: true, count: 0, unlimited: true });
    }

    // Not logged in: Count logs across ALL tools by this deviceId or IP
    const count = await db.collection("logs").countDocuments({
      $or: [
        { deviceId },
        { ip }
      ]
    });

    if (count >= 1) {
      return NextResponse.json({ allowed: false, count, unlimited: false });
    }

    return NextResponse.json({ allowed: true, count: 0, unlimited: false });
  } catch (err) {
    console.error("Usage check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

