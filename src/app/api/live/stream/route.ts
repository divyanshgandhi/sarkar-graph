import { getLive } from "@/lib/server/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Server-sent events: pushes a fresh snapshot whenever the feeds turn up something new.
export async function GET(req: Request) {
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    async start(controller) {
      let lastKey = "";
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const tick = async () => {
        try {
          const p = await getLive();
          const key = `${p.news[0]?.id ?? ""}|${p.articleCount}|${p.changes.items[0]?.id ?? ""}`;
          if (key !== lastKey) {
            lastKey = key;
            send("snapshot", p);
          }
        } catch (e) {
          send("problem", { message: (e as Error).message });
        }
      };
      controller.enqueue(enc.encode(`retry: 15000\n\n`));
      await tick();
      timer = setInterval(tick, 60_000);
      ping = setInterval(() => controller.enqueue(enc.encode(`: ping\n\n`)), 25_000);
      req.signal.addEventListener("abort", () => {
        clearInterval(timer);
        clearInterval(ping);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      clearInterval(timer);
      clearInterval(ping);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
