import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { saveDeviceData } from "@/lib/device-db";
import { User } from "@/models/User";
import { Log } from "@/models/Log";

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
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // If user doesn't have a device bound yet, bind this one
      if (!user.deviceId) {
        await User.updateOne({ email }, { $set: { deviceId } });
      } else if (user.deviceId !== deviceId) {
        return NextResponse.json({ 
          success: false, 
          error: "This account is bound to another device. You can only use tools on your registered device." 
        }, { status: 403 });
      }
    } else {
      // Not logged in: Count logs across ALL tools by this deviceId or IP
      const count = await Log.countDocuments({
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
    await Log.create({
      ip,
      deviceId,
      tool,
      timestamp: new Date()
    });

    const totalCount = await Log.countDocuments({
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
