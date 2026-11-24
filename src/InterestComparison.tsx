import { useState, type FormEvent } from "react";
import { interest, parseMoney, validateEntry, type Entry } from "./model.ts";
const columns = [
  ["bank", "Banka"],
  ["amount", "Anapara (₺)"],
  ["excluded", "Faiz işlemeyen (₺)"],
  ["rate", "Yıllık faiz (%)"],
  ["tax", "Stopaj (%)"],
  ["days", "Vade (gün)"],
] as const;
export function InterestComparison({
  fmt,
  visible,
}: {
  fmt: (cents: number) => string;
  visible: boolean;
}) {
  const [offers, setOffers] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<
    "net" | "amount" | "excluded" | "tax" | "days"
  >("net");
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const val = (key: string) => String(data.get(key) ?? "").trim();
    try {
      const offer: Entry = {
        id: crypto.randomUUID(),
        kind: "deposit",
        name: val("bank"),
        date: "2026-01-01",
        amount: parseMoney(val("amount")),
        excluded: parseMoney(val("excluded") || "0"),
        rate: Number(val("rate").replace(",", ".")),
        tax: Number(val("tax").replace(",", ".")),
        days: Number(val("days")),
        compound: data.has("compound"),
      };
      validateEntry(offer);
      if (!offer.days) throw new Error("Vade en az bir gün olmalı.");
      interest(offer, offer.days);
      setOffers([...offers, offer]);
      setError("");
      form.reset();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  const value = (e: Entry) =>
    order === "net" ? interest(e, e.days!).net : (e[order] ?? 0);
  return (
    <details>
      <summary>Faiz tekliflerini karşılaştır</summary>
      <form onSubmit={add}>
        <div className="fields">
          {columns.map(([key, title]) => (
            <label key={key}>
              {title}
              <input
                name={key}
                required={key !== "excluded"}
                inputMode={key === "bank" ? "text" : "decimal"}
              />
            </label>
          ))}
          <label className="check">
            <input type="checkbox" name="compound" /> Günlük bileşik faiz
          </label>
        </div>
        <button className="primary" type="submit">
          Teklif ekle
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {!!offers.length && (
        <>
          <label>
            Sıralama
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
            >
              <option value="net">Net kazanç</option>
              <option value="amount">Anapara</option>
              <option value="excluded">Faiz işlemeyen</option>
              <option value="tax">Stopaj</option>
              <option value="days">Vade</option>
            </select>
          </label>
          {[...offers]
            .sort((a, b) => value(b) - value(a))
            .map((e) => (
              <div className="entry-row" key={e.id}>
                <div className="row-text">
                  <strong>{e.name}</strong>
                  <small>
                    {e.days} gün ·{" "}
                    {visible
                      ? "Stopaj %" + e.tax?.toLocaleString("tr-TR")
                      : "Stopaj gizli"}
                  </small>
                  <small>
                    Anapara {fmt(e.amount)} · Faiz işlemeyen{" "}
                    {fmt(e.excluded ?? 0)}
                  </small>
                  <small>
                    Brüt {fmt(interest(e, e.days!).gross)} · Net{" "}
                    {fmt(interest(e, e.days!).net)}
                  </small>
                </div>
                <button
                  onClick={() =>
                    setOffers(offers.filter((row) => row.id !== e.id))
                  }
                >
                  Kaldır
                </button>
              </div>
            ))}
        </>
      )}
    </details>
  );
}
