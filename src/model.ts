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
  "adjustment",
  "valuation",
  "trade",
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
  bank?: string;
  color?: string;
  icon?: string;
  frequency?: "weekly" | "monthly" | "quarterly" | "yearly";
  until?: string;
  anchor?: string;
  exceptions?: string[];
  createdAt?: number;
  fixed?: boolean;
  compound?: boolean;
  manual?: boolean;
  priceDate?: string;
  balanceFrom?: string;
  statementDate?: string;
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
  adjustment: "Bakiye düzeltmesi",
  valuation: "Portföy değeri",
  trade: "Yatırım hareketi",
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
  if (deposit.compound) {
    const daily = (deposit.rate ?? 0) / 36500;
    const gross = eligible * Math.expm1(days * Math.log1p(daily));
    if (!Number.isSafeInteger(Math.round(gross)))
      throw new Error("Tahmini getiri hesaplama sınırını aşıyor.");
    return {
      gross: Math.round(gross),
      net: Math.round(gross * (1 - (deposit.tax ?? 0) / 100)),
    };
  }
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
  e.manual ? e.amount : Math.round((e.units ?? 0) * (e.price ?? e.cost ?? 0));
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
    const step =
      e.frequency === "yearly" ? 12 : e.frequency === "quarterly" ? 3 : 1;
    const weekly = e.recurring && e.frequency === "weekly";
    const anchor = e.anchor ?? e.date;
    const [y, m] = anchor.split("-").map(Number);
    const claim = (date: string) => {
      if (weekly) return Math.floor(daysBetween(anchor, date) / 7);
      const [yr, mo] = date.split("-").map(Number);
      return Math.floor(((yr - y) * 12 + mo - m) / step);
    };
    const start = Math.max(0, claim(from), claim(e.date));
    const end = Math.min(
      claim(e.until && e.until < through ? e.until : through),
      e.recurring ? Infinity : (e.installments ?? 1) - 1,
    );
    const count = e.installments ?? 1;
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => {
      const index = i + start;
      const date = weekly
        ? addDays(anchor, index * 7)
        : month(anchor, index * step);
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
    }).filter(
      (row) =>
        row.date >= from &&
        row.date >= e.date &&
        row.date <= through &&
        (!e.until || row.date <= e.until) &&
        !e.exceptions?.includes(row.date),
    );
  });
}
export function balances(
  rows: Data,
  through: string,
  projected = false,
  projectionStart = through,
) {
  const trades = rows.filter(
    (e) => e.kind === "trade" && e.source && e.date <= through,
  );
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
        (e.balanceFrom ?? e.date) <= through &&
        ["account", "card", "deposit", "investment"].includes(e.kind),
    )
    .map((e) => {
      const movements =
        e.kind === "card"
          ? debtFlows
          : e.kind === "account"
            ? [...flows, ...trades]
            : flows;
      const adjustment = rows
        .filter(
          (row) =>
            row.kind === "adjustment" &&
            row.target === e.id &&
            row.date <= through,
        )
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            (b.createdAt ?? 0) - (a.createdAt ?? 0),
        )[0];
      const opening = adjustment?.amount ?? e.amount;
      const openingDate = adjustment?.date ?? e.balanceFrom;
      const balance =
        e.kind === "investment"
          ? (investmentAt(rows, e, through) ?? 0)
          : opening +
            sum(movements, (f) => {
              if (
                openingDate &&
                (f.date < openingDate ||
                  (adjustment &&
                    f.date === openingDate &&
                    (f.createdAt ?? 0) <= (adjustment.createdAt ?? 0)))
              )
                return 0;
              if (e.kind === "card")
                return f.source === e.id && f.kind === "expense"
                  ? f.amount
                  : f.target === e.id && f.kind === "payment"
                    ? -f.amount
                    : 0;
              if (f.kind === "trade" && f.source === e.id)
                return f.category === "Alım" ? -f.amount : f.amount;
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
      return {
        ...e,
        ...(e.kind === "investment" && !e.manual
          ? holding(rows, e, through)
          : {}),
        balance,
      };
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
      (!Number.isSafeInteger(value) || (e.kind !== "adjustment" && value! < 0))
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
    (e.kind === "deposit" && (e.excluded ?? 0) > e.amount)
  )
    throw new Error("Mevduat bilgileri sınır dışında.");
  for (const value of [e.cutDay, e.dueDay])
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < 1 || value > 31)
    )
      throw new Error("Ayın günü 1–31 arasında olmalı.");
  if (e.kind === "deposit" && e.compound && Number.isInteger(e.days ?? 0))
    interest(e, Math.max(3650, e.days ?? 0));
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
    !e.manual &&
    (!(e.units! > 0) ||
      e.cost === undefined ||
      !Number.isSafeInteger(market(e)) ||
      !Number.isSafeInteger(basis(e)))
  )
    throw new Error("Yatırım adedi veya maliyeti geçersiz.");
  if (
    e.kind === "trade" &&
    (!e.units || !e.amount || !["Alım", "Satım"].includes(e.category ?? ""))
  )
    throw new Error("Yatırım hareketi için pozitif adet ve tutar girin.");
  if (e.kind === "goal" && (e.saved ?? 0) > e.amount)
    throw new Error("Birikim hedefi aşmamalı.");
  for (const date of [
    e.until,
    e.priceDate,
    e.balanceFrom,
    e.anchor,
    e.statementDate,
  ]) {
    if (date !== undefined && (typeof date !== "string" || !dateValid(date)))
      throw new Error("Tarih geçersiz.");
  }
  if (
    e.frequency !== undefined &&
    (!e.recurring ||
      !["weekly", "monthly", "quarterly", "yearly"].includes(e.frequency))
  )
    throw new Error("Tekrar sıklığı geçersiz.");
  if (
    e.exceptions !== undefined &&
    (!e.recurring ||
      !Array.isArray(e.exceptions) ||
      e.exceptions.some((d) => typeof d !== "string" || !dateValid(d)))
  )
    throw new Error("Tekrar istisnası geçersiz.");
  if (
    e.createdAt !== undefined &&
    (!Number.isSafeInteger(e.createdAt) || e.createdAt < 0)
  )
    throw new Error("Kayıt zamanı geçersiz.");
  for (const value of [e.fixed, e.compound, e.manual])
    if (value !== undefined && typeof value !== "boolean")
      throw new Error("Kayıt seçeneği geçersiz.");
  for (const value of [e.source, e.target, e.category, e.bank, e.color, e.icon])
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
  const manual = rows.filter((e) => e.kind === "investment" && e.manual);
  if (manual.length && rows.filter((e) => e.kind === "investment").length > 1)
    throw new Error(
      "Toplam portföy veya ayrıntılı takip yöntemlerinden yalnızca birini kullanın.",
    );
  const interestKeys = new Set<string>();
  for (const e of rows) {
    if (
      e.kind === "income" &&
      e.category === "Faiz geliri" &&
      e.target &&
      e.paid !== false
    ) {
      const key = JSON.stringify([e.target, e.date, e.amount]);
      if (interestKeys.has(key))
        throw new Error("Aynı faiz tahsilatı zaten kayıtlı.");
      interestKeys.add(key);
    }
    const source = lookup.get(e.source ?? "");
    const target = lookup.get(e.target ?? "");
    const cashLike = (kind: Kind | undefined) =>
      kind === "account" || kind === "deposit";
    if (
      (e.kind === "adjustment" && target !== "account") ||
      (["valuation", "trade"].includes(e.kind) && target !== "investment") ||
      (e.kind === "trade" && e.source !== undefined && source !== "account") ||
      (e.kind === "trade" &&
        rows.some((asset) => asset.id === e.target && asset.manual)) ||
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
  for (const asset of rows.filter(
    (e) => e.kind === "investment" && !e.manual,
  )) {
    if (
      rows.some(
        (e) =>
          e.kind === "trade" && e.target === asset.id && e.date < asset.date,
      )
    )
      throw new Error("Hareket tarihi yatırımın başlangıcından önce olamaz.");
    holding(rows, asset, "9999-12-31");
  }
  return rows;
}
export function backup(raw: string): Data {
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !Array.isArray(value.records))
    throw new Error("Finans360 yedek biçimi geçersiz.");
  return validateData(value.records);
}

export const daysBetween = (from: string, to: string) =>
  (Date.parse(to) - Date.parse(from)) / 86400000;
export const monthEnd = (date: string) =>
  addDays(month(date.slice(0, 7) + "-01", 1), -1);
export const dateInMonth = (date: string, num: number) =>
  date.slice(0, 8) +
  String(Math.min(num, Number(monthEnd(date).slice(-2)))).padStart(2, "0");
export const nextDayOfMonth = (date: string, num: number) => {
  const selected = dateInMonth(date, num);
  return selected >= date ? selected : dateInMonth(month(date, 1), num);
};
export const statusOf = (e: Entry, date: string) =>
  completed(e) && e.date <= date
    ? "paid"
    : !completed(e) && e.date < date
      ? "late"
      : "pending";
export function holding(rows: Data, asset: Entry, date: string) {
  let units = asset.units ?? 0;
  let total = units * (asset.cost ?? 0);
  const trades = rows
    .filter(
      (e) => e.kind === "trade" && e.target === asset.id && e.date <= date,
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || (a.createdAt ?? 0) - (b.createdAt ?? 0),
    );
  for (const trade of trades) {
    const quantity = trade.units ?? 0;
    if (trade.category === "Alım") {
      units += quantity;
      total += trade.amount;
    } else {
      if (quantity > units + 1e-9)
        throw new Error("Satış adedi eldeki adedi aşıyor.");
      total = units > 0 ? (total * Math.max(0, units - quantity)) / units : 0;
      units = Math.max(0, units - quantity);
    }
  }
  return { units, cost: units ? total / units : 0 };
}
export const investmentAt = (rows: Data, e: Entry, date: string) => {
  const history = rows
    .filter(
      (record) =>
        record.kind === "valuation" &&
        record.target === e.id &&
        record.date <= date,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
  const priceDate = e.priceDate ?? day();
  if (date >= priceDate && (!history.length || priceDate >= history[0].date))
    return market(e.manual ? e : { ...e, ...holding(rows, e, date) });
  return history[0]?.amount;
};
export const isFixed = (e: Entry) =>
  e.fixed ??
  Boolean(
    e.recurring || ["Kira", "Aidat", "Abonelikler"].includes(e.category ?? ""),
  );
export function cardObligations(rows: Data, asOf: string, through: string) {
  return balances(rows, asOf).flatMap((card) => {
    if (card.kind !== "card" || !card.dueDay || card.balance <= 0) return [];
    const date =
      card.statementDate ??
      (card.cutDay ? dateInMonth(asOf, card.cutDay) : undefined);
    const cutoff =
      date && date <= asOf
        ? date
        : card.cutDay
          ? dateInMonth(month(asOf, -1), card.cutDay)
          : undefined;
    const due =
      cutoff && card.statement !== undefined
        ? nextDayOfMonth(cutoff, card.dueDay)
        : nextDayOfMonth(asOf, card.dueDay);
    if (due > through) return [];
    const paid = sum(
      scheduled(rows, asOf, cutoff ?? card.date).filter(
        (e) => e.kind === "payment" && e.target === card.id && completed(e),
      ),
      (e) => e.amount,
    );
    const amount = Math.max(
      0,
      Math.min(
        card.balance,
        card.statement === undefined ? card.balance : card.statement - paid,
      ),
    );
    return amount
      ? [
          {
            id: card.id,
            name:
              card.name +
              " · " +
              (card.statement === undefined ? "Kart borcu" : "Ekstre"),
            date: due,
            amount,
          },
        ]
      : [];
  });
}
export function paymentItems(
  rows: Data,
  date: string,
  through: string,
  from = "0000-01-01",
) {
  const cards = new Set(rows.filter((e) => e.kind === "card").map((e) => e.id));
  const bills = scheduled(rows, through, from).filter(
    (e) =>
      e.kind === "expense" &&
      statusOf(e, date) !== "paid" &&
      (isFixed(e) || !completed(e)) &&
      !cards.has(e.source ?? ""),
  );
  return [
    ...bills,
    ...cardObligations(rows, date, through).filter((e) => e.date >= from),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

export function availableUntilSalary(
  rows: Data,
  date: string,
  salaryDay: number,
) {
  const salary = nextDayOfMonth(date, salaryDay);
  const days = Math.max(1, daysBetween(date, salary));
  const cash = sum(
    balances(rows, date).filter((e) => e.kind === "account"),
    (e) => e.balance,
  );
  const required = sum(paymentItems(rows, date, salary), (e) => e.amount);
  return {
    salary,
    days,
    required,
    remaining: cash - required,
    daily: Math.floor((cash - required) / days),
  };
}
export function reviseOccurrence(
  rows: Data,
  template: Entry,
  date: string,
  revision: Entry,
  scope: "one" | "future",
) {
  const exceptionDates = template.exceptions ?? [];
  if (scope === "one")
    return [
      ...rows.map((e) =>
        e.id === template.id
          ? { ...e, exceptions: [...new Set([...exceptionDates, date])] }
          : e,
      ),
      {
        ...revision,
        recurring: undefined,
        frequency: undefined,
        until: undefined,
        anchor: undefined,
        occurrenceStatus: undefined,
        exceptions: undefined,
      },
    ];
  const continuation = {
    ...revision,
    until: revision.recurring ? template.until : undefined,
    anchor:
      revision.recurring &&
      revision.date === date &&
      (revision.frequency ?? "monthly") === (template.frequency ?? "monthly")
        ? (template.anchor ?? template.date)
        : undefined,
    occurrenceStatus: revision.recurring
      ? template.occurrenceStatus
      : undefined,
    exceptions: revision.recurring
      ? exceptionDates.filter((d) => d >= date)
      : undefined,
  };
  return [
    ...rows
      .filter((e) => e.id !== template.id || e.date < date)
      .map((e) =>
        e.id === template.id ? { ...e, until: addDays(date, -1) } : e,
      ),
    continuation,
  ];
}
