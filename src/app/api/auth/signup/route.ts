import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const db = await getDb();

    const existingUser = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    // Save user
    const newUser = {
      email: email.toLowerCase(),
      passwordHash: password, // Simulated hash
      createdAt: new Date()
    };

    await db.collection("users").insertOne(newUser);

    return NextResponse.json({ 
      success: true, 
      user: { email: newUser.email }
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
