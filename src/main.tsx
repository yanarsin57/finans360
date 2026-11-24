import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Target,
  ShoppingBasket,
  Zap,
  Bus,
  HeartPulse,
  Utensils,
  Wifi,
  Tag,
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
import { MonthPicker } from "./MonthPicker.tsx";
import { InterestComparison } from "./InterestComparison.tsx";
import { exportPdf, report } from "./report.ts";
import { protect, reveal } from "./device.ts";
import {
  availableUntilSalary,
  cardObligations,
  nextDayOfMonth,
  dateInMonth,
  daysBetween,
  isFixed,
  investmentAt,
  monthEnd,
  reviseOccurrence,
  statusOf,
} from "./model.ts";
import { Amount, Meter, axisAmount } from "./display.tsx";
import { paymentItems } from "./model.ts";
import { PinSettings, verifyPin } from "./PinSettings.tsx";
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
function SelectField({
  name,
  label,
  value,
  options,
  empty,
}: {
  name: string;
  label: string;
  value: string | undefined;
  options: [string, string][];
  empty?: string;
}) {
  const [selected, setSelected] = useState(
    value ?? (empty ? "" : (options[0]?.[0] ?? "")),
  );
  const full = options.find(([id]) => id === selected)?.[1];
  return (
    <label>
      {label}
      <select
        name={name}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        required={!empty}
      >
        {empty && <option value="">{empty}</option>}
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
      {full && full.length > 24 && (
        <small className="selected-label">{full}</small>
      )}
    </label>
  );
}
const select = (
  name: string,
  label: string,
  value: string | undefined,
  options: [string, string][],
  empty?: string,
) => (
  <SelectField
    name={name}
    label={label}
    value={value}
    options={options}
    empty={empty}
  />
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
  occurrence,
  masked,
}: {
  entry: Entry;
  rows: Data;
  close: () => void;
  save: (entry: Entry, scope: "one" | "future") => Promise<void>;
  occurrence?: boolean;
  masked: boolean;
  remove: (entry: Entry) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { kind } = entry;
  const [manual, setManual] = useState(entry.manual ?? false);
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
  const saving = useRef(false);
  const execute = async (action: () => Promise<void>) => {
    if (saving.current) return;
    saving.current = true;
    setError("");
    setBusy(true);
    try {
      await action();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt işlemi tamamlanamadı.");
    } finally {
      saving.current = false;
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
      const frequency = str("frequency") as Entry["frequency"];
      await save(
        {
          ...entry,
          id: entry.id,
          kind,
          name: str("name"),
          date: str("date") || entry.date,
          amount:
            kind === "adjustment" && str("amount").startsWith("-")
              ? -parseMoney(str("amount").slice(1))
              : (amount("amount") ?? 0),
          category: str("category") || undefined,
          source:
            str("source") ||
            (entry.source && !data.has("source") && entry.source) ||
            undefined,
          target:
            str("target") ||
            (entry.target && !data.has("target") && entry.target) ||
            undefined,
          recurring: Boolean(frequency) || undefined,
          frequency: frequency || undefined,
          anchor: frequency ? entry.anchor : undefined,
          exceptions: frequency ? entry.exceptions : undefined,
          until: frequency ? entry.until : undefined,
          createdAt: entry.createdAt ?? Date.now(),
          bank: str("bank") || undefined,
          color: str("color") || undefined,
          icon: str("icon") || undefined,
          fixed: kind === "expense" ? str("fixed") === "fixed" : undefined,
          compound: kind === "deposit" ? data.has("compound") : undefined,
          manual: kind === "investment" ? manual : undefined,
          priceDate:
            kind === "investment" ? str("priceDate") || today : undefined,
          balanceFrom:
            kind === "account" ? str("balanceFrom") || undefined : undefined,
          occurrenceStatus: frequency ? entry.occurrenceStatus : undefined,
          paid: isFlow(entry) ? data.has("paid") : undefined,
          installments: number("installments"),
          limit: amount("limit"),
          statement: amount("statement"),
          statementDate:
            kind === "card" ? str("statementDate") || undefined : undefined,
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
        },
        str("scope") === "future" ? "future" : "one",
      );
    });
  };
  return (
    <div className="overlay" onClick={close}>
      <section
        className={"sheet" + (masked ? " private-editor" : "")}
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
        <form
          onSubmit={submit}
          onInvalid={(event) => {
            const input = event.target as HTMLInputElement;
            input.setCustomValidity(
              input.validity.valueMissing
                ? "Bu alanı doldurun."
                : "Bu alana geçerli bir değer girin.",
            );
            setError(input.validationMessage);
          }}
          onInput={(event) =>
            (event.target as HTMLInputElement).setCustomValidity?.("")
          }
        >
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
            {(kind !== "investment" || manual) &&
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
                    (["account", "card", "deposit", "adjustment"].includes(kind)
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
            {["account", "card", "deposit"].includes(kind) &&
              field("bank", "Banka adı", entry.bank)}
            {kind === "account" && (
              <>
                {field(
                  "balanceFrom",
                  "Açılış bakiyesi tarihi (gün başı)",
                  entry.balanceFrom,
                  "date",
                )}
                {select(
                  "color",
                  "Hesap rengi",
                  entry.color,
                  [
                    ["green", "Zümrüt"],
                    ["blue", "Mavi"],
                    ["purple", "Mor"],
                  ],
                  "Varsayılan",
                )}
                {select(
                  "icon",
                  "Hesap simgesi",
                  entry.icon,
                  [
                    ["bank", "Banka"],
                    ["cash", "Nakit"],
                  ],
                  "Varsayılan",
                )}
                <p className="form-note">
                  Bakiye tarihinden önceki hareketler raporda görünür. Hesap
                  bakiyesi, seçilen günün başındaki tutarla hesaplanır.
                </p>
              </>
            )}
            {kind === "expense" &&
              select(
                "fixed",
                "Gider sınıfı",
                isFixed(entry) ? "fixed" : "variable",
                [
                  ["fixed", "Sabit"],
                  ["variable", "Değişken"],
                ],
              )}
            {kind === "investment" && (
              <label>
                Takip yöntemi
                <select
                  value={manual ? "manual" : "detail"}
                  onChange={(e) => setManual(e.target.value === "manual")}
                >
                  <option value="detail">Ayrıntılı</option>
                  <option value="manual">Toplam portföy</option>
                </select>
              </label>
            )}
            {kind === "investment" &&
              field(
                "priceDate",
                "Değerleme tarihi",
                entry.priceDate ?? today,
                "date",
                true,
              )}
            {kind === "trade" &&
              select("category", "Hareket", entry.category, [
                ["Alım", "Alım"],
                ["Satım", "Satım"],
              ])}
            {kind === "trade" && (
              <>
                {field("units", "Adet", entry.units, "text", true)}
                {select(
                  "source",
                  "Bağlı banka hesabı",
                  entry.source,
                  bank,
                  "Hesaba yansıtma",
                )}
              </>
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
                {field(
                  "statementDate",
                  "Son ekstre kesim tarihi",
                  entry.statementDate,
                  "date",
                )}
                {field("cutDay", "Hesap kesim günü", entry.cutDay)}
                {field("dueDay", "Son ödeme günü", entry.dueDay)}
              </>
            )}
            {kind === "deposit" && (
              <>
                {check("compound", "Günlük bileşik faiz", entry.compound)}
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
            {kind === "investment" && !manual && (
              <>
                {select(
                  "category",
                  "Yatırım türü",
                  entry.category,
                  ["Hisse senedi", "Altın", "Döviz", "Yatırım fonu"].map(
                    (v) => [v, v],
                  ),
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
              select(
                "frequency",
                "Tekrar",
                entry.recurring ? (entry.frequency ?? "monthly") : undefined,
                [
                  ["weekly", "Haftalık"],
                  ["monthly", "Aylık"],
                  ["quarterly", "Üç aylık"],
                  ["yearly", "Yıllık"],
                ],
                "Tek seferlik",
              )}
            {occurrence &&
              select("scope", "Düzenle", "one", [
                ["one", "Yalnızca bu dönem"],
                ["future", "Bu dönem ve sonrakiler"],
              ])}
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
  const [today, setToday] = useState(day);
  const start = today.slice(0, 7) + "-01";
  const end = monthEnd(start);
  useEffect(() => {
    const refresh = () => setToday(day());
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const [mode, setMode] = useState<Mode>("personal");
  const [rows, setRows] = useState<Data>([]);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("Özet");
  const [dark, setDark] = useState(
    () => localStorage.getItem("finans360-theme") !== "light",
  );
  const [visible, setVisible] = useState(
    () => localStorage.getItem("finans360-hide") !== "true",
  );
  const [tooltipAllowed, setTooltipAllowed] = useState(true);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!(event.target as Element)?.closest?.(".chart"))
        setTooltipAllowed(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTooltipAllowed(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const [error, setError] = useState("");
  const [entry, setEntry] = useState<Entry>();
  const [chooser, setChooser] = useState(false);
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(start);
  const [txnMonth, setTxnMonth] = useState(start);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [to, setTo] = useState(end);
  const [period, setPeriod] = useState(6);
  const [paymentFilter, setPaymentFilter] = useState("");
  const [viewMonth, setViewMonth] = useState(start);
  const [calendarDate, setCalendarDate] = useState(today);
  const changeMonth = (value: string) => {
    setViewMonth(value);
    setCalendarDate(value === start ? today : value);
  };
  const [calendarList, setCalendarList] = useState(false);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [fixedFilter, setFixedFilter] = useState("");
  const [assetTab, setAssetTab] = useState("all");
  const [occurrence, setOccurrence] = useState<Entry>();
  const [salaryDay, setSalaryDay] = useState(() =>
    Number(localStorage.getItem("finans360-salary") ?? 1),
  );
  const [interestDays, setInterestDays] = useState(32);
  const [waiting, setWaiting] = useState<ServiceWorker>();
  const [pin, setPin] = useState(
    () => localStorage.getItem("finans360-lock") ?? "",
  );
  const [locked, setLocked] = useState(Boolean(pin));
  const [pinInput, setPinInput] = useState("");
  const [lockError, setLockError] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const unlockGuard = useRef(false);
  const [minutes, setMinutes] = useState(() =>
    [1, 3, 5, 10].includes(
      Number(localStorage.getItem("finans360-lock-minutes")),
    )
      ? Number(localStorage.getItem("finans360-lock-minutes"))
      : 3,
  );
  const [backupStatus, setBackupStatus] = useState("");
  const [versionStatus, setVersionStatus] = useState("");
  const registrationRef = useRef<ServiceWorkerRegistration>(undefined);
  const checkVersion = () =>
    run(async () => {
      if (!navigator.onLine) {
        setVersionStatus("İnternet bağlantısı yok.");
        return;
      }
      if (!registrationRef.current) {
        setVersionStatus("Güncelleme denetimi bu oturumda kullanılamıyor.");
        return;
      }
      setVersionStatus("Yeni sürüm kontrol ediliyor…");
      try {
        const updated = await registrationRef.current.update();
        const candidate = updated.installing;
        if (
          candidate &&
          candidate.state !== "installed" &&
          candidate.state !== "redundant"
        )
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, 8000);
            const state = () => {
              if (
                candidate.state === "installed" ||
                candidate.state === "redundant"
              ) {
                clearTimeout(timeout);
                candidate.removeEventListener("statechange", state);
                resolve();
              }
            };
            candidate.addEventListener("statechange", state);
            state();
          });
        if (updated.waiting) {
          setWaiting(updated.waiting);
          setVersionStatus("Yeni sürüm hazır.");
        } else
          setVersionStatus(
            updated.installing
              ? "Yeni sürüm indiriliyor…"
              : "Yeni sürüm bulunamadı.",
          );
      } catch {
        setVersionStatus(
          "Güncelleme kontrol edilemedi. Bağlantıyı kontrol edin.",
        );
      }
    });
  const createBackup = async (password?: string) => {
    const raw = JSON.stringify({ version: 1, mode, records: rows }, null, 2);
    const data = password ? await protect(password, raw) : raw;
    const time = new Date();
    download(
      "finans360-" +
        mode +
        (password ? "-sifreli" : "") +
        "-" +
        day(time) +
        ".json",
      new Blob([data], { type: "application/json" }),
    );
    setBackupStatus(
      "İndirme isteği oluşturuldu · " +
        time.toLocaleString("tr-TR") +
        ". Dosyalar uygulamasından kontrol edin.",
    );
  };
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    const observe = () => {
      const installing = registration?.installing;
      installing?.addEventListener("statechange", () => {
        if (registration?.waiting && navigator.serviceWorker.controller)
          setWaiting(registration.waiting);
      });
    };
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + "sw.js")
      .then((reg) => {
        registration = reg;
        registrationRef.current = reg;
        if (reg.waiting && navigator.serviceWorker.controller)
          setWaiting(reg.waiting);
        reg.addEventListener("updatefound", observe);
        observe();
      })
      .catch(() => {});
    const foreground = () => {
      if (!document.hidden) void registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", foreground);
    return () => {
      registration?.removeEventListener("updatefound", observe);
      document.removeEventListener("visibilitychange", foreground);
    };
  }, []);
  useEffect(() => {
    if (!pin || locked) return;
    let timer: ReturnType<typeof setTimeout>;
    const lock = () => {
      setPinInput("");
      setLocked(true);
    };
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, minutes * 60000);
    };
    const hide = () => {
      if (document.hidden) lock();
    };
    reset();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [pin, locked, minutes]);
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
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      document.documentElement.style.setProperty(
        "--visual-height",
        viewport.height + "px",
      );
      document.documentElement.style.setProperty(
        "--visual-offset",
        viewport.offsetTop + "px",
      );
    };
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      viewport.removeEventListener("scroll", resize);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("finans360-theme", dark ? "dark" : "light");
  }, [dark]);
  const mutate = async (change: (data: Data) => Data) =>
    setRows(await update(mode, initial, (rows) => validateData(change(rows))));
  const run = (action: () => Promise<unknown>) => {
    setError("");
    void action().catch((e) =>
      setError(e instanceof Error ? e.message : "İşlem tamamlanamadı."),
    );
  };
  const newEntry = (kind: Kind, defaults: Partial<Entry> = {}) => {
    setChooser(false);
    setOccurrence(undefined);
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
    document.querySelector(".shell > main")?.scrollTo(0, 0);
  };
  const fmt = (amount: number) => (visible ? money(amount) : "••••");
  const summary = useMemo(() => snapshot(rows, today), [rows, today]);
  const selectedMonthEnd = monthEnd(viewMonth);
  const monthly = totals(
    rows,
    viewMonth,
    selectedMonthEnd < today ? selectedMonthEnd : today,
  );
  const monthFlows = scheduled(rows, selectedMonthEnd, viewMonth);
  const pending = monthFlows.filter((e) => statusOf(e, today) !== "paid");
  const monthlyExpenses = monthFlows.filter(
    (e) => e.kind === "expense" && statusOf(e, today) === "paid",
  );
  const fixedSpent = sum(monthlyExpenses.filter(isFixed), (e) => e.amount);
  const salary = useMemo(
    () => availableUntilSalary(rows, today, salaryDay),
    [rows, today, salaryDay],
  );
  const current = useMemo(() => balances(rows, today), [rows, today]);
  const deposits = sum(
    current.filter((e) => e.kind === "deposit"),
    (e) => e.balance,
  );
  const investments = sum(
    current.filter((e) => e.kind === "investment"),
    (e) => e.balance,
  );
  const forecast = snapshot(
    rows,
    selectedMonthEnd,
    selectedMonthEnd >= today,
    viewMonth,
  ).cash;
  const rangeEnd = to >= from ? to : from;
  const actualEnd = rangeEnd < today ? rangeEnd : today;
  const selected = totals(rows, from, actualEnd);
  const spending = scheduled(rows, actualEnd, from).filter(
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
  const chartEnd =
    tab === "Raporlar"
      ? actualEnd
      : viewMonth <= today
        ? selectedMonthEnd < today
          ? selectedMonthEnd
          : today
        : today;
  const comparisonMonth = actualEnd.slice(0, 7) + "-01";
  const priorMonth = month(comparisonMonth, -1);
  const priorSpend = totals(rows, priorMonth, monthEnd(priorMonth)).expense;
  const comparisonSpend = totals(rows, comparisonMonth, actualEnd).expense;
  const reportFixed = sum(spending.filter(isFixed), (e) => e.amount);
  const realizedInterest = sum(
    scheduled(rows, actualEnd, from).filter(
      (e) =>
        e.kind === "income" && e.category === "Faiz geliri" && completed(e),
    ),
    (e) => e.amount,
  );
  const salaryIncome = sum(
    scheduled(rows, actualEnd, from).filter(
      (e) => e.kind === "income" && e.category === "Maaş" && completed(e),
    ),
    (e) => e.amount,
  );
  const rent = sum(
    spending.filter((e) => e.category === "Kira"),
    (e) => e.amount,
  );
  const pct = (ratio: number) =>
    visible
      ? ratio.toLocaleString("tr-TR", {
          style: "percent",
          maximumFractionDigits: 1,
        })
      : "••••";
  const chartStart = chartEnd.slice(0, 7) + "-01";
  const series = useMemo(
    () =>
      tab === "Özet" || tab === "Raporlar"
        ? Array.from({ length: period }, (_, i) => {
            const date = month(chartStart, i - period + 1),
              last = i === period - 1 ? chartEnd : addDays(month(date, 1), -1),
              t = totals(rows, date, last);
            const history = snapshot(rows, last);
            const hasFlows = scheduled(rows, last, date).some(completed);
            const availableHistory =
              rows.some(
                (e) =>
                  (e.balanceFrom ?? e.date) <= last &&
                  ["account", "card", "deposit"].includes(e.kind),
              ) ||
              rows.some(
                (e) =>
                  e.kind === "investment" &&
                  e.date <= last &&
                  investmentAt(rows, e, last) !== undefined,
              );
            const positions = rows
              .filter((e) => e.kind === "investment" && e.date <= last)
              .map((e) => investmentAt(rows, e, last));
            const completeValuations = positions.every(
              (value) => value !== undefined,
            );
            return {
              name: monthLabel(date),
              Gelir: hasFlows ? t.income : null,
              Gider: hasFlows ? t.expense : null,
              Birikim:
                availableHistory && completeValuations ? history.assets : null,
              Varlık:
                availableHistory && completeValuations ? history.net : null,
              Borç: rows.some((e) => e.kind === "card" && e.date <= last)
                ? history.debt
                : null,
              Yatırım:
                positions.length && completeValuations
                  ? sum(positions, (v) => v ?? 0)
                  : null,
            };
          })
        : [],
    [rows, period, chartStart, chartEnd, tab],
  );
  const projection = useMemo(
    () =>
      tab === "Raporlar"
        ? Array.from({ length: 12 }, (_, i) => {
            const date = month(start, i + 1);
            const plans = scheduled(rows, monthEnd(date), date);
            return {
              name: monthLabel(date),
              date,
              plannedIncome: sum(
                plans.filter((e) => e.kind === "income"),
                (e) => e.amount,
              ),
              plannedExpense: sum(
                plans.filter((e) => e.kind === "expense"),
                (e) => e.amount,
              ),
              Birikim: snapshot(rows, monthEnd(date), true, today).net,
              Gelir: null,
              Gider: null,
              Varlık: null,
              Borç: null,
              Yatırım: null,
            };
          })
        : [],
    [rows, start, today, tab],
  );
  const upcoming = (first: string, last: string) =>
    [
      ...scheduled(rows, last, first).filter(
        (e) =>
          e.kind === "expense" || e.kind === "income" || e.kind === "payment",
      ),
      ...rows
        .filter((e) => e.kind === "deposit" && (e.days ?? 0) > 0)
        .map((e) => ({ ...e, date: addDays(e.date, e.days!) }))
        .filter((e) => e.date >= first && e.date <= last),
      ...rows
        .filter((e) => e.kind === "card")
        .flatMap((e) => calendarCard(e, first, last)),
    ].sort((a, b) => a.date.localeCompare(b.date));
  const open = (e: Entry) => {
    const original = rows.find((row) => row.id === e.id) ?? e;
    setOccurrence(original.recurring ? e : undefined);
    setEntry(original.recurring ? { ...e } : original);
  };
  const categoryIcons: Record<string, typeof Wallet> = {
    Kira: House,
    Aidat: Landmark,
    "Market ve manav": ShoppingBasket,
    Elektrik: Zap,
    Ulaşım: Bus,
    Sağlık: HeartPulse,
    Yemek: Utensils,
    İnternet: Wifi,
    Alışveriş: Tag,
  };
  const stateLabels = {
    paid: "Tamamlandı",
    pending: "Bekliyor",
    late: "Gecikmiş",
  };
  const txnEnd = monthEnd(txnMonth);
  const txnTotals = totals(rows, txnMonth, txnEnd < today ? txnEnd : today);
  const filterCount = [
    filter,
    category,
    accountFilter,
    stateFilter,
    fixedFilter,
  ].filter(Boolean).length;
  const transactions = [
    ...scheduled(rows, txnEnd, txnMonth),
    ...rows.filter(
      (e) =>
        ["adjustment", "trade", "valuation"].includes(e.kind) &&
        e.date >= txnMonth &&
        e.date <= txnEnd,
    ),
  ]
    .filter(
      (e) =>
        (!filter || e.kind === filter) &&
        (!category || e.category === category) &&
        (!accountFilter ||
          e.source === accountFilter ||
          e.target === accountFilter) &&
        (!stateFilter || statusOf(e, today) === stateFilter) &&
        (!fixedFilter ||
          (e.kind === "expense" && isFixed(e) === (fixedFilter === "fixed"))) &&
        [e.name, e.category ?? ""]
          .join(" ")
          .toLocaleLowerCase("tr")
          .includes(search.trim().toLocaleLowerCase("tr")),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
  const row = (e: Entry, showStatus = false, grouped = false) => (
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
            (() => {
              const Icon = categoryIcons[e.category ?? ""] ?? ArrowUpRight;
              return <Icon size={20} />;
            })()
          ) : (
            <CalendarDays size={19} />
          )}
        </span>
        <span className="row-text">
          <strong>{e.name}</strong>
          <small>
            {e.category || labels[e.kind]}
            {!grouped && " · " + dateLabel(e.date)}
            {showStatus && isFlow(e) && (
              <>
                {" "}
                ·{" "}
                <span className={"status-" + statusOf(e, today)}>
                  {stateLabels[statusOf(e, today)]}
                </span>
              </>
            )}
          </small>
        </span>
        {(isFlow(e) ||
          ["adjustment", "trade", "valuation"].includes(e.kind)) && (
          <Amount
            className={
              e.kind === "income"
                ? "positive"
                : e.kind === "expense"
                  ? "negative"
                  : ""
            }
          >
            {e.kind === "income" ? "+" : e.kind === "expense" ? "−" : ""}
            {fmt(e.amount)}
          </Amount>
        )}
        <ChevronRight className="muted chevron" size={16} />
      </button>
      {showStatus &&
        !grouped &&
        e.date <= today &&
        (e.kind === "expense" || e.kind === "income" || e.kind === "payment") &&
        !(e.installments && e.installments > 1) && (
          <button
            className="link occurrence"
            onClick={() =>
              run(() =>
                mutate((data) =>
                  data.map((template) =>
                    template.id === e.id
                      ? {
                          ...template,
                          paid: template.recurring
                            ? template.paid
                            : !completed(e),
                          occurrenceStatus: template.recurring
                            ? {
                                ...template.occurrenceStatus,
                                [e.date]: !completed(e),
                              }
                            : undefined,
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
        <strong
          className={
            value < 0 ||
            (!/eksi gider/i.test(name) && /gider|bor[çc]|açığı/i.test(name))
              ? "negative"
              : /gelir|kâr/i.test(name)
                ? "positive"
                : undefined
          }
        >
          <Amount>{fmt(value)}</Amount>
        </strong>
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
  const chart = (
    type:
      "flow" | "saving" | "net" | "debt" | "investment" | "projection" = "flow",
  ) =>
    visible &&
    (type === "projection"
      ? rows.length > 0
      : series.some(
          (e) =>
            e[
              type === "net"
                ? "Varlık"
                : type === "debt"
                  ? "Borç"
                  : type === "investment"
                    ? "Yatırım"
                    : type === "saving"
                      ? "Birikim"
                      : "Gelir"
            ] !== null,
        )) ? (
      <div
        className="chart"
        onPointerDown={() => setTooltipAllowed(true)}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") setTooltipAllowed(true);
        }}
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
              <YAxis
                width={75}
                tickFormatter={axisAmount}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
              />
              <Tooltip
                active={tooltipAllowed ? undefined : false}
                cursor={{ fill: "var(--soft)", opacity: 0.55 }}
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
                fill="#f17f8a"
                radius={[5, 5, 0, 0]}
                maxBarSize={25}
              />
            </BarChart>
          ) : (
            <AreaChart data={type === "projection" ? projection : series}>
              <XAxis dataKey="name" stroke="var(--muted)" />
              <YAxis
                width={75}
                tickFormatter={axisAmount}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
              />
              <Tooltip
                active={tooltipAllowed ? undefined : false}
                cursor={{ fill: "var(--soft)", opacity: 0.55 }}
                formatter={(v) => money(Number(v))}
                contentStyle={{
                  background: "var(--panel)",
                  color: "var(--text)",
                  border: "1px solid var(--line)",
                }}
                itemStyle={{ color: "var(--text)" }}
              />
              <Area
                dataKey={
                  type === "net"
                    ? "Varlık"
                    : type === "debt"
                      ? "Borç"
                      : type === "investment"
                        ? "Yatırım"
                        : "Birikim"
                }
                stroke="#55d39d"
                fill="#55d39d"
                fillOpacity={type === "projection" ? 0.08 : 0.2}
                strokeDasharray={type === "projection" ? "5 4" : undefined}
                dot={{ r: 2.5 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    ) : (
      <p className="empty">{visible ? "Veri yok." : "Tutarlar gizli."}</p>
    );
  const pie = (data: { name: string; value: number; color?: string }[]) => {
    const entries = data
      .filter((e) => e.value > 0)
      .map((e, i) => ({ ...e, color: e.color ?? colors[i % colors.length] }));
    const total = sum(entries, (e) => e.value);
    if (!visible || !total)
      return (
        <p className="empty">{visible ? "Veri yok." : "Tutarlar gizli."}</p>
      );
    return (
      <>
        <div className="chart chart-pie">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={entries}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="92%"
                isAnimationActive={false}
              >
                {entries.map((e) => (
                  <Cell key={e.name} fill={e.color} stroke="var(--panel)" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <Amount className="chart-summary">{fmt(total)}</Amount>
        <ul className="chart-list">
          {entries.map((e) => (
            <li key={e.name}>
              <span>
                <i style={{ color: e.color }} />
                {e.name}
              </span>
              <Amount>{fmt(e.value)}</Amount>
              <small>{pct(e.value / total)}</small>
            </li>
          ))}
        </ul>
      </>
    );
  };
  const paymentDetails = (
    title: string,
    items: { id: string; name: string; date: string; amount: number }[],
    note: string,
  ) => (
    <details className="obligations">
      <summary>
        {title} · {fmt(sum(items, (e) => e.amount))}
      </summary>
      <p>{note}</p>
      {items.length ? (
        items.map((e) => (
          <div className="obligation-line" key={e.id + e.date}>
            <span>
              {e.name}
              <br />
              <small>
                {dateLabel(e.date)}
                {e.date < today
                  ? " · Gecikmiş"
                  : e.date === today
                    ? " · Bugün"
                    : ""}
              </small>
            </span>
            <Amount>{fmt(e.amount)}</Amount>
          </div>
        ))
      ) : (
        <p className="empty">Bu aralıkta ödeme yok.</p>
      )}
    </details>
  );
  const budgets = rows.filter((e) => e.kind === "budget");
  const warnings = budgets.map((e) => ({
    e,
    spent: sum(
      scheduled(
        rows,
        tab === "İşlemler" ? (txnEnd < today ? txnEnd : today) : today,
        tab === "İşlemler" ? txnMonth : start,
      ).filter(
        (x) => x.kind === "expense" && completed(x) && x.category === e.name,
      ),
      (x) => x.amount,
    ),
  }));
  const portfolio = current.filter((e) => e.kind === "investment");
  const portfolioData = [
    ...new Set(portfolio.map((e) => e.category ?? "Diğer")),
  ].map((name) => ({
    name,
    value: sum(
      portfolio.filter((e) => (e.category ?? "Diğer") === name),
      (e) => e.balance,
    ),
  }));
  const calendarStart = viewMonth;
  const calendarEnd = monthEnd(calendarStart);
  const firstWeekday = (new Date(calendarStart + "T12:00:00").getDay() + 6) % 7;
  const events = upcoming(calendarStart, calendarEnd);
  const windowItems = (days: number) =>
    paymentItems(rows, today, addDays(today, days - 1), today);
  const lateItems = paymentItems(rows, today, addDays(today, -1));
  const calendarStatus = (e: Entry) =>
    e.kind === "card"
      ? "card"
      : e.kind === "income"
        ? "income"
        : isFlow(e)
          ? statusOf(e, today)
          : "event";
  const reportExcel = () =>
    run(async () => {
      const { default: ExcelJS } = await import("exceljs");
      const book = new ExcelJS.Workbook();
      const sheet = book.addWorksheet("Dönem raporu");
      for (const fields of report(rows, from, actualEnd)) sheet.addRow(fields);
      const detail = book.addWorksheet("Kategori harcamaları");
      detail.addRow(["Kategori", "Gerçekleşen gider (₺)"]);
      for (const item of byCategory)
        detail.addRow([item.name, item.value / 100]);
      download(
        "Finans360-rapor.xlsx",
        new Blob([await book.xlsx.writeBuffer()], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
    });
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
  if (locked)
    return (
      <main className="lock-screen">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (unlockGuard.current) return;
            unlockGuard.current = true;
            setUnlockBusy(true);
            setLockError("");
            void verifyPin(pinInput, pin)
              .then(() => {
                setLocked(false);
                setPinInput("");
              })
              .catch((e) => setLockError(e.message))
              .finally(() => {
                unlockGuard.current = false;
                setUnlockBusy(false);
              });
          }}
        >
          <h1>Finans360 kilitli</h1>
          <label>
            PIN
            <input
              autoComplete="off"
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              required
            />
          </label>
          <button className="primary" disabled={unlockBusy}>
            Kilidi aç
          </button>
          {lockError && <p className="error">{lockError}</p>}
        </form>
      </main>
    );
  return (
    <div className="shell">
      <header className="top">
        <button className="brand" onClick={() => navigate("Özet")}>
          <span className="brand-icon">
            <img
              src={import.meta.env.BASE_URL + "icon-192.png"}
              alt=""
              width={36}
              height={36}
            />
          </span>
          <span>
            Finans<span>360</span>
          </span>
        </button>
        <div className="top-controls">
          <button
            className="icon"
            aria-label={visible ? "Tutarları gizle" : "Tutarları göster"}
            onClick={() => {
              localStorage.setItem("finans360-hide", String(visible));
              setVisible(!visible);
            }}
          >
            {visible ? <Eye size={19} /> : <EyeOff size={19} />}
          </button>
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
        {waiting && (
          <div className="notice">
            <span>Yeni sürüm hazır.</span>
            <button
              className="link"
              disabled={Boolean(entry || chooser)}
              onClick={() => {
                navigator.serviceWorker.addEventListener(
                  "controllerchange",
                  () => location.reload(),
                  { once: true },
                );
                waiting.postMessage("FINANS360_ACTIVATE");
              }}
            >
              Güncelle
            </button>
          </div>
        )}
        {ready && tab === "Özet" && (
          <>
            <section className="hero">
              <div className="hero-top">
                <span>
                  <Wallet size={17} /> Net finansal varlık
                </span>
                <small>Güncel bakiyeler</small>
              </div>
              <div className="net">
                <Amount>{fmt(summary.net)}</Amount>
              </div>
              <div className="hero-stats">
                {stats([
                  ["Kullanılabilir nakit", summary.cash],
                  ["Mevduat", deposits],
                  ["Yatırımlar", investments],
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
            <section className="panel">
              <h2>Aylık bütçe</h2>
              <MonthPicker value={viewMonth} onChange={changeMonth} />
              <div className="budget-lines">
                {stats([
                  ["Gerçekleşen gelir", monthly.income],
                  ["Gerçekleşen gider", monthly.expense],
                  [
                    "Beklenen gelir",
                    sum(
                      pending.filter((e) => e.kind === "income"),
                      (e) => e.amount,
                    ),
                  ],
                  [
                    "Beklenen gider",
                    sum(
                      pending.filter((e) => e.kind === "expense"),
                      (e) => e.amount,
                    ),
                  ],
                  [
                    "Kalan faturalar",
                    sum(
                      pending.filter((e) => e.kind === "expense" && isFixed(e)),
                      (e) => e.amount,
                    ),
                  ],
                  ["Gelir eksi gider", monthly.income - monthly.expense],
                  ["Sabit gider", fixedSpent],
                  ["Değişken gider", monthly.expense - fixedSpent],
                  [
                    selectedMonthEnd < today
                      ? "Ay sonu nakit"
                      : "Ay sonu tahmini nakit",
                    forecast,
                  ],
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
            </section>
            {panel(
              "Maaşa kadar",
              <>
                <p>
                  {daysBetween(today, salary.salary) === 0
                    ? "Maaş günü bugün"
                    : daysBetween(today, salary.salary).toLocaleString(
                        "tr-TR",
                      ) + " gün kaldı"}{" "}
                  · {dateLabel(salary.salary)}
                </p>
                <div className="compact-stats">
                  {stats([
                    [
                      salary.remaining < 0 ? "Nakit açığı" : "Kalan nakit",
                      salary.remaining,
                    ],
                    ["Günlük bütçe", salary.daily],
                  ])}
                </div>
                {paymentDetails(
                  "Borç ve faturalar",
                  paymentItems(rows, today, salary.salary),
                  "Gecikmiş ve maaş gününe kadar vadesi gelen ödemeler, maaş günü dahil. Kart harcamaları ekstreyle birlikte tekrar sayılmaz. Günlük tutar, kalan nakdin en az bir güne bölünüp aşağı kuruşa yuvarlanmasıdır.",
                )}
              </>,
            )}
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
                "Yaklaşan ödemeler ve gelirler",
                list(
                  upcoming(today, addDays(today, 30))
                    .filter((e) => !isFlow(e) || statusOf(e, today) !== "paid")
                    .map((e) =>
                      e.kind === "income"
                        ? { ...e, name: "Beklenen gelir · " + e.name }
                        : e,
                    )
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
                <MonthPicker value={txnMonth} onChange={setTxnMonth} />
                <div className="compact-stats">
                  {stats([
                    ["Gerçekleşen gelir", txnTotals.income],
                    ["Gerçekleşen gider", txnTotals.expense],
                  ])}
                </div>
                <label className="transaction-search">
                  İşlem ara
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <details
                  className="filter-panel"
                  open={filtersOpen}
                  onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
                >
                  <summary>
                    Filtreler
                    {filterCount > 0
                      ? " (" + filterCount.toLocaleString("tr-TR") + ")"
                      : ""}
                  </summary>
                  {filterCount > 0 && (
                    <button
                      className="link"
                      onClick={() => {
                        setFilter("");
                        setCategory("");
                        setAccountFilter("");
                        setStateFilter("");
                        setFixedFilter("");
                      }}
                    >
                      Filtreleri temizle
                    </button>
                  )}
                  <div className="range">
                    <label>
                      İşlem türü
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="">Tümü</option>
                        {(
                          [
                            "income",
                            "expense",
                            "transfer",
                            "payment",
                            "adjustment",
                            "trade",
                            "valuation",
                          ] as const
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
                  <div className="range">
                    <label>
                      Ödeme hesabı
                      <select
                        value={accountFilter}
                        onChange={(e) => setAccountFilter(e.target.value)}
                      >
                        <option value="">Tümü</option>
                        {rows
                          .filter((e) =>
                            ["account", "card", "deposit"].includes(e.kind),
                          )
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Durum
                      <select
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                      >
                        <option value="">Tümü</option>
                        {Object.entries(stateLabels).map(([key, value]) => (
                          <option value={key} key={key}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Gider sınıfı
                      <select
                        value={fixedFilter}
                        onChange={(e) => setFixedFilter(e.target.value)}
                      >
                        <option value="">Tümü</option>
                        <option value="fixed">Sabit</option>
                        <option value="variable">Değişken</option>
                      </select>
                    </label>
                  </div>
                </details>
                {transactions.length ? (
                  [...new Set(transactions.map((e) => e.date))].map((date) => (
                    <section className="day-group" key={date}>
                      <h3>{dateLabel(date)}</h3>
                      {transactions
                        .filter((e) => e.date === date)
                        .map((e) => row(e, true, true))}
                    </section>
                  ))
                ) : (
                  <p className="empty">Bu filtreyle eşleşen işlem yok.</p>
                )}
              </>,
            )}
            {panel(
              "Kategoriler ve aylık bütçeler",
              <>
                {warnings.length ? (
                  warnings.map(({ e, spent }) => (
                    <button
                      className="budget-item"
                      key={e.id}
                      onClick={() => open(e)}
                    >
                      <strong>{e.name}</strong>
                      {e.amount > 0 ? (
                        <>
                          <div className="compact-stats">
                            {stats([
                              ["Harcanan", spent],
                              ["Toplam", e.amount],
                              ["Kalan", e.amount - spent],
                            ])}
                          </div>
                          {visible && (
                            <>
                              <Meter
                                label="Bütçe kullanımı"
                                value={spent}
                                max={e.amount}
                                tone={
                                  spent >= e.amount
                                    ? "negative"
                                    : spent >= e.amount * 0.8
                                      ? "warning"
                                      : ""
                                }
                              />
                              <small>{pct(spent / e.amount)} kullanıldı</small>
                            </>
                          )}
                          {spent > e.amount ? (
                            <p className="negative">
                              Bütçe aşımı{" "}
                              <Amount>{fmt(spent - e.amount)}</Amount>
                            </p>
                          ) : spent >= e.amount ? (
                            <p className="negative">Limit doldu</p>
                          ) : spent >= e.amount * 0.8 ? (
                            <p className="status-pending">%80 eşiği geçildi</p>
                          ) : null}
                        </>
                      ) : (
                        <small> · Limit belirlenmedi</small>
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
            <div className="segment" role="group" aria-label="Varlık türü">
              {Object.entries({
                all: "Genel",
                account: "Bankalar",
                deposit: "Mevduat",
                investment: "Yatırımlar",
                card: "Kredi kartları",
                goal: "Hedefler",
              }).map(([key, title]) => (
                <button
                  key={key}
                  aria-pressed={assetTab === key}
                  onClick={() => setAssetTab(key)}
                >
                  {title}
                </button>
              ))}
            </div>
            {assetTab === "all" &&
              panel(
                "Varlık dağılımı",
                <>
                  <div className="compact-stats">
                    {stats([
                      ["Toplam varlık", summary.cash + summary.assets],
                      ["Toplam borç", summary.debt],
                      ["Net finansal varlık", summary.net],
                    ])}
                  </div>
                  {current.some(
                    (e) => e.kind === "account" && e.balance < 0,
                  ) && (
                    <p className="negative">
                      Negatif hesap bakiyeleri{" "}
                      <Amount>
                        {fmt(
                          sum(
                            current.filter(
                              (e) => e.kind === "account" && e.balance < 0,
                            ),
                            (e) => e.balance,
                          ),
                        )}
                      </Amount>
                    </p>
                  )}
                  {pie([
                    {
                      name: "Bankalar",
                      value: sum(
                        current.filter(
                          (e) =>
                            e.kind === "account" &&
                            e.icon !== "cash" &&
                            e.balance > 0,
                        ),
                        (e) => e.balance,
                      ),
                    },
                    {
                      name: "Nakit para",
                      value: sum(
                        current.filter(
                          (e) =>
                            e.kind === "account" &&
                            e.icon === "cash" &&
                            e.balance > 0,
                        ),
                        (e) => e.balance,
                      ),
                    },
                    { name: "Mevduat", value: deposits },
                    { name: "Yatırım", value: investments },
                  ])}
                </>,
              )}
            {assetTab === "deposit" &&
              panel(
                "Faiz hesaplama",
                <>
                  <label>
                    Özel vade (gün)
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={interestDays}
                      onChange={(e) =>
                        setInterestDays(
                          Math.min(
                            3650,
                            Math.max(1, Math.trunc(Number(e.target.value))),
                          ),
                        )
                      }
                    />
                  </label>
                  <InterestComparison fmt={fmt} visible={visible} />
                </>,
              )}
            {assetTab === "account" && (
              <section className="panel">
                <div className="compact-stats">
                  {stats([["Kullanılabilir nakit", summary.cash]])}
                </div>
                <button className="link" onClick={() => newEntry("transfer")}>
                  <Landmark size={16} /> Transfer
                </button>
              </section>
            )}
            {assetTab === "card" && (
              <section className="panel">
                <div className="compact-stats">
                  {stats([
                    ["Kart borcu", summary.debt],
                    [
                      "Toplam limit",
                      sum(
                        current.filter((e) => e.kind === "card"),
                        (e) => e.limit ?? 0,
                      ),
                    ],
                  ])}
                </div>
                <button className="link" onClick={() => newEntry("payment")}>
                  <CreditCard size={16} /> Kart öde
                </button>
              </section>
            )}
            <div className="grid asset-grid">
              {(["account", "card", "deposit", "investment", "goal"] as const)
                .filter((kind) => kind === assetTab)
                .map((kind) => {
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
                            <article
                              className={"asset asset-" + kind}
                              data-color={e.color}
                              key={e.id}
                            >
                              <button
                                className="entry-row"
                                onClick={() => open(e)}
                              >
                                <span className="row-text">
                                  <strong>
                                    {kind === "account" &&
                                      (e.icon === "cash" ? (
                                        <Wallet size={16} />
                                      ) : (
                                        <Landmark size={16} />
                                      ))}{" "}
                                    {e.name}
                                  </strong>
                                </span>
                                <Amount>{fmt(e.balance)}</Amount>
                                <ChevronRight size={16} />
                              </button>
                              {e.bank && <p>{e.bank}</p>}
                              {kind === "account" && (
                                <>
                                  <button
                                    className="link"
                                    onClick={() =>
                                      newEntry("adjustment", {
                                        target: e.id,
                                        name: e.name + " bakiye düzeltmesi",
                                        amount: e.balance,
                                      })
                                    }
                                  >
                                    Bakiyeyi düzelt
                                  </button>
                                  <details>
                                    <summary>Hesap hareketleri</summary>
                                    {list(
                                      [
                                        ...scheduled(rows, today),
                                        ...rows.filter(
                                          (r) => r.kind === "adjustment",
                                        ),
                                      ]
                                        .filter(
                                          (r) =>
                                            r.source === e.id ||
                                            r.target === e.id,
                                        )
                                        .sort((a, b) =>
                                          b.date.localeCompare(a.date),
                                        ),
                                      "Hesap hareketi yok.",
                                      true,
                                    )}
                                  </details>
                                </>
                              )}
                              {kind === "card" &&
                                visible &&
                                Boolean(e.limit) && (
                                  <>
                                    <Meter
                                      label="Limit kullanımı"
                                      value={e.balance}
                                      max={e.limit!}
                                      tone={
                                        e.balance >= e.limit!
                                          ? "negative"
                                          : e.balance >= e.limit! * 0.8
                                            ? "warning"
                                            : ""
                                      }
                                    />
                                    <p>
                                      Limit kullanımı{" "}
                                      {pct(e.balance / e.limit!)}
                                    </p>
                                  </>
                                )}
                              {kind === "card" && (
                                <details>
                                  <summary>
                                    Kart geçmişi ve kalan taksitler
                                  </summary>
                                  <p>
                                    Kalan taksit:{" "}
                                    {
                                      scheduled(
                                        rows,
                                        month(today, 120),
                                        addDays(today, 1),
                                      ).filter(
                                        (r) =>
                                          r.source === e.id &&
                                          (r.installments ?? 0) > 1,
                                      ).length
                                    }
                                  </p>
                                  {(() => {
                                    const remaining = scheduled(
                                      rows,
                                      month(today, 120),
                                      addDays(today, 1),
                                    ).filter(
                                      (r) =>
                                        r.source === e.id &&
                                        (r.installments ?? 0) > 1,
                                    );
                                    const periods = [
                                      ...new Set(
                                        remaining.map((r) =>
                                          r.date.slice(0, 7),
                                        ),
                                      ),
                                    ].sort();
                                    return periods.map((period) => (
                                      <div
                                        className="obligation-line"
                                        key={period}
                                      >
                                        <span>
                                          {monthLabel(period + "-01")}{" "}
                                          {period.slice(0, 4)}
                                        </span>
                                        <Amount>
                                          {fmt(
                                            sum(
                                              remaining.filter((r) =>
                                                r.date.startsWith(period),
                                              ),
                                              (r) => r.amount,
                                            ),
                                          )}
                                        </Amount>
                                      </div>
                                    ));
                                  })()}
                                  {list(
                                    scheduled(rows, month(today, 120))
                                      .filter(
                                        (r) =>
                                          r.source === e.id ||
                                          r.target === e.id,
                                      )
                                      .sort((a, b) =>
                                        b.date.localeCompare(a.date),
                                      ),
                                    "Kart hareketi yok.",
                                    true,
                                  )}
                                </details>
                              )}
                              {kind === "investment" && (
                                <>
                                  <p>
                                    Değerleme: {dateLabel(e.priceDate ?? today)}
                                    {!e.manual &&
                                      basis(e) > 0 &&
                                      visible &&
                                      " · " +
                                        (
                                          ((e.balance - basis(e)) / basis(e)) *
                                          100
                                        ).toLocaleString("tr-TR", {
                                          maximumFractionDigits: 2,
                                        }) +
                                        "%"}
                                  </p>
                                  <button
                                    className="link"
                                    onClick={() =>
                                      newEntry("valuation", {
                                        target: e.id,
                                        name: e.name + " değerleme",
                                        amount: e.balance,
                                      })
                                    }
                                  >
                                    Geçmiş değer kaydet
                                  </button>{" "}
                                  {!e.manual && (
                                    <button
                                      className="link"
                                      onClick={() =>
                                        newEntry("trade", {
                                          target: e.id,
                                          name: e.name + " yatırım hareketi",
                                          category: "Alım",
                                        })
                                      }
                                    >
                                      Alım / satım kaydet
                                    </button>
                                  )}
                                  <details>
                                    <summary>
                                      Değerlemeler ve hareketler
                                    </summary>
                                    {list(
                                      rows
                                        .filter(
                                          (r) =>
                                            r.target === e.id &&
                                            ["trade", "valuation"].includes(
                                              r.kind,
                                            ),
                                        )
                                        .sort((a, b) =>
                                          b.date.localeCompare(a.date),
                                        ),
                                      "Henüz geçmiş kayıt yok.",
                                    )}
                                  </details>
                                </>
                              )}
                              {kind === "card" && (
                                <>
                                  <div className="compact-stats">
                                    {stats([
                                      ["Toplam limit", e.limit ?? 0],
                                      [
                                        "Kullanılabilir limit",
                                        (e.limit ?? 0) - e.balance,
                                      ],
                                      ["Ekstre borcu", e.statement ?? 0],
                                    ])}
                                  </div>
                                  {e.cutDay && (
                                    <p>
                                      Sonraki kesim{" "}
                                      {dateLabel(
                                        nextDayOfMonth(today, e.cutDay),
                                      )}
                                      {e.statementDate &&
                                        " · Son ekstre " +
                                          dateLabel(e.statementDate)}
                                    </p>
                                  )}
                                  {e.dueDay &&
                                    (() => {
                                      const obligation = cardObligations(
                                        rows,
                                        today,
                                        month(today, 2),
                                      ).find((o) => o.id === e.id);
                                      const next =
                                        obligation?.date ??
                                        nextDayOfMonth(today, e.dueDay);
                                      const delta = daysBetween(today, next);
                                      return (
                                        <p
                                          className={
                                            obligation && delta < 0
                                              ? "status-late"
                                              : undefined
                                          }
                                        >
                                          {obligation
                                            ? "Son ödeme"
                                            : "Sıradaki planlı ödeme tarihi"}{" "}
                                          {dateLabel(next)}
                                          {obligation &&
                                            " · " +
                                              Math.abs(delta).toLocaleString(
                                                "tr-TR",
                                              ) +
                                              (delta < 0
                                                ? " gün gecikmiş"
                                                : " gün kaldı")}
                                        </p>
                                      );
                                    })()}
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
                                    {e.days ? "Vadeli mevduat" : "Günlük faiz"}{" "}
                                    ·{" "}
                                    {e.compound ? "Bileşik faiz" : "Basit faiz"}
                                  </p>
                                  {e.days && (
                                    <p>
                                      {Math.max(
                                        0,
                                        daysBetween(
                                          today,
                                          addDays(e.date, e.days),
                                        ),
                                      ).toLocaleString("tr-TR")}{" "}
                                      gün kaldı
                                    </p>
                                  )}
                                  <details>
                                    <summary>Faiz ve bakiye geçmişi</summary>
                                    {list(
                                      scheduled(rows, today)
                                        .filter(
                                          (r) =>
                                            r.target === e.id ||
                                            r.source === e.id,
                                        )
                                        .sort((a, b) =>
                                          b.date.localeCompare(a.date),
                                        ),
                                      "Hareket yok.",
                                      true,
                                    )}
                                  </details>
                                  <div className="compact-stats">
                                    {stats([
                                      ["Anapara", e.amount],
                                      ["Faiz işlemeyen", e.excluded ?? 0],
                                      [
                                        "Faiz işleyen",
                                        e.amount - (e.excluded ?? 0),
                                      ],
                                      [
                                        "Günlük tahmini net",
                                        interest(e, 1).net,
                                      ],
                                      ...(e.days
                                        ? [
                                            [
                                              "Vade sonu tahmini net",
                                              interest(e, e.days).net,
                                            ] as [string, number],
                                          ]
                                        : []),
                                    ])}
                                  </div>
                                  <p>
                                    Başlangıç {dateLabel(e.date)} · Yıllık faiz{" "}
                                    {pct((e.rate ?? 0) / 100)} · Stopaj{" "}
                                    {pct((e.tax ?? 0) / 100)}
                                  </p>
                                  {Boolean(e.days) && (
                                    <p>
                                      Günlük tutar, vadeli hesabın tahmini
                                      günlük karşılığıdır. Tahsilat vade
                                      koşullarına bağlıdır.
                                    </p>
                                  )}
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
                                          ["7 gün", 7],
                                          ["30 gün", 30],
                                          ["32 gün", 32],
                                          ["90 gün", 90],
                                          [
                                            interestDays + " gün (özel)",
                                            interestDays,
                                          ],
                                          ["Yıllık", 365],
                                          ...(e.days ? [["Vade", e.days]] : []),
                                        ] as [string, number][]
                                      )
                                        .filter(
                                          ([name, days], _, periods) =>
                                            !name.includes("(özel)") ||
                                            !periods.some(
                                              ([other, d]) =>
                                                !other.includes("(özel)") &&
                                                d === days,
                                            ),
                                        )
                                        .map(([name, days]) => {
                                          const i = interest(e, days);
                                          return (
                                            <tr key={name}>
                                              <td>{name}</td>
                                              <td>
                                                <Amount>{fmt(i.gross)}</Amount>
                                              </td>
                                              <td>
                                                <Amount>{fmt(i.net)}</Amount>
                                              </td>
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
                                  {e.manual ? "Toplam portföy" : e.category} ·{" "}
                                  {visible && !e.manual
                                    ? e.units?.toLocaleString("tr-TR") + " adet"
                                    : ""}{" "}
                                  ·{" "}
                                  {e.price === undefined
                                    ? "Maliyet değeri kullanılıyor"
                                    : "Kâr / zarar " +
                                      fmt(e.balance - basis(e))}
                                </p>
                              )}
                              {kind === "goal" &&
                                (() => {
                                  const days = Math.max(
                                      0,
                                      daysBetween(today, e.date),
                                    ),
                                    periods = Math.max(1, Math.ceil(days / 30));
                                  return (
                                    <>
                                      {visible && (
                                        <Meter
                                          label="Hedef ilerlemesi"
                                          value={e.balance}
                                          max={e.amount}
                                        />
                                      )}
                                      <div className="compact-stats">
                                        {stats([
                                          ["Biriken", e.balance],
                                          ["Hedef", e.amount],
                                          ["Kalan", e.amount - e.balance],
                                          [
                                            "Dönem başına gereken",
                                            Math.ceil(
                                              (e.amount - e.balance) / periods,
                                            ),
                                          ],
                                        ])}
                                      </div>
                                      <small>
                                        {pct(e.balance / e.amount)} tamamlandı ·{" "}
                                        {days.toLocaleString("tr-TR")} gün
                                        kaldı. Kalan tutar{" "}
                                        {periods.toLocaleString("tr-TR")} adet
                                        30 günlük döneme bölünür.
                                      </small>
                                    </>
                                  );
                                })()}
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
                              kind === "goal"
                                ? { name: "Acil durum fonu" }
                                : {},
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
            {assetTab === "investment" &&
              panel(
                "Portföy dağılımı",
                <>
                  <div className="compact-stats">
                    {stats([
                      ["Güncel portföy", investments],
                      ["Toplam maliyet", sum(portfolio, basis)],
                      ...(!portfolio.some((e) => e.manual)
                        ? [
                            [
                              "Kâr / zarar",
                              sum(portfolio, (e) => e.balance - basis(e)),
                            ] as [string, number],
                          ]
                        : []),
                    ])}
                  </div>
                  {sum(portfolio, basis) > 0 && (
                    <p
                      className={
                        investments < sum(portfolio, basis)
                          ? "negative"
                          : "positive"
                      }
                    >
                      Performans{" "}
                      {pct(
                        (investments - sum(portfolio, basis)) /
                          sum(portfolio, basis),
                      )}
                    </p>
                  )}
                  {pie(portfolioData)}
                </>,
              )}
          </>
        )}
        {ready && tab === "Raporlar" && (
          <>
            {panel(
              "Rapor dönemi",
              <>
                <div className="segment">
                  {[1, 3, 6, 12].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setFrom(month(start, 1 - n));
                        setTo(today);
                        setPeriod(n);
                      }}
                    >
                      {n} ay
                    </button>
                  ))}
                </div>
                {range}
                <div className="quick">
                  <button onClick={reportExcel}>Rapor Excel</button>
                  <button
                    onClick={() =>
                      run(async () =>
                        download(
                          "Finans360-rapor.pdf",
                          await exportPdf(rows, from, actualEnd),
                        ),
                      )
                    }
                  >
                    Rapor PDF
                  </button>
                </div>
              </>,
            )}
            <div className="metrics">
              {stats([
                ["Gelir", selected.income],
                ["Gider", selected.expense],
                ["Gelir eksi gider", selected.income - selected.expense],
                [
                  "Günlük ortalama gider",
                  Math.round(
                    selected.expense /
                      Math.max(1, daysBetween(from, actualEnd) + 1),
                  ),
                ],
                ["Gerçekleşen mevduat faizi", realizedInterest],
              ])}
              <div className="stat">
                <span>Tasarruf oranı</span>
                <strong>
                  {selected.income ? pct(selected.rate / 100) : "Veri yok"}
                </strong>
              </div>
              <div className="stat">
                <span>Gelirin harcanan payı</span>
                <strong>
                  {selected.income
                    ? pct(selected.expense / selected.income)
                    : "Veri yok"}
                </strong>
              </div>
              <div className="stat">
                <span>Kira / maaş</span>
                <strong>
                  {salaryIncome ? pct(rent / salaryIncome) : "Veri yok"}
                </strong>
              </div>
              <div className="stat">
                <span>Önceki aya göre gider farkı</span>
                <strong>
                  {priorSpend
                    ? pct((comparisonSpend - priorSpend) / priorSpend)
                    : "Veri yok"}
                </strong>
              </div>
            </div>
            <div className="grid">
              {panel(
                "Gelirin kullanımı",
                selected.expense > selected.income ? (
                  <p className="negative">
                    Gider geliri {fmt(selected.expense - selected.income)} aştı.
                  </p>
                ) : (
                  pie([
                    {
                      name: "Harcanan gelir",
                      color: "#f17f8a",
                      value: Math.min(selected.income, selected.expense),
                    },
                    {
                      name: "Kalan gelir",
                      color: "#55d39d",
                      value: Math.max(0, selected.income - selected.expense),
                    },
                  ])
                ),
              )}
              {panel(
                "Kategori dağılımı",
                visible && selected.expense > 0 ? (
                  byCategory
                    .filter((e) => e.value > 0)
                    .map((e) => (
                      <div key={e.name} className="category-chart">
                        <div className="obligation-line">
                          <span>
                            {e.name} · {pct(e.value / selected.expense)}
                          </span>
                          <Amount>{fmt(e.value)}</Amount>
                        </div>
                        <Meter
                          label={e.name}
                          value={e.value}
                          max={selected.expense}
                        />
                      </div>
                    ))
                ) : (
                  <p className="empty">
                    {visible ? "Veri yok." : "Tutarlar gizli."}
                  </p>
                ),
              )}
              {panel(
                "Sabit ve değişken gider",
                pie([
                  { name: "Sabit", value: reportFixed },
                  { name: "Değişken", value: selected.expense - reportFixed },
                ]),
              )}
            </div>
            {panel(
              "Aylık karşılaştırma",
              chart(),
              <select
                aria-label="Karşılaştırma dönemi"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
              >
                <option value={1}>1 ay</option>
                <option value={3}>3 ay</option>
                <option value={6}>6 ay</option>
                <option value={12}>12 ay</option>
              </select>,
            )}
            {panel("Birikim büyümesi", chart("saving"))}
            {panel("Yatırım geçmişi", chart("investment"))}
            {panel("Net varlık geçmişi", chart("net"))}
            {panel("Kredi kartı borcu geçmişi", chart("debt"))}
            {panel(
              "12 aylık net birikim tahmini",
              <>
                <div className="compact-stats">
                  {stats([["Başlangıç net varlığı", summary.net]])}
                </div>
                {chart("projection")}
                <details>
                  <summary>Planlanan gelir ve giderler</summary>
                  <p>
                    Kayıtlı işlemler ve tekrarlar kullanılır. Gelecekteki faiz
                    ve fiyat değişimleri dahil değildir. Net varlık tahmini
                    banka, kart ve yatırım kayıtlarını birlikte kullanır.
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Dönem</th>
                        <th>Gelir</th>
                        <th>Gider</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projection.map((e) => (
                        <tr key={e.date}>
                          <td>
                            {e.name} {e.date.slice(0, 4)}
                          </td>
                          <td>
                            <Amount>{fmt(e.plannedIncome)}</Amount>
                          </td>
                          <td>
                            <Amount>{fmt(e.plannedExpense)}</Amount>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </>,
            )}
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
        {ready && tab === "Takvim" && (
          <>
            {panel(
              "Ödeme takvimi",
              <>
                <MonthPicker value={calendarStart} onChange={changeMonth} />
                <div className="segment">
                  <button
                    aria-pressed={!calendarList}
                    onClick={() => setCalendarList(false)}
                  >
                    Takvim
                  </button>
                  <button
                    aria-pressed={calendarList}
                    onClick={() => setCalendarList(true)}
                  >
                    Liste
                  </button>
                </div>
                {!calendarList && (
                  <div className="calendar">
                    {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(
                      (d) => (
                        <span key={d}>{d}</span>
                      ),
                    )}
                    {Array.from({ length: firstWeekday }, (_, i) => (
                      <span key={"gap" + i} />
                    ))}
                    {Array.from(
                      { length: Number(calendarEnd.slice(-2)) },
                      (_, i) => {
                        const date = dateInMonth(calendarStart, i + 1);
                        const items = events.filter((e) => e.date === date);
                        return (
                          <button
                            type="button"
                            key={date}
                            aria-label={
                              dateLabel(date) + ", " + items.length + " kayıt"
                            }
                            aria-current={date === today ? "date" : undefined}
                            aria-pressed={date === calendarDate}
                            onClick={() => setCalendarDate(date)}
                          >
                            {i + 1}
                            <span className="calendar-dots">
                              {[
                                ...new Set(items.map((e) => calendarStatus(e))),
                              ].map((status) => (
                                <i
                                  key={status}
                                  className={"status-" + status}
                                />
                              ))}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
                <div className="calendar-key">
                  {Object.entries({
                    ...stateLabels,
                    income: "Gelir",
                    card: "Kredi kartı",
                    event: "Diğer olay",
                  }).map(([key, label]) => (
                    <span key={key}>
                      <i className={"status-" + key} />
                      {label}
                    </span>
                  ))}
                </div>
                <div className="range">
                  <label>
                    Ödeme durumu
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                    >
                      <option value="">Tümü</option>
                      {Object.entries({
                        ...stateLabels,
                        income: "Gelir",
                        card: "Kredi kartı",
                      }).map(([key, value]) => (
                        <option value={key} key={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {!calendarList && <p>{dateLabel(calendarDate)}</p>}
                {list(
                  events.filter(
                    (e) =>
                      (calendarList || e.date === calendarDate) &&
                      (!paymentFilter || calendarStatus(e) === paymentFilter),
                  ),
                  "Bu görünümde kayıt yok.",
                  true,
                )}
              </>,
              <span className="asset-actions">
                <button
                  className="link"
                  onClick={() =>
                    newEntry("income", { date: calendarDate, paid: false })
                  }
                >
                  Gelir ekle
                </button>
                <button
                  className="link"
                  onClick={() =>
                    newEntry("expense", { date: calendarDate, paid: false })
                  }
                >
                  Gider ekle
                </button>
              </span>,
            )}
            {panel(
              "Bekleyen ödemeler",
              <>
                {paymentDetails(
                  "7 gün",
                  windowItems(7),
                  dateLabel(today) +
                    " – " +
                    dateLabel(addDays(today, 6)) +
                    " (iki gün dahil).",
                )}
                {paymentDetails(
                  "30 gün",
                  windowItems(30),
                  dateLabel(today) +
                    " – " +
                    dateLabel(addDays(today, 29)) +
                    " (iki gün dahil).",
                )}
                {paymentDetails(
                  "Gecikmiş",
                  lateItems,
                  "Bugünden önce vadesi gelen ödenmemiş faturalar ve ekstreler.",
                )}
              </>,
            )}
          </>
        )}
        {ready && tab === "Ayarlar" && (
          <>
            {panel(
              "Görünüm",
              <div className="settings">
                <button onClick={() => setDark(!dark)}>
                  {dark ? "Aydınlık temaya geç" : "Karanlık temaya geç"}
                </button>
              </div>,
            )}
            {panel(
              "Veri modu",
              <div className="settings">
                <p>
                  {mode === "personal" ? "Kişisel kayıtlar" : "Örnek veriler"}{" "}
                  etkin.
                </p>
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
              </div>,
            )}
            {panel(
              "Bütçe ayarları",
              <label>
                Maaş günü
                <select
                  value={salaryDay}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSalaryDay(value);
                    localStorage.setItem("finans360-salary", String(value));
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>,
            )}
            {panel(
              "Gizlilik ve uygulama kilidi",
              <>
                <p>
                  GitHub Pages adresi ve kaynak kodu herkese açık olabilir.
                  Kişisel finans kayıtları bu cihazın IndexedDB alanında kalır.
                  Uygulama finans verisi için sunucu, reklam veya izleme hizmeti
                  kullanmaz.
                </p>
                <PinSettings
                  pin={pin}
                  save={(value) => {
                    if (value) localStorage.setItem("finans360-lock", value);
                    else localStorage.removeItem("finans360-lock");
                    setPin(value);
                  }}
                  minutes={minutes}
                  setMinutes={(value) => {
                    setMinutes(value);
                    localStorage.setItem(
                      "finans360-lock-minutes",
                      String(value),
                    );
                  }}
                />
              </>,
            )}
            {panel(
              "Uygulama bilgisi",
              <div className="settings">
                <p>Finans360 2.1.0 · Türkçe · Türk lirası</p>
                <button onClick={checkVersion}>Yeni sürümü kontrol et</button>
                {versionStatus && <p role="status">{versionStatus}</p>}
              </div>,
            )}
            {panel(
              "Dışa aktarma",
              <div className="settings">
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
                          "Tekrar",
                          "Banka",
                          "Değerleme tarihi",
                          "Açılış bakiyesi tarihi",
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
                            e.recurring
                              ? {
                                  weekly: "Haftalık",
                                  monthly: "Aylık",
                                  quarterly: "Üç aylık",
                                  yearly: "Yıllık",
                                }[e.frequency ?? "monthly"]
                              : undefined,
                            e.bank,
                            e.priceDate,
                            e.balanceFrom,
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
              </div>,
            )}
            {panel(
              "Yedekleme",
              <div className="settings">
                <button onClick={() => run(() => createBackup())}>
                  Normal JSON yedeği indir
                </button>
                <details>
                  <summary>Şifreli JSON yedeği</summary>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      const values = new FormData(form);
                      const password = String(values.get("password") ?? "");
                      run(async () => {
                        if (password !== values.get("repeat"))
                          throw new Error(
                            "Yedek parolası ve doğrulaması eşleşmiyor.",
                          );
                        await createBackup(password);
                        form.reset();
                      });
                    }}
                  >
                    <label>
                      Yedek parolası
                      <input
                        type="password"
                        name="password"
                        minLength={10}
                        maxLength={256}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                    <label>
                      Yedek parolası doğrulaması
                      <input
                        type="password"
                        name="repeat"
                        minLength={10}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                    <button type="submit">Şifreli JSON yedeği indir</button>
                  </form>
                </details>
                <p>
                  Yedekler hassas bilgiler içerir. Şifreli yedeğin parolası
                  unutulursa yedek açılamaz.
                </p>
                {backupStatus && <p role="status">{backupStatus}</p>}
                <label>
                  Geri yükleme parolası (şifreli yedek için)
                  <input
                    type="password"
                    id="restore-password"
                    autoComplete="off"
                  />
                </label>
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
                          if (file.size > 20 * 1024 * 1024)
                            throw new Error(
                              "Yedek dosyası 20 MB sınırını aşıyor.",
                            );
                          let raw = await file.text();
                          if (JSON.parse(raw)?.encrypted === 1) {
                            const input = document.getElementById(
                              "restore-password",
                            ) as HTMLInputElement | null;
                            if (!input?.value)
                              throw new Error(
                                "Şifreli yedeğin parolasını girin.",
                              );
                            raw = await reveal(input.value, raw);
                            input.value = "";
                          }
                          const data = backup(raw);
                          const fileMode = JSON.parse(raw).mode;
                          if (fileMode && fileMode !== mode)
                            throw new Error(
                              "Yedeği oluşturulduğu veri modunda geri yükleyin.",
                            );
                          if (
                            confirm(
                              (mode === "demo"
                                ? "Örnek veri"
                                : "Kişisel veri") +
                                " modundaki mevcut " +
                                rows.length +
                                " kayıt, yedekteki " +
                                data.length +
                                " kayıtla değiştirilecek. Onaylıyor musunuz?",
                            )
                          ) {
                            await mutate(() => data);
                            setBackupStatus(
                              "Yedek geri yüklendi · " +
                                new Date().toLocaleString("tr-TR"),
                            );
                          }
                        });
                    }}
                  />
                </label>
              </div>,
            )}
            {panel(
              "Tehlikeli işlemler",
              <div className="settings">
                <p>Silmeden önce etkin veri modunun yedeğini alın.</p>
                <button
                  className="danger"
                  onClick={() => {
                    const name = mode === "personal" ? "Kişisel" : "Örnek";
                    if (
                      confirm(
                        name +
                          " modundaki kayıtlar silinecek. Yedek aldınız mı?",
                      ) &&
                      confirm(
                        "Son onay: " +
                          name.toLocaleLowerCase("tr") +
                          " modundaki " +
                          rows.length +
                          " kaydı kalıcı olarak silmek istiyor musunuz?",
                      )
                    )
                      run(() => mutate(() => []));
                  }}
                >
                  Bu moddaki kayıtları sil
                </button>
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
          masked={!visible}
          occurrence={Boolean(occurrence)}
          save={(e, scope) =>
            mutate((data) => {
              if (occurrence) {
                const original = data.find((row) => row.id === occurrence.id);
                if (!original) throw new Error("Tekrarlanan kayıt bulunamadı.");
                return reviseOccurrence(
                  data,
                  original,
                  occurrence.date,
                  { ...e, id: crypto.randomUUID(), createdAt: Date.now() },
                  scope,
                );
              }
              const previous = data.find((row) => row.id === e.id);
              const history: Data =
                previous?.kind === "investment" &&
                previous.priceDate &&
                e.priceDate &&
                previous.priceDate < e.priceDate
                  ? [
                      {
                        id: crypto.randomUUID(),
                        kind: "valuation",
                        name: previous.name + " değerleme",
                        target: e.id,
                        date: previous.priceDate,
                        amount: market(previous),
                        createdAt: Date.now(),
                      },
                    ]
                  : [];
              return previous
                ? [
                    ...data.map((row) =>
                      row.id === e.id
                        ? e
                        : previous.kind === "budget" &&
                            row.category === previous.name
                          ? { ...row, category: e.name }
                          : row,
                    ),
                    ...history,
                  ]
                : [...data, e];
            })
          }
          remove={(e) =>
            mutate((data) => {
              if (
                data.some((row) => row.source === e.id || row.target === e.id)
              )
                throw new Error(
                  "Önce bu hesaba bağlı işlemleri kaldırın veya başka hesaba taşıyın.",
                );
              if (occurrence)
                return data.map((row) =>
                  row.id === e.id
                    ? {
                        ...row,
                        exceptions: [
                          ...new Set([
                            ...(row.exceptions ?? []),
                            occurrence.date,
                          ]),
                        ],
                      }
                    : row,
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
