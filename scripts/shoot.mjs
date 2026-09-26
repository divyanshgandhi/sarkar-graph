// Deterministic screenshots over the Chrome DevTools Protocol (no npm deps; Node 22 global WebSocket).
//   node scripts/shoot.mjs <url> <out.png> [width] [height] [scale] [waitSelector] [--dark] [--click=<css>] [--full]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";

const [url, out, w = "1440", h = "900", scale = "1", waitSel = "svg[role=img] .wheel-node", ...flags] = process.argv.slice(2);
const dark = flags.includes("--dark");
const full = flags.includes("--full");
const click = flags.find((f) => f.startsWith("--click="))?.slice(8);
const BIN = `${homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(BIN, ["--headless", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find((t) => t.type === "page");
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
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: +scale, mobile: +w < 768 });
  if (+w < 768) await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: dark ? "dark" : "light" }] });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem('sg-theme','${dark ? "dark" : "light"}')}catch(e){}` });
  await send("Page.navigate", { url });
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) {
    const ok = await evaluate(`!!document.querySelector(${JSON.stringify(waitSel)})`);
    if (ok) break;
    await sleep(300);
  }
  if (click) {
    await evaluate(`document.querySelector(${JSON.stringify(click)})?.click()`);
    await sleep(1800);
  }
  await sleep(2200); // let the spring settle and live data arrive
  let clip;
  if (full) {
    const dims = await evaluate(`({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight})`);
    clip = { x: 0, y: 0, width: dims.w, height: dims.h, scale: 1 };
  }
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: !!full, ...(clip ? { clip } : {}) });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log(`saved ${out}`);
} finally {
  ws.close();
  chrome.kill("SIGKILL");
}
