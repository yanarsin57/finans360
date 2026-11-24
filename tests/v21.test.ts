import test from "node:test";
import assert from "node:assert/strict";
import {
  availableUntilSalary,
  balances,
  cardObligations,
  dateInMonth,
  day,
  monthEnd,
  nextDayOfMonth,
  paymentItems,
  snapshot,
  totals,
  validateData,
  type Entry,
  type Kind,
} from "../src/model.ts";
const today = "2026-11-24";
const entry = (
  id: string,
  kind: Kind,
  amount: number,
  values: Partial<Entry> = {},
): Entry => ({ id, name: id, kind, amount, date: "2026-11-01", ...values });
const data = [
  entry("Banka", "account", 1487000),
  entry("Mevduat", "deposit", 4250000),
  entry("Yatırım", "investment", 0, {
    units: 25,
    cost: 10000,
    price: 11500,
    priceDate: today,
  }),
  entry("Kart", "card", 285000, {
    limit: 4500000,
    statement: 225000,
    cutDay: 7,
    dueDay: 17,
  }),
  entry("Maaş", "income", 4850000, { target: "Banka", recurring: true }),
  entry("Kira", "expense", 1620000, {
    source: "Banka",
    category: "Kira",
    recurring: true,
  }),
  entry("Ulaşım", "expense", 84500, {
    source: "Banka",
    category: "Ulaşım",
    date: today,
  }),
  entry("Kart market", "expense", 148750, {
    source: "Kart",
    category: "Market ve manav",
    date: today,
  }),
  entry("Nakit market", "expense", 10000, {
    source: "Banka",
    category: "Market ve manav",
    date: today,
  }),
  entry("İnternet", "expense", 67500, {
    source: "Banka",
    category: "İnternet",
    date: "2026-11-29",
    paid: false,
    recurring: true,
  }),
  entry("Market ve manav", "budget", 800000),
];
test("iPhone örnek kayıtlarının bütçe, borç, nakit ve varlık değerleri", () => {
  const result = snapshot(data, today);
  const monthly = totals(data, "2026-11-01", today);
  assert.deepEqual(result, {
    cash: 4622500,
    debt: 433750,
    assets: 4537500,
    net: 8726250,
  });
  assert.equal(result.cash + result.assets, 9160000);
  assert.equal(monthly.income, 4850000);
  assert.equal(monthly.expense, 1863250);
  assert.equal(monthly.income - monthly.expense, 2986750);
  assert.equal(Number(monthly.rate.toFixed(1)), 61.6);
  assert.equal(snapshot(data, "2026-11-30", true, "2026-11-01").cash, 4555000);
  const market = data
    .filter((e) => e.kind === "expense" && e.category === "Market ve manav")
    .reduce((total, e) => total + e.amount, 0);
  assert.equal(market, 158750);
  assert.equal(data.at(-1)!.amount - market, 641250);
  assert.equal(
    data.find((e) => e.kind === "card")!.limit! - result.debt,
    4066250,
  );
});
test("Maaş gününe kadarki yükümlülük kalemleri gerçek vadelerden hesaplanır", () => {
  assert.deepEqual(
    paymentItems(data, today, "2026-12-01").map((e) => [
      e.name,
      e.date,
      e.amount,
    ]),
    [
      ["Kart · Ekstre", "2026-11-17", 225000],
      ["İnternet", "2026-11-29", 67500],
      ["Kira", "2026-12-01", 1620000],
    ],
  );
  assert.deepEqual(availableUntilSalary(data, today, 1), {
    salary: "2026-12-01",
    days: 7,
    required: 1912500,
    remaining: 2710000,
    daily: 387142,
  });
  const dueToday = entry("Bugünkü fatura", "expense", 500, {
    date: today,
    paid: false,
  });
  assert.equal(availableUntilSalary([...data, dueToday], today, 24).days, 1);
  assert.ok(
    paymentItems([...data, dueToday], today, today).some(
      (e) => e.id === dueToday.id,
    ),
  );
  assert.equal(
    availableUntilSalary(
      [entry("eksi", "expense", 10, { date: today, paid: false })],
      today,
      30,
    ).daily,
    -2,
  );
});
test("Ödenmiş ekstre, kartın halen güncel borcu olsa bile gecikmiş sayılmaz", () => {
  const payment = entry("Ödeme", "payment", 225000, {
    source: "Banka",
    target: "Kart",
    date: "2026-11-16",
  });
  const withPayment = [...data, payment];
  assert.ok(snapshot(withPayment, today).debt > 0);
  assert.deepEqual(cardObligations(withPayment, today, today), []);
  assert.equal(totals(withPayment, "2026-11-01", today).expense, 1863250);
});
test("Ekstre dönemi ve maaş tarihi artık yıl ve yıl sonunda doğru kapanır", () => {
  assert.equal(dateInMonth("2028-02-01", 31), "2028-02-29");
  assert.equal(monthEnd("2027-02-01"), "2027-02-28");
  assert.equal(nextDayOfMonth("2026-12-31", 1), "2027-01-01");
  const card = entry("Kart", "card", 12500, {
    date: "2026-12-01",
    statement: 10000,
    statementDate: "2026-12-28",
    cutDay: 28,
    dueDay: 8,
  });
  assert.deepEqual(cardObligations([card], "2027-01-09", "2027-01-09"), [
    { id: "Kart", name: "Kart · Ekstre", date: "2027-01-08", amount: 10000 },
  ]);
});
test("Banka hesabına bağlı alım ve satım hem nakdi hem yatırım adedini değiştirir", () => {
  const bank = entry("Banka", "account", 100000);
  const asset = entry("Yatırım", "investment", 0, {
    units: 10,
    cost: 1000,
    price: 1500,
    priceDate: "2026-11-01",
  });
  const buy = entry("Alım", "trade", 5000, {
    date: "2026-11-11",
    units: 3,
    category: "Alım",
    target: asset.id,
    source: bank.id,
  });
  const sale = entry("Satım", "trade", 3000, {
    date: "2026-11-12",
    units: 2,
    category: "Satım",
    target: asset.id,
    source: bank.id,
  });
  const records = validateData([bank, asset, buy, sale]);
  assert.equal(
    balances(records, today).find((e) => e.id === bank.id)?.balance,
    98000,
  );
  assert.equal(
    balances(records, today).find((e) => e.id === asset.id)?.units,
    11,
  );
  assert.deepEqual(totals(records, "2026-11-01", today), {
    income: 0,
    expense: 0,
    rate: 0,
  });
  assert.equal(snapshot(records, today).assets, 16500);
  assert.throws(() =>
    validateData([bank, asset, { ...buy, source: asset.id }]),
  );
});
