// Render press assets from the running dev server over the Chrome DevTools Protocol (no npm deps).
//   node scripts/press.mjs banner                → docs/img/banner.png + docs/img/banner-dark.png (2560×1280)
//   node scripts/press.mjs film [--from=0 --to=60] → press/sarkar-graph-launch.mp4 (1920×1080, 30 fps)
// Frames are sought, never recorded: the film page renders any instant exactly (window.__seek),
// so the video is identical on every run and frame-perfect regardless of machine speed.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const BASE = process.env.PRESS_BASE ?? "http://localhost:5190";
const BIN = `${homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [mode = "banner", ...args] = process.argv.slice(2);
const opt = (k, d) => Number(args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);

async function browser() {
  const port = 9300 + Math.floor(Math.random() * 600);
  const chrome = spawn(BIN, ["--headless", "--hide-scrollbars", "--force-color-profile=srgb", `--remote-debugging-port=${port}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
    } catch {}
    if (!target) await sleep(150);
  }
  if (!target) throw new Error("chrome did not start");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) pending.get(m.id)(m), pending.delete(m.id);
  });
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const close = () => (ws.close(), chrome.kill("SIGKILL"));
  return { send, evaluate, close };
}

async function open(url, w, h, scale, theme = "light") {
  const b = await browser();
  await b.send("Page.enable");
  await b.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: scale, mobile: false });
  await b.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
  await b.send("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem('sg-theme','${theme}')}catch(e){}` });
  await b.send("Page.navigate", { url });
  const t0 = Date.now();
  while (!(await b.evaluate("window.__ready === true"))) {
    if (Date.now() - t0 > 90000) throw new Error(`${url} never became ready`);
    await sleep(250);
  }
  return b;
}

async function shot(b, out, format = "png") {
  const r = await b.send("Page.captureScreenshot", { format, ...(format === "jpeg" ? { quality: 95 } : {}) });
  writeFileSync(out, Buffer.from(r.result.data, "base64"));
}

if (mode === "banner") {
  mkdirSync(join(ROOT, "docs/img"), { recursive: true });
  for (const theme of ["light", "dark"]) {
    const b = await open(`${BASE}/press/banner?theme=${theme}`, 1280, 640, 2, theme);
    await sleep(400);
    const out = join(ROOT, `docs/img/banner${theme === "dark" ? "-dark" : ""}.png`);
    await shot(b, out);
    b.close();
    console.log(`saved ${out}`);
  }
} else if (mode === "film") {
  const FPS = 30;
  const from = opt("from", 0),
    to = opt("to", 60);
  const workers = opt("workers", 4);
  const dir = join(ROOT, "press/frames");
  if (from === 0) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = [];
  for (let f = Math.round(from * FPS); f < Math.round(to * FPS); f++) frames.push(f);
  let done = 0;
  const t0 = Date.now();
  await Promise.all(
    Array.from({ length: workers }, async (_, w) => {
      const mine = frames.filter((_, i) => i % workers === w);
      const b = await open(`${BASE}/press/film`, 1920, 1080, 1);
      for (const f of mine) {
        await b.evaluate(`window.__seek(${f / FPS})`);
        await shot(b, join(dir, `${String(f).padStart(5, "0")}.jpg`), "jpeg");
        if (++done % 60 === 0) process.stdout.write(`\r${done}/${frames.length} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      b.close();
    }),
  );
  console.log(`\n${frames.length} frames → ${dir}`);
  if (from === 0 && to >= 60) {
    mkdirSync(join(ROOT, "press"), { recursive: true });
    const out = join(ROOT, "press/sarkar-graph-launch.mp4");
    const r = spawnSync(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(dir, "%05d.jpg"), "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", out],
      { stdio: "inherit" },
    );
    if (r.status === 0) console.log(`saved ${out}`);
  }
} else if (mode === "still") {
  // node scripts/press.mjs still <t> [out] — one film frame, for review
  const t = Number(args[0] ?? 0);
  const out = args[1] ?? join(ROOT, `.impeccable/review/film-${t}.png`);
  const b = await open(`${BASE}/press/film`, 1920, 1080, 1);
  await b.evaluate(`window.__seek(${t})`);
  await shot(b, out);
  b.close();
  console.log(`saved ${out}`);
}
