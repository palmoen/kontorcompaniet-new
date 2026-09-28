import { NextResponse, type NextRequest } from "next/server";
import { getAuthClient } from "@/lib/supabase/auth";

/** Magisk lenke fra Supabase → utveksle kode mot sesjon → admin */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await getAuthClient();
  if (code && supabase) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/admin", request.url));
}
