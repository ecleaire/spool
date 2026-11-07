import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "../online/node_modules/playwright-core/index.mjs";
import { layoutIssues } from "./layout-audit.helpers.mjs";
const offline = readFileSync("dist/index.html", "utf8");
const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + [...offline.matchAll(/<style>[\s\S]*?<\/style>/g)].map((x) => x[0]).join("") + '<link rel="stylesheet" href="/online.css"><body class="simple-workspace"><button id="launch">ヘルプ</button><div id="cloud-panel"></div><script type="module">import{openHelp}from"/help.mjs";document.querySelector("#launch").onclick=openHelp;<\/script>';
const server = http.createServer((req, res) => {
  const path = req.url.split("?")[0];
  if (path === "/help.mjs") {
    res.setHeader("Content-Type", "application/javascript");
    res.end(readFileSync("online/help.mjs"));
  } else if (path === "/online.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(readFileSync("online-dist/online.css"));
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.SPOOL_CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:" + server.address().port);
  await page.locator("#launch").click();
  const topics = page.locator(".help-topic:visible");
  assert.ok(await topics.count() >= 35);
  assert.equal(await page.locator(".help-topic[open]").count(), 0);
  await page.locator('[data-help-group="共有ライブラリ"]').click();
  assert.equal(await page.locator("#spool-help-category").inputValue(), "共有ライブラリ");
  assert.ok(await topics.count() >= 4);
  assert.equal(await page.locator('[data-help-group="共有ライブラリ"]').getAttribute("aria-pressed"), "true");
  await page.locator("#spool-help-search").fill("共有 原本");
  assert.ok(await topics.count() > 0);
  assert.equal(await page.locator(".help-topic:visible:not([open])").count(), 0);
  await page.locator("#spool-help-search").fill("存在しないxyz");
  await page.locator("#spool-help-empty").waitFor();
  assert.equal(await topics.count(), 0);
  await page.locator("#spool-help-reset").click();
  assert.equal(await page.locator("#spool-help-search").inputValue(), "");
  assert.equal(await page.locator("#spool-help-category").inputValue(), "");
  assert.equal(await page.locator(".help-topic[open]").count(), 0);
  assert.equal(await page.locator("#spool-help-search").evaluate((x) => x === document.activeElement), true);
  await page.locator("#spool-help-search").fill("３ＭＦ プレート");
  assert.ok(await topics.count() > 0);
  assert.match(await topics.first().innerText(), /プレート/);
  await page.locator("#spool-help-search").fill("G-code");
  const codeCount = await topics.count();
  assert.ok(codeCount > 0);
  await page.locator("#spool-help-search").fill("ＧＣＯＤＥ");
  assert.equal(await topics.count(), codeCount);
  await page.locator("#spool-help-reset").click();
  await page.locator('[data-help-group="保存とトラブル"]').click();
  assert.ok(await topics.count() >= 4);
  await page.locator("#spool-help-category").selectOption("印刷予約");
  assert.ok(await topics.count() >= 5);
  await page.locator("#spool-help-reset").click();
  await page.locator(".help-topic>summary").first().click();
  await page.locator(".help-topic[open]").getByText("1. Googleでログインし、上部のライブラリ名を確認します。", { exact: true }).waitFor();
  const shots = process.env.SPOOL_SCREENSHOT_DIR;
  if (shots) mkdirSync(shots, { recursive: true });
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1440, 900], [667, 375], [844, 390]]) for (const font of [16, 20, 24]) {
    await page.setViewportSize({ width, height });
    await page.evaluate((font2) => document.documentElement.style.setProperty("--spool-type-floor", font2 + "px"), font);
    for (const position of [0, 1]) {
      await page.locator(".help-dialog .cloud-dialog-body").evaluate((el, f) => el.scrollTop = (el.scrollHeight - el.clientHeight) * f, position);
      assert.deepEqual(await page.evaluate(layoutIssues), [], `help ${width}x${height}, ${font}px, scroll ${position}`);
    }
    if (shots && font === 20 && [390, 1440].includes(width)) {
      await page.locator(".help-dialog .cloud-dialog-body").evaluate((el) => el.scrollTop = 0);
      await page.screenshot({ path: shots + "/help-" + width + ".png" });
    }
  }
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#spool-help-dialog").evaluate((x) => x.open), false);
  assert.equal(await page.locator("#launch").evaluate((x) => x === document.activeElement), true);
  await page.locator("#launch").click();
  assert.equal(await page.locator("#spool-help-dialog").count(), 1);
  assert.equal(await page.locator(".help-topic[open]").count(), 0);
  await page.getByRole("button", { name: "ヘルプを閉じる", exact: true }).click();
  assert.deepEqual(errors, []);
  console.log("PASS help: category shortcuts, AND/width-insensitive search, visible results, empty/reset, current guides, keyboard close/focus, repeat open and 36 layout checks across 18 viewport/font combinations.");
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
