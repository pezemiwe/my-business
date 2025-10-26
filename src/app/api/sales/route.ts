import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  if (body.email === "test@example.com" && body.password === "123456") {
    return NextResponse.json({ success: true, message: "Login successful" });
  }

  return NextResponse.json(
    { success: false, message: "Invalid credentials" },
    { status: 401 }
  );
}

export async function GET() {
  return NextResponse.json({ message: "Auth route active" });
}
