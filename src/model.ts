export const categories = [
  "Kira",
  "Aidat",
  "Elektrik",
  "Su",
  "Doğalgaz",
  "İnternet",
  "Cep telefonu",
  "Ulaşım",
  "Market ve manav",
  "Yemek",
  "Alışveriş",
  "Sağlık",
  "Evcil hayvan",
  "Eğlence",
  "Abonelikler",
  "Diğer",
];
export const incomeCategories = [
  "Maaş",
  "Ek gelir",
  "Faiz geliri",
  "Diğer gelirler",
];
export const kinds = [
  "income",
  "expense",
  "transfer",
  "payment",
  "account",
  "card",
  "deposit",
  "investment",
  "goal",
  "budget",
] as const;
export type Kind = (typeof kinds)[number];
export type Entry = {
  id: string;
  kind: Kind;
  name: string;
  amount: number;
  date: string;
  category?: string;
  source?: string;
  target?: string;
  recurring?: boolean;
  paid?: boolean;
  occurrenceStatus?: Record<string, boolean>;
  installments?: number;
  limit?: number;
  statement?: number;
  cutDay?: number;
  dueDay?: number;
  rate?: number;
  tax?: number;
  excluded?: number;
  days?: number;
  units?: number;
  price?: number;
  cost?: number;
  saved?: number;
};
export type Data = Entry[];
export const labels: Record<Kind, string> = {
  income: "Gelir",
  expense: "Gider",
  transfer: "Transfer",
  payment: "Kart ödemesi",
  account: "Banka hesabı",
  card: "Kredi kartı",
  deposit: "Mevduat",
  investment: "Yatırım",
  goal: "Hedef",
  budget: "Kategori ve bütçe",
};
export const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    value / 100,
  );
export const day = (date = new Date()) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
export const month = (date: string, offset: number) => {
  const [year, m, d] = date.split("-").map(Number);
  const start = new Date(year, m - 1 + offset, 1);
  start.setDate(
    Math.min(
      d,
      new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
    ),
  );
  return day(start);
};
export const addDays = (date: string, days: number) => {
  const next = new Date(date + "T12:00:00");
  next.setDate(next.getDate() + days);
  return day(next);
};
export const parseMoney = (value: string) => {
  const match = /^(\d{1,12})(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error("Tutarı en fazla iki ondalık basamakla girin.");
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
};
export const sum = <T>(rows: T[], select: (row: T) => number) =>
  rows.reduce((total, row) => total + select(row), 0);
export const interest = (deposit: Entry, days: number) => {
  const eligible = Math.max(0, deposit.amount - (deposit.excluded ?? 0));
  const numerator =
    BigInt(eligible) *
    BigInt(Math.round((deposit.rate ?? 0) * 100)) *
    BigInt(days);
  const denominator = 365n * 10000n;
  const rounded = (n: bigint, d: bigint) => Number((n + d / 2n) / d);
  return {
    gross: rounded(numerator, denominator),
    net: rounded(
      numerator * BigInt(10000 - Math.round((deposit.tax ?? 0) * 100)),
      denominator * 10000n,
    ),
  };
};
export const market = (e: Entry) =>
  Math.round((e.units ?? 0) * (e.price ?? e.cost ?? 0));
export const basis = (e: Entry) => Math.round((e.units ?? 0) * (e.cost ?? 0));
export const isFlow = (e: Entry) =>
  ["income", "expense", "transfer", "payment"].includes(e.kind);
export const completed = (e: Entry) => e.paid !== false;
export function scheduled(
  rows: Data,
  through: string,
  from = "0000-01-01",
): Data {
  return rows.filter(isFlow).flatMap((e) => {
    if (!e.recurring && !((e.installments ?? 1) > 1))
      return e.date >= from && e.date <= through ? [e] : [];
    const [y, m] = e.date.split("-").map(Number);
    const claim = (date: string) => {
      const [yr, mo] = date.split("-").map(Number);
      return (yr - y) * 12 + mo - m;
    };
    const start = Math.max(0, claim(from));
    const end = Math.min(
      claim(through),
      e.recurring ? Infinity : (e.installments ?? 1) - 1,
    );
    const count = e.installments ?? 1;
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => {
      const index = i + start;
      const date = month(e.date, index);
      return {
        ...e,
        date,
        paid: e.recurring
          ? (e.occurrenceStatus?.[date] ?? completed(e))
          : e.paid,
        amount: e.recurring
          ? e.amount
          : Math.floor(e.amount / count) + (index < e.amount % count ? 1 : 0),
      };
    }).filter((row) => row.date >= from && row.date <= through);
  });
}
export function balances(
  rows: Data,
  through: string,
  projected = false,
  projectionStart = through,
) {
  const flows = scheduled(rows, through).filter(
    (e) => completed(e) || (projected && e.date >= projectionStart),
  );
  const debtFlows = [
    ...flows.filter(
      (e) => !(e.kind === "expense" && (e.installments ?? 1) > 1),
    ),
    ...rows.filter(
      (e) =>
        e.kind === "expense" &&
        (e.installments ?? 1) > 1 &&
        e.date <= through &&
        (completed(e) || (projected && e.date >= projectionStart)),
    ),
  ];
  return rows
    .filter(
      (e) =>
        e.date <= through &&
        ["account", "card", "deposit", "investment"].includes(e.kind),
    )
    .map((e) => {
      const movements = e.kind === "card" ? debtFlows : flows;
      const balance =
        e.kind === "investment"
          ? market(e)
          : e.amount +
            sum(movements, (f) => {
              if (e.kind === "card")
                return f.source === e.id && f.kind === "expense"
                  ? f.amount
                  : f.target === e.id && f.kind === "payment"
                    ? -f.amount
                    : 0;
              return (
                (f.target === e.id && ["income", "transfer"].includes(f.kind)
                  ? f.amount
                  : 0) -
                (f.source === e.id &&
                ["expense", "transfer", "payment"].includes(f.kind)
                  ? f.amount
                  : 0)
              );
            });
      return { ...e, balance };
    });
}
export function totals(rows: Data, from: string, to: string) {
  const flows = scheduled(rows, to, from).filter(completed);
  const income = sum(
    flows.filter((e) => e.kind === "income"),
    (e) => e.amount,
  );
  const expense = sum(
    flows.filter((e) => e.kind === "expense"),
    (e) => e.amount,
  );
  return {
    income,
    expense,
    rate: income ? ((income - expense) * 100) / income : 0,
  };
}
export function snapshot(
  rows: Data,
  date: string,
  projected = false,
  projectionStart = date,
) {
  const accounts = balances(rows, date, projected, projectionStart);
  const cash = sum(
    accounts.filter((e) => e.kind === "account"),
    (e) => e.balance,
  );
  const debt = sum(
    accounts.filter((e) => e.kind === "card"),
    (e) => e.balance,
  );
  const assets = sum(
    accounts.filter((e) => e.kind === "deposit" || e.kind === "investment"),
    (e) => e.balance,
  );
  return { cash, debt, assets, net: cash + assets - debt };
}
export const dateValid = (value: string) =>
  /^20\d\d-\d\d-\d\d$/.test(value) &&
  day(new Date(value + "T12:00:00")) === value;
export function validateEntry(e: Entry) {
  if (
    !e ||
    !kinds.includes(e.kind) ||
    typeof e.id !== "string" ||
    !e.id ||
    typeof e.name !== "string" ||
    !e.name.trim() ||
    typeof e.date !== "string" ||
    !dateValid(e.date)
  )
    throw new Error("Kayıt adı veya tarihi geçersiz.");
  for (const key of [
    "amount",
    "limit",
    "statement",
    "excluded",
    "price",
    "cost",
    "saved",
  ] as const) {
    const value = e[key];
    if (
      (value !== undefined || key === "amount") &&
      (!Number.isSafeInteger(value) || value! < 0)
    )
      throw new Error("Tutar geçersiz.");
  }
  for (const key of [
    "installments",
    "days",
    "cutDay",
    "dueDay",
    "rate",
    "tax",
    "units",
  ] as const) {
    const value = e[key];
    if (value !== undefined && (!Number.isFinite(value) || value < 0))
      throw new Error("Sayısal alan geçersiz.");
  }
  if (
    (e.tax ?? 0) > 100 ||
    (e.rate ?? 0) > 1000 ||
    (e.days ?? 0) > 36500 ||
    (e.excluded ?? 0) > e.amount
  )
    throw new Error("Mevduat bilgileri sınır dışında.");
  for (const value of [e.cutDay, e.dueDay])
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < 1 || value > 31)
    )
      throw new Error("Ayın günü 1–31 arasında olmalı.");
  if (e.days !== undefined && !Number.isInteger(e.days))
    throw new Error("Vade tam gün olarak girilmeli.");
  if (
    e.installments !== undefined &&
    (!Number.isInteger(e.installments) ||
      e.installments < 1 ||
      e.installments > 120 ||
      e.installments > e.amount ||
      (e.recurring && e.installments > 1))
  )
    throw new Error("Taksit sayısı veya tekrar seçimi geçersiz.");
  if ((isFlow(e) || e.kind === "goal") && e.amount <= 0)
    throw new Error("Tutar sıfırdan büyük olmalı.");
  if (
    e.kind === "investment" &&
    (!(e.units! > 0) ||
      e.cost === undefined ||
      !Number.isSafeInteger(market(e)) ||
      !Number.isSafeInteger(basis(e)))
  )
    throw new Error("Yatırım adedi veya maliyeti geçersiz.");
  if (e.kind === "goal" && (e.saved ?? 0) > e.amount)
    throw new Error("Birikim hedefi aşmamalı.");
  for (const value of [e.source, e.target, e.category])
    if (value !== undefined && typeof value !== "string")
      throw new Error("Kayıt bağlantısı geçersiz.");
  if (
    e.occurrenceStatus !== undefined &&
    (!e.recurring ||
      !e.occurrenceStatus ||
      typeof e.occurrenceStatus !== "object" ||
      Array.isArray(e.occurrenceStatus) ||
      Object.entries(e.occurrenceStatus).some(
        ([date, paid]) => !dateValid(date) || typeof paid !== "boolean",
      ))
  )
    throw new Error("Tekrarlanan işlem durumu geçersiz.");
  for (const value of [e.paid, e.recurring])
    if (value !== undefined && typeof value !== "boolean")
      throw new Error("Kayıt durumu geçersiz.");
}
export function validateData(rows: Data) {
  const lookup = new Map<string, Kind>();
  for (const e of rows) {
    validateEntry(e);
    if (
      e.kind === "budget" &&
      rows.some(
        (other) =>
          other !== e &&
          other.kind === "budget" &&
          other.name.toLocaleLowerCase("tr") === e.name.toLocaleLowerCase("tr"),
      )
    )
      throw new Error("Bu kategori için zaten bir kayıt var.");
    if (lookup.has(e.id)) throw new Error("Yedekte yinelenen kayıt var.");
    lookup.set(e.id, e.kind);
  }
  for (const e of rows) {
    const source = lookup.get(e.source ?? "");
    const target = lookup.get(e.target ?? "");
    const cashLike = (kind: Kind | undefined) =>
      kind === "account" || kind === "deposit";
    if (
      (e.kind === "income" && e.target && !cashLike(target)) ||
      (e.kind === "expense" &&
        e.source &&
        source !== "account" &&
        source !== "card") ||
      (e.kind === "transfer" &&
        (!cashLike(source) || !cashLike(target) || e.source === e.target)) ||
      (e.kind === "payment" && (source !== "account" || target !== "card")) ||
      ((e.installments ?? 1) > 1 && (e.kind !== "expense" || source !== "card"))
    )
      throw new Error("İşlem için geçerli hesapları seçin.");
  }
  return rows;
}
export function backup(raw: string): Data {
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !Array.isArray(value.records))
    throw new Error("Finans360 yedek biçimi geçersiz.");
  return validateData(value.records);
}
