import { NextRequest, NextResponse } from "next/server";
import { search, SearchError, type SearchResult } from "@/lib/search";

const cache = new Map<string, { at: number; data: SearchResult }>();
const TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "")
    .trim()
    .replace(/^[@#]/, "")
    .slice(0, 50);

  // [...q] numëron emoji-t si një karakter
  if ([...q].length < 2) return NextResponse.json({ users: [], hashtags: [] });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data);

  try {
    const data = await search(q);
    cache.set(key, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof SearchError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("search route error:", e);
    return NextResponse.json({ error: "Gabim i papritur." }, { status: 500 });
  }
}
