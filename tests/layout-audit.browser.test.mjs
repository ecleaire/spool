import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import { chromium } from "../online/node_modules/playwright-core/index.mjs";
import { layoutIssues } from "./layout-audit.helpers.mjs";
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(readFileSync("dist/index.html"));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.SPOOL_CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const out = process.env.SPOOL_SCREENSHOT_DIR || "/tmp/spool-layout-audit";
mkdirSync(out, { recursive: true });
const failures = [];
let checks = 0;
try {
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("spool-inventory-v1", JSON.stringify(Array.from({ length: 6 }, (_, i) => ({ id: "audit-" + i, name: "\u9577\u3044\u30D5\u30A3\u30E9\u30E1\u30F3\u30C8\u540D\u30FB\u5370\u5237\u7528\u30D5\u30A3\u30E9\u30E1\u30F3\u30C8 PLA Silk", brand: "\u30D6\u30E9\u30F3\u30C9\u540D\u306E\u9577\u3044\u30E1\u30FC\u30AB\u30FC", material: "PLA", variant: "PLA Silk", colorName: "\u534A\u900F\u660E\u30E9\u30A4\u30C8\u30D6\u30EB\u30FC\u30FB\u30A2\u30A4\u30DC\u30EA\u30FC\u30DB\u30EF\u30A4\u30C8", color: "#72B4D4", remaining: 98765, capacity: 1e5, diameter: "1.75", image: "", location: "\u4FDD\u7BA1\u5834\u6240\u306E\u8AAC\u660E\u304C\u9577\u3044\u68DA\u30FB\u4F5C\u696D\u90E8\u5C4B\u306E\u30D5\u30A3\u30E9\u30E1\u30F3\u30C8\u53CE\u7D0D\u30B1\u30FC\u30B9", tags: ["\u3088\u304F\u4F7F\u3046", "\u534A\u900F\u660E", "\u30C6\u30B9\u30C8\u7528\u306E\u9577\u3044\u30BF\u30B0"], amazonUrl: "https://example.com/amazon", shopUrl: "https://example.com/shop" }))));
    const file = { id: "file", name: "\u975E\u5E38\u306B\u9577\u3044\u30D5\u30A1\u30A4\u30EB\u540D\u306E\u5370\u5237\u7528\u30C7\u30FC\u30BF\u30FB\u8A66\u4F5C\u30E2\u30C7\u30EB\u30FB\u30D0\u30EA\u30A8\u30FC\u30B7\u30E7\u30F32.3mf", size: 3, kind: "embedded", data: "data:application/octet-stream;base64,YWJj" };
    localStorage.setItem("spool-inventory-v1-reservations", JSON.stringify([{ id: "audit-booking", title: "\u88FD\u4F5C\u8005\u3068\u30E2\u30C7\u30EB\u30C7\u30FC\u30BF\u304C\u591A\u3044\u4E88\u7D04\u306E\u9577\u3044\u4F5C\u54C1\u540D\u30FB\u8A66\u4F5C\u54C1\u4E00\u5F0F", creator: "\u88FD\u4F5C\u8005\u540D\u306E\u9577\u3044\u30A2\u30AB\u30A6\u30F3\u30C8\u30FB\u5171\u540C\u4F5C\u696D\u8005", registeredDate: "2026-11-08", weekday: "\u65E5", className: "", desiredColor: "\u534A\u900F\u660E\u30E9\u30A4\u30C8\u30D6\u30EB\u30FC\u30FB\u30A2\u30A4\u30DC\u30EA\u30FC\u30DB\u30EF\u30A4\u30C8", color: "#72B4D4", printMinutes: 59999, printStatus: "\u5370\u5237\u4E88\u5B9A", deadline: "2026-11-15", tags: ["\u6025\u304E", "\u5C55\u793A\u7528"], files: ["C:\\Models\\\u4FDD\u5B58\u5148\u306E\u9577\u3044\u30E2\u30C7\u30EB\u30C7\u30FC\u30BF.STL", "\u53D7\u3051\u6E21\u3057\u5834\u6240\u306B\u3064\u3044\u3066\u306E\u9577\u3044\u30E1\u30E2\u30FB\u62C5\u5F53\u8005\u306B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"], attachments: [file, { ...file, id: "file2", name: "2\u756A\u76EE\u306E\u5370\u5237\u30C7\u30FC\u30BF.gcode" }] }]));
  });
  await page.goto("http://127.0.0.1:" + server.address().port);
  // Capture final geometry, not an intermediate navigation colour transition.
  await page.addStyleTag({content:"*,*::before,*::after{transition:none!important;animation:none!important}"});
  const inspect = async (label) => {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    checks++;
    const issues = await page.evaluate(layoutIssues);
    if (issues.length) {
      failures.push({ label, issues });
      if (failures.length <= 12) await page.screenshot({ path: out + "/failure-" + failures.length + ".png" });
    }
  };
  for (const [width, height] of [[320, 568], [360, 740], [390, 844], [430, 932], [600, 800], [768, 1024], [820, 1180], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [667, 375], [844, 390]]) for (const font of [16, 20, 24]) {
    await page.setViewportSize({ width, height });
    await page.evaluate((font2) => document.documentElement.style.setProperty("--spool-type-floor", font2 + "px"), font);
    const key = width + "x" + height + " / " + font + "px";
    await page.evaluate(() => {
      showBookingView(false);
      selected.clear();
      updateSelection();
    });
    for (const mode of ["list", "split", "grid", "simple"]) {
      await page.evaluate((mode2) => changeView(mode2), mode);
      await inspect(key + " " + mode);
      if (font === 24 && mode === "list" && [390, 768, 1440].includes(width)) await page.screenshot({ path: out + "/list-" + width + ".png" });
    }
    await page.evaluate(() => {
      selected.add("audit-0");
      updateSelection();
    });
    await inspect(key + " selected");
    await page.evaluate(() => {
      selected.clear();
      updateSelection();
      showBookingView(true);
    });
    await inspect(key + " bookings");
    await page.evaluate(() => {
      $("#bookingFilters").open = true;
      $$(".booking-row-details").forEach((x) => x.open = true);
    });
    await inspect(key + " booking details");
    for (const kind of ["filament", "editor", "booking", "review"]) {
      await page.evaluate((kind2) => {
        if (kind2 === "filament") openFilamentDetails("audit-0");
        if (kind2 === "editor") {
          openEditor("audit-0");
          $("#stockDetails").open = true;
          $("#materialDetails").open = true;
        }
        if (kind2 === "booking") {
          openBooking("audit-booking");
          for (const id of ["bookingExtraDetails", "bookingFileDetails", "bookingUsageDetails"]) $("#" + id).open = true;
        }
        if (kind2 === "review") openBookingReview("audit-booking");
      }, kind);
      for (const fraction of [0, 1]) {
        await page.evaluate((fraction2) => {
          const d = document.querySelector("dialog[open]");
          for (const node of d.querySelectorAll(".editor-layout,.booking-form-scroll,.booking-review-body,#filamentDetailsBody")) node.scrollTop = (node.scrollHeight - node.clientHeight) * fraction2;
        }, fraction);
        await inspect(key + " " + kind + " scroll " + fraction);
      }
      await page.evaluate(() => {
        for (const d of document.querySelectorAll("dialog[open]")) d.close();
      });
    }
  }
  assert.deepEqual(errors, [], "No application runtime errors");
  writeFileSync(out + "/report.json", JSON.stringify({ checks, failures }, null, 2));
  console.log(JSON.stringify({ checks, failingScenarios: failures.length, examples: failures.slice(0, 16) }, null, 2));
  assert.equal(failures.length, 0, "Layout audit: see " + out + "/report.json");
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
