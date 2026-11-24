import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CirclePlus,
  CreditCard,
  Eye,
  EyeOff,
  House,
  Landmark,
  LayoutList,
  Moon,
  Plus,
  Settings,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  addDays,
  backup,
  balances,
  basis,
  categories,
  completed,
  day,
  incomeCategories,
  interest,
  isFlow,
  labels,
  market,
  money,
  month,
  parseMoney,
  scheduled,
  snapshot,
  sum,
  totals,
  validateData,
  type Data,
  type Entry,
  type Kind,
} from "./model.ts";
import { load, update, type Mode } from "./storage.ts";
import "./style.css";

const today = day();
const start = today.slice(0, 7) + "-01";
const end = addDays(month(start, 1), -1);
const dateLabel = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const monthLabel = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("tr-TR", { month: "short" });
const colors = [
  "#55d39d",
  "#739cff",
  "#ffba78",
  "#cba8ff",
  "#60d4df",
  "#f58e99",
];
const sample: Data = [
  {
    id: "bank",
    kind: "account",
    name: "Vadesiz hesap",
    amount: 1487000,
    date: start,
  },
  {
    id: "card",
    kind: "card",
    name: "Günlük kart",
    amount: 285000,
    limit: 4500000,
    statement: 225000,
    cutDay: 7,
    dueDay: 17,
    date: start,
  },
  {
    id: "deposit",
    kind: "deposit",
    name: "Vadeli birikim",
    amount: 4250000,
    rate: 39,
    tax: 15,
    days: 45,
    date: start,
  },
  {
    id: "salary",
    kind: "income",
    name: "Maaş",
    amount: 4850000,
    date: start,
    target: "bank",
    category: "Maaş",
    recurring: true,
  },
  {
    id: "rent",
    kind: "expense",
    name: "Ev kirası",
    amount: 1620000,
    date: start,
    source: "bank",
    category: "Kira",
    recurring: true,
  },
  {
    id: "market",
    kind: "expense",
    name: "Haftalık market",
    amount: 148750,
    date: today,
    source: "card",
    category: "Market ve manav",
  },
  {
    id: "transport",
    kind: "expense",
    name: "Ulaşım kartı",
    amount: 84500,
    date: today,
    source: "bank",
    category: "Ulaşım",
  },
  {
    id: "internet",
    kind: "expense",
    name: "Ev interneti",
    amount: 67500,
    date: addDays(today, 5),
    source: "bank",
    category: "İnternet",
    paid: false,
    recurring: true,
  },
  {
    id: "goal",
    kind: "goal",
    name: "Acil durum fonu",
    amount: 7000000,
    saved: 4250000,
    date: month(today, 6),
  },
  {
    id: "stock",
    kind: "investment",
    name: "ÖRNEK",
    category: "Hisse senedi",
    amount: 0,
    units: 25,
    cost: 10000,
    price: 11500,
    date: start,
  },
  {
    id: "limit",
    kind: "budget",
    name: "Market ve manav",
    amount: 800000,
    date: start,
  },
];
const tabs = [
  { name: "Özet", icon: House },
  { name: "İşlemler", icon: LayoutList },
  { name: "Varlıklar", icon: Wallet },
  { name: "Raporlar", icon: ChartNoAxesCombined },
  { name: "Takvim", icon: CalendarDays },
] as const;
type Tab = (typeof tabs)[number]["name"] | "Ayarlar";
const field = (
  name: string,
  label: string,
  value: string | number | undefined,
  type = "text",
  required = false,
) => (
  <label>
    {label}
    <input
      name={name}
      type={type}
      defaultValue={value}
      required={required}
      inputMode={type === "text" && name !== "name" ? "decimal" : undefined}
    />
  </label>
);
const tl = (value: number | undefined) =>
  value === undefined ? "" : String(value / 100);
const select = (
  name: string,
  label: string,
  value: string | undefined,
  options: [string, string][],
  empty?: string,
) => (
  <label>
    {label}
    <select name={name} defaultValue={value ?? ""} required={!empty}>
      {empty && <option value="">{empty}</option>}
      {options.map(([id, text]) => (
        <option key={id} value={id}>
          {text}
        </option>
      ))}
    </select>
  </label>
);
const check = (name: string, label: string, value: boolean | undefined) => (
  <label className="check">
    <input name={name} type="checkbox" defaultChecked={value} />
    {label}
  </label>
);

function Editor({
  entry,
  rows,
  close,
  save,
  remove,
}: {
  entry: Entry;
  rows: Data;
  close: () => void;
  save: (entry: Entry) => Promise<void>;
  remove: (entry: Entry) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { kind } = entry;
  const bank = rows
    .filter((e) => e.kind === "account")
    .map((e) => [e.id, e.name] as [string, string]);
  const cards = rows
    .filter((e) => e.kind === "card")
    .map((e) => [e.id, e.name] as [string, string]);
  const deposits = rows
    .filter((e) => e.kind === "deposit")
    .map((e) => [e.id, e.name] as [string, string]);
  const cash = [...bank, ...deposits];
  const spending = [
    ...new Set([
      ...categories,
      ...rows.filter((e) => e.kind === "budget").map((e) => e.name),
    ]),
  ];
  const execute = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt işlemi tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const str = (key: string) => String(data.get(key) ?? "").trim();
    const amount = (key: string) =>
      str(key) ? parseMoney(str(key)) : undefined;
    const number = (key: string) =>
      str(key) ? Number(str(key).replace(",", ".")) : undefined;
    void execute(async () => {
      await save({
        id: entry.id,
        kind,
        name: str("name"),
        date: str("date") || entry.date,
        amount: amount("amount") ?? 0,
        category: str("category") || undefined,
        source: str("source") || undefined,
        target: str("target") || undefined,
        recurring: data.has("recurring") || undefined,
        occurrenceStatus: data.has("recurring")
          ? entry.occurrenceStatus
          : undefined,
        paid: isFlow(entry) ? data.has("paid") : undefined,
        installments: number("installments"),
        limit: amount("limit"),
        statement: amount("statement"),
        cutDay: number("cutDay"),
        dueDay: number("dueDay"),
        rate: number("rate"),
        tax: number("tax"),
        excluded: amount("excluded"),
        days: number("days"),
        units: number("units"),
        price: amount("price"),
        cost: amount("cost"),
        saved: amount("saved"),
      });
    });
  };
  return (
    <div className="overlay" onClick={close}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={labels[kind]}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-head">
          <h2>{labels[kind]}</h2>
          <button className="icon" aria-label="Kapat" onClick={close}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="fields">
            {field(
              "name",
              kind === "investment"
                ? "Kod veya yatırım adı"
                : kind === "budget"
                  ? "Kategori adı"
                  : "Ad",
              entry.name,
              "text",
              true,
            )}
            {kind !== "investment" &&
              field(
                "amount",
                (
                  {
                    account: "Başlangıç bakiyesi",
                    card: "Başlangıç borcu",
                    deposit: "Anapara",
                    goal: "Hedef tutarı",
                    budget: "Aylık limit (₺, isteğe bağlı)",
                  } as Partial<Record<Kind, string>>
                )[kind] ?? "Tutar (₺)",
                tl(
                  entry.amount ||
                    (["account", "card", "deposit"].includes(kind)
                      ? 0
                      : undefined),
                ),
                "text",
                kind !== "budget",
              )}
            {kind !== "budget" &&
              field(
                "date",
                kind === "goal"
                  ? "Hedef tarihi"
                  : kind === "deposit"
                    ? "Vade başlangıcı"
                    : "Tarih",
                entry.date,
                "date",
                true,
              )}
            {kind === "income" && (
              <>
                {select(
                  "category",
                  "Gelir türü",
                  entry.category,
                  incomeCategories.map((v) => [v, v]),
                )}
                {select(
                  "target",
                  "Alıcı hesap",
                  entry.target,
                  cash,
                  "Hesap seçmeden kaydet",
                )}
              </>
            )}
            {kind === "expense" && (
              <>
                {select(
                  "category",
                  "Kategori",
                  entry.category,
                  spending.map((v) => [v, v]),
                )}
                {select(
                  "source",
                  "Ödeme aracı",
                  entry.source,
                  [...bank, ...cards],
                  "Hesap seçmeden kaydet",
                )}
                {field(
                  "installments",
                  "Taksit sayısı (kart için)",
                  entry.installments,
                )}
              </>
            )}
            {kind === "transfer" && (
              <>
                {select("source", "Gönderen hesap", entry.source, cash)}
                {select("target", "Alıcı hesap", entry.target, cash)}
              </>
            )}
            {kind === "payment" && (
              <>
                {select("source", "Banka hesabı", entry.source, bank)}
                {select("target", "Ödenen kart", entry.target, cards)}
              </>
            )}
            {kind === "card" && (
              <>
                {field(
                  "limit",
                  "Kart limiti (₺)",
                  tl(entry.limit),
                  "text",
                  true,
                )}
                {field("statement", "Ekstre borcu (₺)", tl(entry.statement))}
                {field("cutDay", "Hesap kesim günü", entry.cutDay)}
                {field("dueDay", "Son ödeme günü", entry.dueDay)}
              </>
            )}
            {kind === "deposit" && (
              <>
                {field("rate", "Yıllık faiz (%)", entry.rate, "text", true)}
                {field("tax", "Stopaj (%)", entry.tax, "text", true)}
                {field(
                  "excluded",
                  "Faiz işlemeyen tutar (₺)",
                  tl(entry.excluded),
                )}
                {field("days", "Vade süresi (gün)", entry.days)}
              </>
            )}
            {kind === "investment" && (
              <>
                {select(
                  "category",
                  "Yatırım türü",
                  entry.category,
                  ["Hisse senedi", "Altın", "Döviz"].map((v) => [v, v]),
                )}
                {field("units", "Adet", entry.units, "text", true)}
                {field(
                  "cost",
                  "Ortalama birim maliyet (₺)",
                  tl(entry.cost),
                  "text",
                  true,
                )}
                {field(
                  "price",
                  "Manuel güncel birim fiyatı (₺)",
                  tl(entry.price),
                )}
              </>
            )}
            {kind === "goal" &&
              field(
                "saved",
                "Mevcut birikim (₺)",
                tl(entry.saved),
                "text",
                true,
              )}
            {isFlow(entry) &&
              check(
                "paid",
                entry.recurring
                  ? "Yinelenen işlemler varsayılan olarak tamamlandı"
                  : kind === "income"
                    ? "Gerçekleşti"
                    : "Tamamlandı",
                completed(entry),
              )}
            {(kind === "income" || kind === "expense") &&
              check("recurring", "Her ay tekrarla", entry.recurring)}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <button className="primary" disabled={busy}>
              Kaydet
            </button>
            {rows.some((e) => e.id === entry.id) && (
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => {
                  if (confirm("Bu kayıt kalıcı olarak silinsin mi?"))
                    void execute(() => remove(entry));
                }}
              >
                Sil
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

const download = (name: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};
const calendarCard = (e: Entry, from: string, to: string): Entry[] => {
  const result: Entry[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  for (let i = 0; i <= (ty - fy) * 12 + tm - fm; i++) {
    for (const [d, title] of [
      [e.cutDay, "Ekstre kesimi"],
      [e.dueDay, "Son ödeme"],
    ] as const) {
      if (!d) continue;
      const first = month(from.slice(0, 7) + "-01", i);
      const last = Number(addDays(month(first, 1), -1).slice(-2));
      const date =
        first.slice(0, 8) + String(Math.min(last, d)).padStart(2, "0");
      if (date >= from && date <= to && date >= e.date)
        result.push({ ...e, date, name: e.name + " · " + title });
    }
  }
  return result;
};
function App() {
  const [mode, setMode] = useState<Mode>("personal");
  const [rows, setRows] = useState<Data>([]);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("Özet");
  const [dark, setDark] = useState(
    () => localStorage.getItem("finans360-theme") !== "light",
  );
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState("");
  const [entry, setEntry] = useState<Entry>();
  const [chooser, setChooser] = useState(false);
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const [period, setPeriod] = useState(6);
  const [paymentFilter, setPaymentFilter] = useState("");
  const initial = mode === "demo" ? sample : [];
  useEffect(() => {
    let active = true;
    load(mode)
      .then((data) => {
        if (active) {
          setRows(data ?? (mode === "demo" ? sample : []));
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setError("Yerel veri deposu açılamadı.");
      });
    return () => {
      active = false;
    };
  }, [mode]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("finans360-theme", dark ? "dark" : "light");
  }, [dark]);
  const mutate = async (change: (data: Data) => Data) =>
    setRows(await update(mode, initial, (rows) => validateData(change(rows))));
  const run = (action: () => Promise<unknown>) =>
    void action().catch((e) =>
      setError(e instanceof Error ? e.message : "İşlem tamamlanamadı."),
    );
  const newEntry = (kind: Kind, defaults: Partial<Entry> = {}) => {
    setChooser(false);
    setEntry({
      id: crypto.randomUUID(),
      kind,
      name: "",
      amount: 0,
      date: kind === "goal" ? month(today, 6) : today,
      ...defaults,
    });
  };
  const navigate = (next: Tab) => {
    setTab(next);
    setError("");
    window.scrollTo(0, 0);
  };
  const fmt = (amount: number) => (visible ? money(amount) : "••••");
  const summary = snapshot(rows, today);
  const monthly = totals(rows, start, today);
  const yearly = totals(rows, today.slice(0, 4) + "-01-01", today);
  const forecast = snapshot(rows, end, true, start).cash;
  const rangeEnd = to >= from ? to : from;
  const selected = totals(rows, from, rangeEnd);
  const spending = scheduled(rows, rangeEnd, from).filter(
    (e) => e.kind === "expense" && completed(e),
  );
  const byCategory = [...new Set(spending.map((e) => e.category ?? "Diğer"))]
    .map((name) => ({
      name,
      value: sum(
        spending.filter((e) => (e.category ?? "Diğer") === name),
        (e) => e.amount,
      ),
    }))
    .sort((a, b) => b.value - a.value);
  const chartEnd = tab === "Raporlar" ? rangeEnd : today;
  const chartStart = chartEnd.slice(0, 7) + "-01";
  const series = Array.from({ length: period }, (_, i) => {
    const date = month(chartStart, i - period + 1),
      last = i === period - 1 ? chartEnd : addDays(month(date, 1), -1),
      t = totals(rows, date, last);
    return {
      name: monthLabel(date),
      Gelir: t.income,
      Gider: t.expense,
      Birikim: snapshot(rows, last).assets,
    };
  });
  const upcoming = (first: string, last: string) =>
    [
      ...scheduled(rows, last, first).filter((e) => e.kind === "expense"),
      ...rows
        .filter((e) => e.kind === "deposit" && (e.days ?? 0) > 0)
        .map((e) => ({ ...e, date: addDays(e.date, e.days!) }))
        .filter((e) => e.date >= first && e.date <= last),
      ...rows
        .filter((e) => e.kind === "card")
        .flatMap((e) => calendarCard(e, first, last)),
    ].sort((a, b) => a.date.localeCompare(b.date));
  const open = (e: Entry) => setEntry(rows.find((row) => row.id === e.id) ?? e);
  const row = (e: Entry, showStatus = false) => (
    <div className="entry-wrap" key={e.id + "-" + e.date + "-" + e.name}>
      <button
        className="entry-row"
        key={e.id + "-" + e.date + "-" + e.name}
        onClick={() => open(e)}
      >
        <span className={"row-icon " + (e.kind === "income" ? "positive" : "")}>
          {e.kind === "income" ? (
            <ArrowDownLeft size={20} />
          ) : e.kind === "expense" ? (
            <ArrowUpRight size={20} />
          ) : (
            <CalendarDays size={19} />
          )}
        </span>
        <span className="row-text">
          <strong>{e.name}</strong>
          <small>
            {e.category || labels[e.kind]} · {dateLabel(e.date)}
            {showStatus && (e.kind === "expense" || e.kind === "income")
              ? " · " +
                (completed(e)
                  ? e.kind === "income"
                    ? "Gerçekleşti"
                    : "Ödendi"
                  : "Bekliyor")
              : ""}
          </small>
        </span>
        {isFlow(e) && (
          <strong className={e.kind === "income" ? "positive" : ""}>
            {e.kind === "income" ? "+" : e.kind === "expense" ? "−" : ""}
            {fmt(e.amount)}
          </strong>
        )}
        <ChevronRight className="muted chevron" size={16} />
      </button>
      {showStatus &&
        e.recurring &&
        (e.kind === "expense" || e.kind === "income") && (
          <button
            className="link occurrence"
            onClick={() =>
              run(() =>
                mutate((data) =>
                  data.map((template) =>
                    template.id === e.id
                      ? {
                          ...template,
                          occurrenceStatus: {
                            ...template.occurrenceStatus,
                            [e.date]: !completed(e),
                          },
                        }
                      : template,
                  ),
                ),
              )
            }
          >
            {completed(e)
              ? "Bekliyor olarak işaretle"
              : e.kind === "income"
                ? "Gerçekleşti olarak işaretle"
                : "Ödendi olarak işaretle"}
          </button>
        )}
    </div>
  );
  const panel = (title: string, body: ReactNode, extra?: ReactNode) => (
    <section className="panel">
      <div className="section-head">
        <h2>{title}</h2>
        {extra}
      </div>
      {body}
    </section>
  );
  const list = (records: Data, empty: string, status = false) =>
    records.length ? (
      records.map((e) => row(e, status))
    ) : (
      <p className="empty">{empty}</p>
    );
  const stats = (items: [string, number][]) =>
    items.map(([name, value]) => (
      <div className="stat" key={name}>
        <span>{name}</span>
        <strong>{fmt(value)}</strong>
      </div>
    ));
  const range = (
    <div className="range">
      <label>
        Başlangıç
        <input
          type="date"
          value={from}
          onChange={(e) => e.target.value && setFrom(e.target.value)}
        />
      </label>
      <label>
        Bitiş
        <input
          type="date"
          min={from}
          value={to}
          onChange={(e) => e.target.value && setTo(e.target.value)}
        />
      </label>
    </div>
  );
  const chart = (type: "flow" | "saving" = "flow") =>
    visible ? (
      <div
        className="chart"
        aria-label={
          type === "flow" ? "Aylık gelir ve gider" : "Birikim geçmişi"
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          {type === "flow" ? (
            <BarChart
              data={series}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--line)"
                strokeDasharray="4 5"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                stroke="var(--muted)"
              />
              <YAxis hide />
              <Tooltip
                formatter={(v) => money(Number(v))}
                contentStyle={{
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                }}
              />
              <Bar
                dataKey="Gelir"
                fill="#55d39d"
                radius={[5, 5, 0, 0]}
                maxBarSize={25}
              />
              <Bar
                dataKey="Gider"
                fill="#739cff"
                radius={[5, 5, 0, 0]}
                maxBarSize={25}
              />
            </BarChart>
          ) : (
            <AreaChart data={series}>
              <XAxis dataKey="name" stroke="var(--muted)" />
              <YAxis hide />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Area
                dataKey="Birikim"
                stroke="#55d39d"
                fill="#55d39d"
                fillOpacity={0.2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    ) : (
      <p className="empty">Tutarlar gizli.</p>
    );
  const pie = (data: { name: string; value: number }[]) =>
    visible && data.some((e) => e.value > 0) ? (
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="42%"
              outerRadius="67%"
            >
              {data.map((e, i) => (
                <Cell key={e.name + i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => money(Number(v))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <p className="empty">
        {visible ? "Grafik için yeterli veri yok." : "Tutarlar gizli."}
      </p>
    );
  const budgets = rows.filter((e) => e.kind === "budget");
  const warnings = budgets.map((e) => ({
    e,
    spent: sum(
      scheduled(rows, end, start).filter(
        (x) => x.kind === "expense" && completed(x) && x.category === e.name,
      ),
      (x) => x.amount,
    ),
  }));
  const portfolio = rows.filter((e) => e.kind === "investment");
  const portfolioData = [
    ...new Set(portfolio.map((e) => e.category ?? "Diğer")),
  ].map((name) => ({
    name,
    value: sum(
      portfolio.filter((e) => (e.category ?? "Diğer") === name),
      market,
    ),
  }));
  const chooseKinds =
    tab === "Varlıklar"
      ? (["account", "card", "deposit", "investment", "goal"] as const)
      : ([
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
        ] as const);
  const completedExpenses = scheduled(rows, today).filter(completed);
  return (
    <div className="shell">
      <header className="top">
        <button className="brand" onClick={() => navigate("Özet")}>
          <span className="brand-icon">
            <Activity size={23} />
          </span>
          <span>
            Finans<span>360</span>
          </span>
        </button>
        <div className="top-controls">
          {mode === "demo" && <span className="demo">Örnek veri</span>}
          <button
            className="icon"
            aria-label={dark ? "Aydınlık tema" : "Karanlık tema"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            className="icon"
            aria-label="Ayarlar"
            onClick={() => navigate("Ayarlar")}
          >
            <Settings size={19} />
          </button>
        </div>
      </header>
      <main>
        <div className="heading">
          <div>
            <p>
              {tab === "Özet"
                ? new Date().toLocaleDateString("tr-TR", {
                    month: "long",
                    year: "numeric",
                  })
                : "Finans360"}
            </p>
            <h1>{tab === "Özet" ? "Finansal özet" : tab}</h1>
          </div>
          {ready && tab !== "Ayarlar" && (
            <button className="primary add" onClick={() => setChooser(true)}>
              <Plus size={19} /> Yeni kayıt
            </button>
          )}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!ready && <p className="empty">Yerel kayıtlar yükleniyor…</p>}
        {ready && tab === "Özet" && (
          <>
            <section className="hero">
              <div className="hero-top">
                <span>
                  <Wallet size={17} /> Net finansal varlık
                </span>
                <button
                  className="icon hero-icon"
                  aria-label={visible ? "Tutarları gizle" : "Tutarları göster"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
              <div className="net">{fmt(summary.net)}</div>
              <div className="hero-stats">
                {stats([
                  ["Kullanılabilir nakit", summary.cash],
                  ["Birikim ve yatırım", summary.assets],
                  ["Kredi kartı borcu", summary.debt],
                ])}
              </div>
            </section>
            <div className="quick">
              <button onClick={() => newEntry("income")}>
                <ArrowDownLeft size={20} /> Gelir ekle
              </button>
              <button onClick={() => newEntry("expense")}>
                <ArrowUpRight size={20} /> Gider ekle
              </button>
            </div>
            <div className="metrics">
              {stats([
                ["Aylık gelir", monthly.income],
                ["Aylık gider", monthly.expense],
                ["Ay sonu tahmini nakit", forecast],
              ])}
              <div className="stat">
                <span>Tasarruf oranı</span>
                <strong>
                  {visible
                    ? "%" +
                      monthly.rate.toLocaleString("tr-TR", {
                        maximumFractionDigits: 1,
                      })
                    : "••••"}
                </strong>
              </div>
            </div>
            <div className="grid">
              {panel(
                "Gelir ve gider",
                <>
                  {chart()}
                  <div className="legend">
                    <span>● Gelir</span>
                    <span>● Gider</span>
                  </div>
                </>,
              )}
              {panel(
                "Yaklaşan ödemeler",
                list(
                  upcoming(today, addDays(today, 30))
                    .filter((e) => e.kind !== "expense" || !completed(e))
                    .slice(0, 5),
                  "Önümüzdeki 30 gün için kayıt yok.",
                  true,
                ),
                <button className="link" onClick={() => navigate("Takvim")}>
                  Takvim
                </button>,
              )}
            </div>
            {panel(
              "Son işlemler",
              list(
                [...completedExpenses]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 5),
                "İlk işleminizi ekleyin.",
              ),
              <button className="link" onClick={() => navigate("İşlemler")}>
                Tüm işlemler
              </button>,
            )}
          </>
        )}
        {ready && tab === "İşlemler" && (
          <>
            {panel(
              "İşlem geçmişi",
              <>
                {range}
                <div className="range">
                  <label>
                    İşlem türü
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="">Tümü</option>
                      {(
                        ["income", "expense", "transfer", "payment"] as const
                      ).map((k) => (
                        <option value={k} key={k}>
                          {labels[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Kategori
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Tümü</option>
                      {[
                        ...new Set([
                          ...incomeCategories,
                          ...categories,
                          ...budgets.map((e) => e.name),
                        ]),
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {list(
                  scheduled(rows, rangeEnd, from)
                    .filter(
                      (e) =>
                        (!filter || e.kind === filter) &&
                        (!category || e.category === category),
                    )
                    .sort((a, b) => b.date.localeCompare(a.date)),
                  "Bu filtreyle eşleşen işlem yok.",
                  true,
                )}
              </>,
            )}
            {panel(
              "Kategoriler ve aylık bütçeler",
              <>
                {warnings.length ? (
                  warnings.map(({ e, spent }) => (
                    <button
                      className="entry-row"
                      key={e.id}
                      onClick={() => open(e)}
                    >
                      <span className="row-text">
                        <strong>{e.name}</strong>
                        <small>
                          {e.amount
                            ? fmt(spent) + " / " + fmt(e.amount)
                            : "Limit belirlenmedi"}
                        </small>
                      </span>
                      {e.amount > 0 && spent > e.amount && (
                        <span className="error">Limit aşıldı</span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="empty">
                    Kategori ekleyin veya mevcut bir kategoriye limit
                    belirleyin.
                  </p>
                )}
              </>,
              <button className="link" onClick={() => newEntry("budget")}>
                Ekle
              </button>,
            )}
          </>
        )}
        {ready && tab === "Varlıklar" && (
          <>
            <div className="metrics">
              {stats([
                ["Nakit", summary.cash],
                ["Kart borcu", summary.debt],
                ["Mevduat ve yatırım", summary.assets],
              ])}
            </div>
            <div className="quick">
              <button onClick={() => newEntry("transfer")}>
                <Landmark size={19} /> Transfer
              </button>
              <button onClick={() => newEntry("payment")}>
                <CreditCard size={19} /> Kart öde
              </button>
            </div>
            <div className="grid">
              {(
                ["account", "card", "deposit", "investment", "goal"] as const
              ).map((kind) => {
                const items =
                  kind === "goal"
                    ? rows
                        .filter((e) => e.kind === kind)
                        .map((e) => ({ ...e, balance: e.saved ?? 0 }))
                    : balances(rows, today).filter((e) => e.kind === kind);
                return (
                  <div key={kind}>
                    {panel(
                      labels[kind],
                      items.length ? (
                        items.map((e) => (
                          <article className="asset" key={e.id}>
                            <button
                              className="entry-row"
                              onClick={() => open(e)}
                            >
                              <span className="row-text">
                                <strong>{e.name}</strong>
                              </span>
                              <strong>{fmt(e.balance)}</strong>
                              <ChevronRight size={16} />
                            </button>
                            {kind === "card" && (
                              <>
                                <p>
                                  Kullanılabilir limit{" "}
                                  {fmt((e.limit ?? 0) - e.balance)} · Ekstre{" "}
                                  {fmt(e.statement ?? 0)}
                                </p>
                                <p>
                                  Kesim günü {e.cutDay ?? "—"} · Son ödeme günü{" "}
                                  {e.dueDay ?? "—"}
                                </p>
                                <button
                                  className="link"
                                  onClick={() =>
                                    newEntry("payment", {
                                      target: e.id,
                                      amount: Math.max(0, e.balance),
                                    })
                                  }
                                >
                                  Borç ödemesi kaydet
                                </button>
                              </>
                            )}
                            {kind === "deposit" && (
                              <>
                                <p>
                                  Vade bitişi{" "}
                                  {(e.days ?? 0) > 0
                                    ? dateLabel(addDays(e.date, e.days!))
                                    : "—"}
                                </p>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Dönem</th>
                                      <th>Brüt</th>
                                      <th>Net</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(
                                      [
                                        ["Günlük", 1],
                                        ["Aylık", 30],
                                        ["Yıllık", 365],
                                        ...(e.days ? [["Vade", e.days]] : []),
                                      ] as [string, number][]
                                    ).map(([name, days]) => {
                                      const i = interest(e, days);
                                      return (
                                        <tr key={name}>
                                          <td>{name}</td>
                                          <td>{fmt(i.gross)}</td>
                                          <td>{fmt(i.net)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                                <p>
                                  Kaydedilen faiz{" "}
                                  {fmt(
                                    sum(
                                      completedExpenses.filter(
                                        (x) =>
                                          x.kind === "income" &&
                                          x.category === "Faiz geliri" &&
                                          x.target === e.id,
                                      ),
                                      (x) => x.amount,
                                    ),
                                  )}
                                </p>
                                <button
                                  className="link"
                                  onClick={() =>
                                    newEntry("income", {
                                      name: "Mevduat faizi",
                                      category: "Faiz geliri",
                                      target: e.id,
                                    })
                                  }
                                >
                                  Gerçekleşen faizi kaydet
                                </button>
                              </>
                            )}
                            {kind === "investment" && (
                              <p>
                                {e.category} ·{" "}
                                {e.units?.toLocaleString("tr-TR")} adet ·{" "}
                                {e.price === undefined
                                  ? "Maliyet değeri kullanılıyor"
                                  : "Kâr / zarar " + fmt(market(e) - basis(e))}
                              </p>
                            )}
                            {kind === "goal" && (
                              <>
                                <progress max={e.amount} value={e.balance} />
                                <p>
                                  %{Math.round((e.balance / e.amount) * 100)} ·
                                  Hedef {fmt(e.amount)} · {dateLabel(e.date)}
                                </p>
                                <p>
                                  Aylık gerekli birikim{" "}
                                  {fmt(
                                    Math.ceil(
                                      (e.amount - e.balance) /
                                        Math.max(
                                          1,
                                          Math.ceil(
                                            (Date.parse(e.date) -
                                              Date.parse(today)) /
                                              86400000 /
                                              30,
                                          ),
                                        ),
                                    ),
                                  )}
                                </p>
                              </>
                            )}
                          </article>
                        ))
                      ) : (
                        <p className="empty">Kayıt yok.</p>
                      ),
                      <button
                        className="link"
                        onClick={() =>
                          newEntry(
                            kind,
                            kind === "goal" ? { name: "Acil durum fonu" } : {},
                          )
                        }
                      >
                        Ekle
                      </button>,
                    )}
                  </div>
                );
              })}
            </div>
            {panel(
              "Portföy dağılımı",
              <>
                {pie(portfolioData)}
                <p>
                  Toplam maliyet {fmt(sum(portfolio, basis))} · Değer farkı{" "}
                  {fmt(sum(portfolio, (e) => market(e) - basis(e)))}
                </p>
              </>,
            )}
          </>
        )}
        {ready && tab === "Raporlar" && (
          <>
            {panel("Rapor dönemi", range)}
            <div className="metrics">
              {stats([
                ["Gelir", selected.income],
                ["Gider", selected.expense],
                ["Nakit", summary.cash],
                ["Borç", summary.debt],
                ["Birikim ve yatırım", summary.assets],
              ])}
              <div className="stat">
                <span>Aylık / yıllık tasarruf oranı</span>
                <strong>
                  {visible
                    ? "%" +
                      monthly.rate.toFixed(1) +
                      " / %" +
                      yearly.rate.toFixed(1)
                    : "••••"}
                </strong>
              </div>
            </div>
            <div className="grid">
              {panel(
                "Gelir ve gider dağılımı",
                pie([
                  { name: "Gelir", value: selected.income },
                  { name: "Gider", value: selected.expense },
                ]),
              )}
              {panel("Kategori dağılımı", pie(byCategory))}
            </div>
            {panel(
              "Aylık karşılaştırma",
              chart(),
              <select
                aria-label="Karşılaştırma dönemi"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
              >
                <option value={6}>6 ay</option>
                <option value={12}>12 ay</option>
              </select>,
            )}
            {panel("Birikim büyümesi", chart("saving"))}
            {panel(
              "En yüksek harcama kategorileri",
              byCategory.length ? (
                <table>
                  <tbody>
                    {byCategory.map((e) => (
                      <tr key={e.name}>
                        <td>{e.name}</td>
                        <td>{fmt(e.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty">Bu dönem için harcama yok.</p>
              ),
            )}
            {panel(
              "Bütçe uyarıları",
              warnings.some(
                ({ e, spent }) => e.amount > 0 && spent > e.amount,
              ) ? (
                warnings
                  .filter(({ e, spent }) => e.amount > 0 && spent > e.amount)
                  .map(({ e, spent }) => (
                    <p key={e.id}>
                      {e.name} limiti {fmt(spent - e.amount)} aşıldı.
                    </p>
                  ))
              ) : (
                <p className="empty">Aşılmış aylık bütçe yok.</p>
              ),
            )}
          </>
        )}
        {ready &&
          tab === "Takvim" &&
          panel(
            "Ödeme takvimi",
            <>
              {range}
              <div className="range">
                <label>
                  Ödeme durumu
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                  >
                    <option value="">Tümü</option>
                    <option value="paid">Ödendi</option>
                    <option value="pending">Bekliyor</option>
                  </select>
                </label>
              </div>
              {list(
                upcoming(from, rangeEnd).filter(
                  (e) =>
                    !paymentFilter ||
                    (e.kind === "expense" && completed(e)) ===
                      (paymentFilter === "paid"),
                ),
                "Bu dönemde ödeme veya vade kaydı yok.",
                true,
              )}
            </>,
          )}
        {ready && tab === "Ayarlar" && (
          <>
            {panel(
              "Görünüm ve veri modu",
              <div className="settings">
                <button onClick={() => setDark(!dark)}>
                  {dark ? "Aydınlık temaya geç" : "Karanlık temaya geç"}
                </button>
                <button
                  onClick={() => {
                    setReady(false);
                    setRows([]);
                    setMode(mode === "personal" ? "demo" : "personal");
                  }}
                >
                  {mode === "personal"
                    ? "Örnek verileri aç"
                    : "Kişisel kayıtlara dön"}
                </button>
                <p>Türkçe · Türk lirası</p>
              </div>,
            )}
            {panel(
              "Yedekleme ve dışa aktarma",
              <div className="settings">
                <button
                  onClick={() =>
                    download(
                      "finans360-" + mode + ".json",
                      new Blob(
                        [
                          JSON.stringify(
                            { version: 1, mode, records: rows },
                            null,
                            2,
                          ),
                        ],
                        { type: "application/json" },
                      ),
                    )
                  }
                >
                  JSON yedeği indir
                </button>
                <button
                  onClick={() =>
                    run(async () => {
                      const { default: ExcelJS } = await import("exceljs");
                      const book = new ExcelJS.Workbook();
                      for (const k of Object.keys(labels) as Kind[]) {
                        const records = rows.filter((e) => e.kind === k);
                        if (!records.length) continue;
                        const sheet = book.addWorksheet(labels[k].slice(0, 31));
                        sheet.addRow([
                          "Ad",
                          "Tarih",
                          "Kategori",
                          "Tutar (₺)",
                          "Kaynak",
                          "Hedef",
                          "Tamamlandı",
                          "Aylık tekrar",
                          "Taksit",
                          "Limit (₺)",
                          "Ekstre (₺)",
                          "Kesim günü",
                          "Ödeme günü",
                          "Faiz (%)",
                          "Stopaj (%)",
                          "Faiz işlemeyen tutar (₺)",
                          "Vade (gün)",
                          "Adet",
                          "Birim fiyat (₺)",
                          "Birim maliyet (₺)",
                          "Mevcut birikim (₺)",
                        ]);
                        for (const e of records) {
                          const lira = (amount?: number) =>
                            amount === undefined ? undefined : amount / 100;
                          sheet.addRow([
                            e.name,
                            e.date,
                            e.category,
                            lira(e.amount),
                            rows.find((r) => r.id === e.source)?.name,
                            rows.find((r) => r.id === e.target)?.name,
                            isFlow(e) ? completed(e) : undefined,
                            e.recurring,
                            e.installments,
                            lira(e.limit),
                            lira(e.statement),
                            e.cutDay,
                            e.dueDay,
                            e.rate,
                            e.tax,
                            lira(e.excluded),
                            e.days,
                            e.units,
                            lira(e.price),
                            lira(e.cost),
                            lira(e.saved),
                          ]);
                        }
                      }
                      if (!book.worksheets.length)
                        book.addWorksheet("Finans360").addRow(["Kayıt yok"]);
                      download(
                        "Finans360.xlsx",
                        new Blob([await book.xlsx.writeBuffer()], {
                          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        }),
                      );
                    })
                  }
                >
                  Excel dosyası indir
                </button>
                <label className="upload">
                  JSON yedeğinden geri yükle
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file)
                        run(async () => {
                          const raw = await file.text();
                          const data = backup(raw);
                          const fileMode = JSON.parse(raw).mode;
                          if (fileMode && fileMode !== mode)
                            throw new Error(
                              "Yedeği oluşturulduğu veri modunda geri yükleyin.",
                            );
                          if (
                            confirm(
                              "Etkin veri modundaki kayıtlar bu yedekle değiştirilsin mi?",
                            )
                          )
                            await mutate(() => data);
                        });
                    }}
                  />
                </label>
                <button
                  className="danger"
                  onClick={() => {
                    if (
                      confirm(
                        "Etkin veri modundaki tüm kayıtlar kalıcı olarak silinsin mi?",
                      )
                    )
                      run(() => mutate(() => []));
                  }}
                >
                  Bu moddaki kayıtları sil
                </button>
                <p>
                  Kayıtlar bu cihazın tarayıcısında tutulur. Yedek dosyanızı
                  güvenli bir yerde saklayın.
                </p>
              </div>,
            )}
          </>
        )}
      </main>
      <nav className="nav" aria-label="Ana menü">
        {tabs.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={name === tab ? "selected" : ""}
            aria-current={name === tab ? "page" : undefined}
            onClick={() => navigate(name)}
          >
            <Icon size={21} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      {chooser && (
        <div className="overlay" onClick={() => setChooser(false)}>
          <section
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Yeni kayıt"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-head">
              <h2>Yeni kayıt</h2>
              <button
                className="icon"
                aria-label="Kapat"
                onClick={() => setChooser(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="chooser">
              {chooseKinds.map((k) => (
                <button key={k} onClick={() => newEntry(k)}>
                  <CirclePlus size={18} />
                  {labels[k]}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {entry && (
        <Editor
          key={entry.id}
          entry={entry}
          rows={rows}
          close={() => setEntry(undefined)}
          save={(e) =>
            mutate((data) =>
              data.some((row) => row.id === e.id)
                ? data.map((row) => (row.id === e.id ? e : row))
                : [...data, e],
            )
          }
          remove={(e) =>
            mutate((data) => {
              if (
                data.some((row) => row.source === e.id || row.target === e.id)
              )
                throw new Error(
                  "Önce bu hesaba bağlı işlemleri kaldırın veya başka hesaba taşıyın.",
                );
              return data.filter((row) => row.id !== e.id);
            })
          }
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(import.meta.env.BASE_URL + "sw.js")
      .catch((error) => console.error("Çevrimdışı kurulum başarısız:", error));
  });
