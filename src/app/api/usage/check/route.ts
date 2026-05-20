import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { saveDeviceData } from "@/lib/device-db";
import { User } from "@/models/User";
import { Log } from "@/models/Log";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const deviceId = req.headers.get("x-device-id") || ip;
    const userAgent = req.headers.get("user-agent") || "";
    
    const isLoggedIn = authHeader && authHeader.startsWith("Bearer mock-jwt-token-for-");
    
    await connectToDatabase();
    
    let email: string | null = null;
    if (isLoggedIn && authHeader) {
      email = authHeader.replace("Bearer mock-jwt-token-for-", "").trim().toLowerCase();
    }

    // Save device data in the database
    await saveDeviceData(deviceId, email, userAgent, ip);

    if (isLoggedIn && email) {
      const user = await User.findOne({ email });
      
      if (!user) {
        return NextResponse.json({ allowed: false, error: "User not found" }, { status: 404 });
      }

      // If user doesn't have a device bound yet, bind this one
      if (!user.deviceId) {
        await User.updateOne({ email }, { $set: { deviceId } });
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
    const count = await Log.countDocuments({
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
