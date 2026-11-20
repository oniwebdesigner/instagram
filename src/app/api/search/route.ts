import { NextRequest, NextResponse } from "next/server";
import { searchUsers, SearchError, type SearchUser } from "@/lib/search";

const cache = new Map<string, { at: number; users: SearchUser[] }>();
const TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "")
    .trim()
    .replace(/^@/, "")
    .slice(0, 50);

  // [...q] numëron emoji-t si një karakter
  if ([...q].length < 2) return NextResponse.json({ users: [] });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ users: hit.users });

  try {
    const users = await searchUsers(q);
    cache.set(key, { at: Date.now(), users });
    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof SearchError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("search route error:", e);
    return NextResponse.json({ error: "Gabim i papritur." }, { status: 500 });
  }
}
