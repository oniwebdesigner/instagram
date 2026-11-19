import { NextRequest, NextResponse } from "next/server";
import { getProfile, IgramError, type Profile } from "@/lib/igram";

// Cache i thjeshtë në memorie (5 min) që të mos harxhohen kreditet e API-t.
const cache = new Map<string, { at: number; data: Profile }>();
const TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("username") ?? "").trim().replace(/^@/, "");

  if (!/^[A-Za-z0-9._]{1,30}$/.test(raw)) {
    return NextResponse.json({ error: "Shkruaj një username të vlefshëm." }, { status: 400 });
  }

  const key = raw.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data);

  try {
    const data = await getProfile(raw);
    cache.set(key, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof IgramError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Gabim i papritur." }, { status: 500 });
  }
}
