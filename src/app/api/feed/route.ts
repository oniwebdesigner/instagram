import { NextRequest, NextResponse } from "next/server";
import { getFeedPage } from "@/lib/feed";
import { IgramError } from "@/lib/igram";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const username = (sp.get("username") ?? "").trim().replace(/^@/, "");
  const kind = sp.get("kind");
  const cursor = sp.get("cursor") ?? undefined;

  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "Username i pavlefshëm." }, { status: 400 });
  }
  if (kind !== "posts" && kind !== "reels") {
    return NextResponse.json({ error: "Lloj i pavlefshëm." }, { status: 400 });
  }
  if (cursor && cursor.length > 1000) {
    return NextResponse.json({ error: "Cursor i pavlefshëm." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getFeedPage(username, kind, cursor));
  } catch (e) {
    if (e instanceof IgramError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("feed route error:", e);
    return NextResponse.json({ error: "Gabim i papritur." }, { status: 500 });
  }
}
