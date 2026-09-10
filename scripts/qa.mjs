import { chromium } from "playwright-core";
import fs from "node:fs";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4190";
const axe = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || "/opt/google/chrome/chrome",
  args: ["--no-sandbox"]
});
let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(ok ? "PASS" : "FAIL", label, detail);
  if (!ok) failures++;
};
const widths = [320, 360, 390, 430, 768, 1024, 1440, 1920];
const compactLangs = [["es","Español"],["ru","Русский"],["de","Deutsch"]];
for (const w of widths) {
  for (const [code, label] of (w <= 430 ? compactLangs : [compactLangs[0]])) {
    const p = await browser.newPage({ viewport: { width:w, height:w < 768 ? 844 : 1000 } });
    const errors = [], bad = [];
    p.on("pageerror", e => errors.push(String(e)));
    p.on("response", r => { if (r.status() >= 400) bad.push([r.status(), r.url()]); });
    await p.goto(base, { waitUntil:"networkidle" });
    if (code !== "es") {
      await p.locator('[aria-haspopup="menu"]').first().click();
      await p.getByRole("menuitem", { name:label, exact:true }).click();
      await p.waitForTimeout(40);
    }
    const st = await p.evaluate(() => {
      const r = document.documentElement;
      const h = document.querySelector(".header-main")?.getBoundingClientRect();
      const bars = [...document.querySelectorAll("*")].filter(e =>
        (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) &&
        getComputedStyle(e).scrollbarWidth !== "none").length;
      return { doc:[r.scrollWidth,r.clientWidth], header:h?[h.left,h.right]:null,
        lang:r.lang, bars, cards:document.querySelectorAll('#tendencias [data-collection-id="listings"]>*').length };
    });
    check(st.doc[0] === st.doc[1] && st.header[0] >= -.5 && st.header[1] <= w + .5 &&
      st.lang === code && st.bars === 0 && st.cards === 12 &&
      errors.length === 0 && bad.length === 0,
      "layout " + w + " " + code, JSON.stringify(st));
    await p.close();
  }
}
for (const [name,w,h] of [["mobile",390,844],["desktop",1440,1000]]) {
  for (const dark of [false,true]) {
    const ctx = await browser.newContext({ viewport:{width:w,height:h}, bypassCSP:true });
    const p = await ctx.newPage();
    await p.goto(base, { waitUntil:"networkidle" });
    if (dark) await p.getByRole("button", { name:"Modo oscuro" }).click();
    await p.addScriptTag({ content:axe });
    const result = await p.evaluate(async () =>
      await axe.run(document, { runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]} }));
    check(result.violations.length === 0, "axe " + name + " " + (dark ? "dark" : "light"));
    await ctx.close();
  }
}
const langs = [["es","Español"],["en","English"],["pt","Português"],["fr","Français"],
  ["de","Deutsch"],["it","Italiano"],["nl","Nederlands"],["ru","Русский"],
  ["pl","Polski"],["zh","中文"],["ja","日本語"]];
for (const [code,label] of langs) {
  const p = await browser.newPage({ viewport:{width:390,height:844} });
  await p.goto(base, { waitUntil:"networkidle" });
  if (code !== "es") {
    await p.locator('[aria-haspopup="menu"]').first().click();
    await p.getByRole("menuitem", { name:label, exact:true }).click();
    await p.waitForTimeout(30);
  }
  const st = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    overflow: document.documentElement.scrollWidth !== document.documentElement.clientWidth,
    raw: /\b(?:pf_|promo_|how_[1-4]_|safety_|footer_|plan_)[a-z0-9_]+\b/.test(document.body.innerText)
  }));
  check(st.lang === code && !st.raw && !st.overflow, "i18n " + code, JSON.stringify(st));
  await p.close();
}
const p = await browser.newPage({ viewport:{width:390,height:844} });
const errors = [], bad = [];
p.on("pageerror", e => errors.push(String(e)));
p.on("response", r => { if (r.status() >= 400) bad.push([r.status(), r.url()]); });
await p.goto(base, { waitUntil:"networkidle" });
await p.getByPlaceholder(/Buscar en mercasto.com/i).fill("Nissan");
await p.getByRole("button", { name:"Buscar", exact:true }).click();
await p.waitForTimeout(80);
check(await p.locator('#tendencias [data-collection-id="listings"]>*').count() === 1, "search Nissan");
await p.getByPlaceholder(/Buscar en mercasto.com/i).fill("");
await p.getByRole("button", { name:"Filtros", exact:true }).first().click();
await p.getByPlaceholder("Ubicación").fill("CDMX");
await p.waitForTimeout(60);
check(await p.locator('#tendencias [data-collection-id="listings"]>*').count() === 4, "filter CDMX");
await p.getByRole("button", { name:"Filtros", exact:true }).first().click();
await p.locator('#tendencias [data-collection-id="listings"]>* button[aria-label="favorite"]').first().click();
await p.getByRole("button", { name:"Favoritos", exact:true }).click();
await p.waitForTimeout(40);
check(await p.locator('#tendencias [data-collection-id="listings"]>*').count() === 1, "favorites");
await p.getByRole("button", { name:"Favoritos", exact:true }).click();
await p.locator(".publish-button").click();
const title = "QA Persist " + Date.now();
await p.locator('[role="dialog"] input').nth(0).fill(title);
await p.locator('[role="dialog"] button[role="combobox"]').click();
await p.getByRole("option", { name:"Productos" }).click();
await p.locator('[role="dialog"] input[type="number"]').fill("321");
await p.getByRole("button", { name:"Publicar", exact:true }).last().click();
await p.waitForTimeout(180);
await p.reload({ waitUntil:"networkidle" });
await p.getByPlaceholder(/Buscar en mercasto.com/i).fill(title);
await p.getByRole("button", { name:"Buscar", exact:true }).click();
await p.waitForTimeout(60);
check(await p.locator('#tendencias [data-collection-id="listings"]>*').count() === 1, "publish persists");
const media = await p.evaluate(async () => {
  const src = [...new Set([...document.images].map(x => x.getAttribute("src")).filter(Boolean))];
  const rows = await Promise.all(src.map(async s => { const r = await fetch(s); return [s,r.status]; }));
  const bars = [...document.querySelectorAll("*")].filter(e =>
    (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) &&
    getComputedStyle(e).scrollbarWidth !== "none").length;
  return {
    png: src.filter(s => s.endsWith(".png")).length,
    webp: src.filter(s => s.endsWith(".webp")).length,
    bad: rows.filter(x => x[1] !== 200),
    bars
  };
});
check(media.png === 0 && media.webp > 0 && media.bad.length === 0 && media.bars === 0,
  "media + scrollbars", JSON.stringify(media));
check(errors.length === 0 && bad.length === 0, "runtime errors", JSON.stringify({errors,bad}));
await p.close();
await browser.close();
if (failures) {
  console.error("QA FAILED: " + failures);
  process.exit(1);
}
console.log("QA PASSED");
