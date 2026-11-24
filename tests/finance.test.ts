import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  backup,
  balances,
  interest,
  month,
  parseMoney,
  scheduled,
  snapshot,
  totals,
  validateData,
  type Entry,
  type Kind,
} from "../src/model.ts";
import { load, update } from "../src/storage.ts";
const entry = (
  id: string,
  kind: Kind,
  amount: number,
  extra: Partial<Entry> = {},
): Entry => ({ id, kind, amount, name: id, date: "2026-01-31", ...extra });
const rows = [
  entry("a", "account", 100000),
  entry("b", "account", 10000),
  entry("c", "card", 0, { limit: 120000 }),
  entry("d", "deposit", 100000),
  entry("salary", "income", 40000, { target: "a" }),
  entry("shop", "expense", 10001, { source: "c", installments: 3 }),
  entry("pay", "payment", 3000, { source: "a", target: "c" }),
  entry("transfer", "transfer", 5000, { source: "a", target: "b" }),
];
test("Kuruş, virgül ve geçersiz tutar doğrulaması", () => {
  assert.equal(parseMoney("110,05"), 11005);
  assert.equal(parseMoney("0.1"), 10);
  assert.throws(() => parseMoney("0,001"));
});
test("Ay sonu tekrarı ve taksit kuruşları korunur", () => {
  assert.equal(month("2024-01-31", 1), "2024-02-29");
  assert.deepEqual(
    scheduled(rows, "2026-03-31")
      .filter((row) => row.id === "shop")
      .map((row) => [row.date, row.amount]),
    [
      ["2026-01-31", 3334],
      ["2026-02-28", 3334],
      ["2026-03-31", 3333],
    ],
  );
});
test("Transfer ve kart ödemesi nakdi etkiler, gelir veya gider sayılmaz", () => {
  assert.deepEqual(totals(rows, "2026-01-01", "2026-01-31"), {
    income: 40000,
    expense: 3334,
    rate: 91.665,
  });
  assert.equal(
    balances(rows, "2026-01-31").find((row) => row.id === "a")?.balance,
    132000,
  );
  assert.deepEqual(snapshot(rows, "2026-01-31"), {
    cash: 147000,
    debt: 7001,
    assets: 100000,
    net: 239999,
  });
  assert.deepEqual(snapshot(rows, "2026-01-01"), {
    cash: 0,
    debt: 0,
    assets: 0,
    net: 0,
  });
});
test("Mevduat tahakkuku nakde girmez, gerçekleşen faiz kayda girer", () => {
  const deposit = entry("d", "deposit", 100000, {
    excluded: 10000,
    rate: 36.5,
    tax: 10,
  });
  assert.deepEqual(interest(deposit, 30), { gross: 2700, net: 2430 });
  assert.equal(snapshot([deposit], "2026-02-28").assets, 100000);
  const gain = entry("gain", "income", 2430, {
    target: "d",
    category: "Faiz geliri",
    date: "2026-02-28",
  });
  assert.equal(snapshot([deposit, gain], "2026-02-28").assets, 102430);
});
test("Bekleyen fatura yalnızca tahminde nakdi değiştirir", () => {
  const bill = entry("bill", "expense", 7000, { source: "a", paid: false });
  assert.equal(snapshot([...rows, bill], "2026-01-31").cash, 147000);
  assert.equal(
    snapshot([...rows, bill], "2026-01-31", true, "2026-01-01").cash,
    140000,
  );
});
test("Yedek biçimi ve hesap ilişkileri doğrulanır", () => {
  assert.deepEqual(backup(JSON.stringify({ version: 1, records: rows })), rows);
  assert.throws(() => backup('{"version":2,"records":[]}'));
  assert.throws(() => validateData([...rows, rows[0]]));
  assert.throws(() => validateData(rows.filter((e) => e.id !== "c")));
});
test("IndexedDB örnek veriyi ayırır ve eşzamanlı yazmaları kaybetmez", async () => {
  await update("demo", [], () => rows);
  assert.equal(await load("personal"), undefined);
  await Promise.all([
    update("personal", [], (data) => [...data, rows[0]]),
    update("personal", [], (data) => [...data, rows[1]]),
  ]);
  assert.equal((await load("personal"))?.length, 2);
  assert.deepEqual(await load("demo"), rows);
});
test("Yinelenen faturada ödeme işareti yalnızca seçilen ayı etkiler", () => {
  const bill = entry("rent", "expense", 10000, {
    recurring: true,
    paid: false,
    occurrenceStatus: { "2026-02-28": true },
  });
  assert.equal(totals([bill], "2026-01-01", "2026-01-31").expense, 0);
  assert.equal(totals([bill], "2026-02-01", "2026-02-28").expense, 10000);
  assert.equal(totals([bill], "2026-03-01", "2026-03-31").expense, 0);
});
