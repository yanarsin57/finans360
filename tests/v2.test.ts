import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import ExcelJS from "exceljs";
import {
  availableUntilSalary,
  backup,
  balances,
  day,
  interest,
  investmentAt,
  reviseOccurrence,
  scheduled,
  snapshot,
  statusOf,
  totals,
  validateData,
  type Entry,
  type Kind,
} from "../src/model.ts";
import { protect, reveal } from "../src/device.ts";
import { load, storage, update } from "../src/storage.ts";
import { report } from "../src/report.ts";

function entry(
  id: string,
  kind: Kind,
  amount: number,
  extra: Partial<Entry> = {},
): Entry {
  return { id, kind, amount, name: id, date: "2026-01-01", ...extra };
}
test("Açılış tarihi ve bakiye düzeltmesi geçmiş işlemleri ikinci kez saymaz", () => {
  const bank = entry("a", "account", 100000, { balanceFrom: "2026-01-15" });
  const salary = entry("gelir", "income", 50000, {
    target: "a",
    date: "2026-01-10",
  });
  const debit = entry("gider", "expense", 2000, {
    source: "a",
    date: "2026-01-20",
    createdAt: 10,
  });
  const correction = entry("düzeltme", "adjustment", -1000, {
    target: "a",
    date: "2026-01-20",
    createdAt: 11,
  });
  const later = { ...debit, id: "ikinci", createdAt: 12 };
  const data = validateData([bank, salary, debit, correction, later]);
  assert.equal(balances(data, "2026-01-19")[0].balance, 100000);
  assert.equal(balances(data, "2026-01-20")[0].balance, -3000);
  assert.equal(totals(data, "2026-01-01", "2026-01-31").income, 50000);
  assert.equal(totals(data, "2026-01-01", "2026-01-31").expense, 4000);
});
test("Haftalık, üç aylık ve yıllık tekrarlar yıl sınırını geçer", () => {
  const weekly = entry("haftalık", "expense", 100, {
    date: "2026-12-28",
    recurring: true,
    frequency: "weekly",
  });
  assert.deepEqual(
    scheduled([weekly], "2027-01-20", "2027-01-01").map((e) => e.date),
    ["2027-01-04", "2027-01-11", "2027-01-18"],
  );
  const quarterly = {
    ...weekly,
    date: "2026-10-31",
    frequency: "quarterly",
  } as const;
  assert.deepEqual(
    scheduled([quarterly], "2027-05-01").map((e) => e.date),
    ["2026-10-31", "2027-01-31", "2027-04-30"],
  );
  const yearly = {
    ...weekly,
    date: "2024-02-29",
    frequency: "yearly",
  } as const;
  assert.equal(scheduled([yearly], "2025-03-01").at(-1)?.date, "2025-02-28");
});
test("Tek dönem ve sonraki dönem düzenlemeleri geçmişi ve ödeme durumlarını korur", () => {
  const template = entry("kira", "expense", 100, {
    recurring: true,
    paid: false,
    occurrenceStatus: { "2026-01-01": true },
  });
  const one = reviseOccurrence(
    [template],
    template,
    "2026-02-01",
    { ...template, id: "yeni", date: "2026-02-01", amount: 200, paid: true },
    "one",
  );
  assert.deepEqual(
    scheduled(validateData(one), "2026-03-01")
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => e.amount),
    [100, 200, 100],
  );
  const future = reviseOccurrence(
    [template],
    template,
    "2026-02-01",
    { ...template, id: "yeni", date: "2026-02-01", amount: 200 },
    "future",
  );
  assert.deepEqual(
    scheduled(validateData(future), "2026-03-01").map((e) => e.amount),
    [100, 200, 200],
  );
  assert.equal(
    statusOf(scheduled(future, "2026-03-01")[1], "2026-02-02"),
    "late",
  );
});
test("Tarihsel portföy değerine bugünkü fiyat yansıtılmaz", () => {
  const asset = entry("fon", "investment", 0, {
    units: 10,
    cost: 5000,
    price: 9000,
    priceDate: "2026-03-01",
  });
  const history = entry("geçmiş", "valuation", 63000, {
    target: "fon",
    date: "2026-02-01",
  });
  assert.equal(investmentAt([asset, history], asset, "2026-01-31"), undefined);
  assert.equal(investmentAt([asset, history], asset, "2026-02-01"), 63000);
  assert.equal(snapshot([asset, history], "2026-03-01").assets, 90000);
  assert.throws(
    () =>
      validateData([
        asset,
        entry("toplam", "investment", 90000, { manual: true }),
      ]),
    /takip yöntem/,
  );
});
test("Günlük bütçe mevduatı çıkarır, faturayı ve ödenmemiş ekstreyi bir kez düşer", () => {
  const data = [
    entry("nakit", "account", 10000),
    entry("mevduat", "deposit", 500000),
    entry("kart", "card", 7000, { statement: 5000, cutDay: 4, dueDay: 10 }),
    entry("ödeme", "payment", 1500, {
      source: "nakit",
      target: "kart",
      date: "2026-01-05",
    }),
    entry("fatura", "expense", 7000, {
      source: "nakit",
      paid: false,
      date: "2026-01-09",
      fixed: true,
    }),
  ];
  assert.deepEqual(availableUntilSalary(data, "2026-01-06", 11), {
    salary: "2026-01-11",
    days: 5,
    required: 10500,
    remaining: -2000,
    daily: -400,
  });
});
test("Bileşik brüt ve net faiz ve mükerrer faiz engeli", () => {
  const deposit = entry("vadeli", "deposit", 1000000, {
    rate: 36.5,
    tax: 10,
    compound: true,
  });
  const result = interest(deposit, 2);
  assert.deepEqual(result, { gross: 2001, net: 1801 });
  const gain = entry("faiz", "income", 1801, {
    target: "vadeli",
    category: "Faiz geliri",
  });
  assert.throws(
    () => validateData([deposit, gain, { ...gain, id: "ikinci" }]),
    /zaten kayıtlı/,
  );
});
test("Eski IndexedDB dizisi okunur, yeni düzenleme ve silme örnek veriyi etkilemez", async () => {
  const original = [entry("v1", "income", 10000)];
  const db = await storage();
  await db.put("state", original, "personal");
  await db.put("state", original, "demo");
  assert.deepEqual(await load("personal"), original);
  const edited = await update("personal", [], (data) =>
    validateData([
      ...data.map((e) => ({ ...e, amount: 15000 })),
      entry("yeni", "expense", 500),
    ]),
  );
  assert.equal(totals(edited, "2026-01-01", "2026-01-01").expense, 500);
  await update("personal", [], (data) => data.filter((e) => e.id !== "v1"));
  assert.deepEqual(await load("demo"), original);
  assert.deepEqual(
    backup(JSON.stringify({ version: 1, records: edited })),
    edited,
  );
});
test("Şifreli yedek açılır, yanlış parola ve bozuk veri reddedilir", async () => {
  const data = JSON.stringify({
    version: 1,
    records: [entry("TÜRKÇE", "income", 10)],
  });
  const encrypted = await protect("örnek güvenli parola", data);
  assert.ok(!encrypted.includes("TÜRKÇE"));
  assert.equal(await reveal("örnek güvenli parola", encrypted), data);
  await assert.rejects(reveal("yanlış", encrypted));
  await assert.rejects(reveal("örnek güvenli parola", '{"encrypted":1}'));
});
test("Excel dönem raporunda Türkçe karakter ve kuruşlar korunur", async () => {
  const initial = new ExcelJS.Workbook();
  const sheet = initial.addWorksheet("Dönem raporu");
  for (const row of report(
    [entry("gelir", "income", 11005)],
    "2026-01-01",
    "2026-01-31",
  ))
    sheet.addRow(row);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await initial.xlsx.writeBuffer());
  assert.equal(loaded.worksheets[0].getCell("A3").value, "Gerçekleşen gelir");
  assert.equal(loaded.worksheets[0].getCell("B3").value, 110.05);
});
test("V1 yatırımı için tarihi veri yokken yalnızca bugünkü değer kullanılabilir", () => {
  const old = entry("v1-yatırım", "investment", 0, {
    units: 10,
    cost: 1100,
    price: 1500,
  });
  assert.equal(investmentAt([old], old, "2026-01-01"), undefined);
  assert.equal(investmentAt([old], old, day()), 15000);
});
test("Yatırım alım ve satımları ağırlıklı maliyeti ve adedi değiştirir", () => {
  const asset = entry("fon", "investment", 0, {
    units: 10,
    cost: 5000,
    price: 9000,
    priceDate: "2026-01-01",
  });
  const purchase = entry("alım", "trade", 35000, {
    category: "Alım",
    target: "fon",
    units: 5,
    date: "2026-01-02",
  });
  const sale = entry("satım", "trade", 24000, {
    category: "Satım",
    target: "fon",
    units: 3,
    date: "2026-01-03",
  });
  const data = validateData([asset, purchase, sale]);
  assert.equal(balances(data, "2026-01-03")[0].units, 12);
  assert.equal(snapshot(data, "2026-01-03").assets, 108000);
  assert.equal(totals(data, "2026-01-01", "2026-01-31").expense, 0);
  assert.throws(
    () => validateData([asset, purchase, { ...sale, units: 16 }]),
    /eldeki adedi/,
  );
});
test("Ay sonu tekrarı Şubat düzenlemesinden sonra ay sonuna bağlı kalır", () => {
  const old = entry("kira", "expense", 100, {
    recurring: true,
    date: "2026-01-31",
  });
  const revision = reviseOccurrence(
    [old],
    old,
    "2026-02-28",
    { ...old, id: "v2", date: "2026-02-28", amount: 120 },
    "future",
  );
  assert.deepEqual(
    scheduled(revision, "2026-03-31").map((e) => [e.date, e.amount]),
    [
      ["2026-01-31", 100],
      ["2026-02-28", 120],
      ["2026-03-31", 120],
    ],
  );
});
