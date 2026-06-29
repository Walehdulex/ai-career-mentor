import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const validUser = process.env.ADMIN_USERNAME;
  const validPass = process.env.ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }

  if (username !== validUser || password !== validPass) {
    // Delay to slow brute force
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Set httpOnly cookie — not readable by JS, secure in production
  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", btoa(`${username}:${Date.now()}`), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return response;
}

export async function DELETE() {
  // Logout
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("admin_session");
  return response;
}