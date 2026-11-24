import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium, webkit } from "playwright";

const sizes = [
  [320, 568],
  [375, 667],
  [390, 844],
  [393, 852],
  [402, 874],
  [430, 932],
  [440, 956],
];
const tabs = [
  "Genel",
  "Bankalar",
  "Mevduat",
  "Yatırımlar",
  "Kredi kartları",
  "Hedefler",
];
const kinds = [
  "Gelir",
  "Gider",
  "Transfer",
  "Kart ödemesi",
  "Banka hesabı",
  "Kredi kartı",
  "Mevduat",
  "Yatırım",
  "Hedef",
  "Kategori ve bütçe",
];
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
const root = resolve("dist");
let revision = 0;
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (!pathname.startsWith("/finans360/")) throw new Error();
    const file = resolve(
      root,
      pathname.slice("/finans360/".length) || "index.html",
    );
    if (!file.startsWith(root + "/")) throw new Error();
    let body = await readFile(file);
    if (revision && pathname.endsWith("/sw.js")) {
      body = Buffer.from(
        body
          .toString()
          .replace(/finans360-[0-9a-f]{16}/, (value) => value + "-regression"),
      );
    }
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
const browser = await (
  process.env.MOBILE_ENGINE === "webkit" ? webkit : chromium
).launch(
  process.env.MOBILE_BROWSER
    ? { executablePath: process.env.MOBILE_BROWSER }
    : undefined,
);
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = "http://127.0.0.1:" + server.address().port + "/finans360/";
  const screenshots = process.env.MOBILE_SCREENSHOTS;
  if (screenshots) await mkdir(screenshots, { recursive: true });

  for (const [width, height] of sizes) {
    revision = 0;
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    const requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    context.on("request", (request) =>
      requests.push({
        url: request.url(),
        method: request.method(),
        data: request.postData(),
      }),
    );
    const nav = (name) =>
      page
        .getByRole("navigation", { name: "Ana menü" })
        .getByRole("button", { name, exact: true });
    const settings = () =>
      page.getByRole("button", { name: "Ayarlar", exact: true }).click();
    const close = () =>
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Kapat", exact: true })
        .click();
    const layout = async (label) => {
      const result = await page.evaluate(() => {
        const nav = document.querySelector(".nav").getBoundingClientRect();
        const main = document.querySelector(".shell main");
        const overflow = [...document.querySelectorAll(".amount")]
          .filter((el) => {
            const text = el.firstElementChild;
            return (
              el.clientWidth > 0 &&
              (text.getBoundingClientRect().width > el.clientWidth + 1 ||
                getComputedStyle(text).whiteSpace !== "nowrap")
            );
          })
          .map((e) => e.textContent);
        const dates = [...document.querySelectorAll("input[type=date]")]
          .filter((e) => e.offsetWidth)
          .map((e) => e.getBoundingClientRect());
        const out = dates.some((e) => e.left < 0 || e.right > innerWidth + 1);
        const overlapping = dates.some((a, i) =>
          dates
            .slice(i + 1)
            .some(
              (b) =>
                a.left < b.right - 0.5 &&
                a.right > b.left + 0.5 &&
                a.top < b.bottom - 0.5 &&
                a.bottom > b.top + 0.5,
            ),
        );
        const chartOverflow = [...document.querySelectorAll(".chart")].some(
          (e) => e.scrollWidth > e.clientWidth + 1,
        );
        return {
          bottom: nav.bottom,
          top: nav.top,
          touch: [...document.querySelectorAll(".nav button")].every(
            (e) => e.offsetHeight >= 44,
          ),
          width: innerWidth,
          height: innerHeight,
          doc: document.documentElement.scrollWidth,
          topOverflow:
            document.querySelector(".top").scrollWidth >
            document.querySelector(".top").clientWidth + 1,
          main: main.clientWidth,
          scroll: main.scrollWidth,
          out,
          overlapping,
          overflow,
          chartOverflow,
        };
      });
      assert.ok(
        Math.abs(result.bottom - result.height) < 2,
        label + " nav: " + JSON.stringify(result),
      );
      assert.ok(
        result.doc <= width + 1 &&
          !result.topOverflow &&
          result.scroll <= result.main + 1 &&
          !result.out &&
          !result.overlapping &&
          !result.chartOverflow,
        label + " overflow: " + JSON.stringify(result),
      );
      assert.deepEqual(result.overflow, [], label + " amount");
      assert.equal(result.touch, true, label + " touch target");
      return result.top;
    };
    const form = async (label) => {
      const dialog = page.getByRole("dialog", { name: label, exact: true });
      await dialog.waitFor();
      const button = dialog.getByRole("button", {
        name: "Kaydet",
        exact: true,
      });
      await button.scrollIntoViewIfNeeded();
      const bounds = await button.boundingBox();
      assert.ok(
        bounds && bounds.y >= 0 && bounds.y + bounds.height <= height + 1,
        label + " save",
      );
      await layout(width + " form " + label);
      await close();
    };
    await page.goto(address);
    await page.getByText("İlk işleminizi ekleyin.").waitFor();
    for (const demo of [false, true]) {
      if (demo) {
        await settings();
        await page.getByRole("button", { name: "Örnek verileri aç" }).click();
        await nav("Özet").click();
        await page.getByText("Örnek veri", { exact: true }).waitFor();
        await page
          .getByRole("button", { name: "Gelir ekle", exact: true })
          .click();
        const dialog = page.getByRole("dialog", { name: "Gelir", exact: true });
        await dialog
          .getByLabel("Ad", { exact: true })
          .fill("Büyük tutar testi");
        await dialog
          .getByLabel("Tutar (₺)", { exact: true })
          .fill("12500000,99");
        await dialog
          .getByLabel("Alıcı hesap")
          .selectOption({ label: "Vadesiz hesap" });
        await dialog
          .getByRole("button", { name: "Kaydet", exact: true })
          .click();
        await dialog.waitFor({ state: "hidden" });
      }
      for (const light of [false, true]) {
        if (light)
          await page
            .getByRole("button", { name: "Aydınlık tema", exact: true })
            .click();
        else if (
          await page
            .getByRole("button", { name: "Karanlık tema", exact: true })
            .count()
        )
          await page
            .getByRole("button", { name: "Karanlık tema", exact: true })
            .click();
        const state =
          width +
          " " +
          (demo ? "demo" : "boş") +
          " " +
          (light ? "açık" : "koyu");
        await nav("Özet").click();
        const baseline = await layout(state + " Özet");
        if (demo && screenshots && width === 320)
          await page.screenshot({
            path: screenshots + "/ozet-" + (light ? "acik" : "koyu") + ".png",
          });
        await nav("Varlıklar").click();
        for (const name of tabs) {
          await page
            .getByRole("group", { name: "Varlık türü" })
            .getByRole("button", { name, exact: true })
            .click();
          assert.ok(
            Math.abs((await layout(state + " " + name)) - baseline) < 1,
            "Özet / " + name + " navigasyon farkı",
          );
          if (
            demo &&
            screenshots &&
            name === "Hedefler" &&
            width === 390 &&
            !light
          )
            await page.screenshot({ path: screenshots + "/hedefler.png" });
        }
        await nav("İşlemler").click();
        await layout(state + " İşlemler");
        await page.getByText("Filtreler", { exact: true }).click();
        await layout(state + " İşlem filtreleri");
        await page.getByText("Filtreler", { exact: true }).click();
        for (const name of ["Raporlar", "Takvim"]) {
          await nav(name).click();
          await layout(state + " " + name);
          if (
            demo &&
            screenshots &&
            width === 390 &&
            !light &&
            name === "Raporlar"
          ) {
            await page
              .getByRole("heading", { name: "Gelirin kullanımı" })
              .scrollIntoViewIfNeeded();
            await page.screenshot({ path: screenshots + "/raporlar.png" });
          }
        }
        await settings();
        await layout(state + " Ayarlar");
        if (demo) {
          await nav("Özet").click();
          for (const label of kinds) {
            await page
              .getByRole("button", { name: "Yeni kayıt", exact: true })
              .click();
            await page
              .getByRole("dialog", { name: "Yeni kayıt" })
              .getByRole("button", { name: label, exact: true })
              .click();
            await form(label);
          }
          await nav("Varlıklar").click();
          const asset = (name) =>
            page
              .getByRole("group", { name: "Varlık türü" })
              .getByRole("button", { name, exact: true });
          await asset("Bankalar").click();
          await page
            .getByRole("button", { name: "Bakiyeyi düzelt", exact: true })
            .click();
          await form("Bakiye düzeltmesi");
          await asset("Yatırımlar").click();
          await page
            .getByRole("button", { name: "Geçmiş değer kaydet", exact: true })
            .click();
          await form("Portföy değeri");
          await page
            .getByRole("button", { name: "Alım / satım kaydet", exact: true })
            .click();
          await form("Yatırım hareketi");
        }
      }
    }
    if (width === 390) {
      await nav("Raporlar").click();
      for (const [label, pattern] of [
        ["Rapor Excel", /\.xlsx$/],
        ["Rapor PDF", /\.pdf$/],
      ]) {
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: label, exact: true }).click();
        const file = await download;
        assert.match(file.suggestedFilename(), pattern);
        const bytes = await readFile(await file.path());
        assert.ok(bytes.length > 600);
        assert.equal(
          bytes.subarray(0, label.endsWith("PDF") ? 4 : 2).toString(),
          label.endsWith("PDF") ? "%PDF" : "PK",
        );
      }
      await settings();
      const normalDownload = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Normal JSON yedeği indir" })
        .click();
      const original = JSON.parse(
        await readFile(await (await normalDownload).path(), "utf8"),
      );
      assert.equal(original.mode, "demo");
      assert.ok(original.records.some((e) => e.name === "Büyük tutar testi"));
      await page.getByText("Şifreli JSON yedeği", { exact: true }).click();
      await page
        .getByLabel("Yedek parolası", { exact: true })
        .fill("örnek güçlü parola");
      await page
        .getByLabel("Yedek parolası doğrulaması", { exact: true })
        .fill("başka örnek parola");
      await page
        .getByRole("button", { name: "Şifreli JSON yedeği indir", exact: true })
        .click();
      await page
        .getByText("Yedek parolası ve doğrulaması eşleşmiyor.")
        .waitFor();
      await page
        .getByLabel("Yedek parolası doğrulaması", { exact: true })
        .fill("örnek güçlü parola");
      const protectedDownload = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Şifreli JSON yedeği indir", exact: true })
        .click();
      const backup = await readFile(await (await protectedDownload).path());
      assert.equal(JSON.parse(backup.toString()).encrypted, 1);
      assert.ok(!backup.toString().includes("Büyük tutar testi"));
      const restore = page.getByLabel("JSON yedeğinden geri yükle");
      const restorePassword = page.getByLabel("Geri yükleme parolası");
      await restorePassword.fill("yanlış parola");
      await restore.setInputFiles({
        name: "yedek.json",
        mimeType: "application/json",
        buffer: backup,
      });
      await page.getByText("Parola yanlış veya şifreli dosya bozuk.").waitFor();
      await restorePassword.fill("örnek güçlü parola");
      page.once("dialog", async (dialog) => {
        assert.match(dialog.message(), /Örnek veri/);
        await dialog.accept();
      });
      await restore.setInputFiles({
        name: "yedek.json",
        mimeType: "application/json",
        buffer: backup,
      });
      await page.getByText(/Yedek geri yüklendi/).waitFor();
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      await nav("Özet").click();
      await page
        .getByRole("button", { name: "Gider ekle", exact: true })
        .click();
      const draft = page.getByRole("dialog", { name: "Gider", exact: true });
      await draft
        .getByLabel("Ad", { exact: true })
        .fill("Kaydedilmemiş taslak");
      await page.setViewportSize({ width, height: height - 290 });
      const save = draft.getByRole("button", { name: "Kaydet", exact: true });
      const box = await save.boundingBox();
      assert.ok(
        box && box.y + box.height <= height - 289,
        "Küçülen görünür alanda Kaydet",
      );
      await page.setViewportSize({ width, height });
      revision = 1;
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
      });
      await page.getByText("Yeni sürüm hazır.", { exact: true }).waitFor();
      assert.equal(
        await draft.getByLabel("Ad", { exact: true }).inputValue(),
        "Kaydedilmemiş taslak",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Güncelle", exact: true })
          .isDisabled(),
        true,
      );
      await close();
      await Promise.all([
        page.waitForEvent("load"),
        page.getByRole("button", { name: "Güncelle", exact: true }).click(),
      ]);
      await page.getByRole("heading", { name: "Finansal özet" }).waitFor();
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      await context.setOffline(true);
      await page.reload();
      await page.getByRole("heading", { name: "Finansal özet" }).waitFor();
      await settings();
      await page
        .getByRole("button", { name: "Yeni sürümü kontrol et" })
        .click();
      await page.getByText("İnternet bağlantısı yok.").waitFor();
    }
    assert.deepEqual(errors, [], width + " tarayıcı hatası");
    assert.ok(
      requests.every(
        (request) =>
          request.url.startsWith(address) &&
          request.method === "GET" &&
          request.data === null,
      ),
      JSON.stringify(
        requests.filter(
          (r) => !r.url.startsWith(address) || r.method !== "GET",
        ),
      ),
    );
    await context.close();
    console.log(
      width +
        " × " +
        height +
        " — boş ve örnek veri, iki tema, sayfalar, tutarlar, tarih alanları ve navigasyon geçti.",
    );
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
