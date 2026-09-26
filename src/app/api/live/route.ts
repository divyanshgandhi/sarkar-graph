import { getLive } from "@/lib/server/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getLive();
    return Response.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
