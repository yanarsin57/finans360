import { ChevronLeft, ChevronRight } from "lucide-react";
import { month } from "./model.ts";

export function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const year = Number(value.slice(0, 4));
  return (
    <div className="month-picker">
      <button
        className="icon"
        type="button"
        aria-label="Önceki ay"
        disabled={value === "2000-01-01"}
        onClick={() => onChange(month(value, -1))}
      >
        <ChevronLeft size={18} />
      </button>
      <label className="sr-only" htmlFor="month-number">
        Ay
      </label>
      <select
        id="month-number"
        value={value.slice(5, 7)}
        onChange={(e) => onChange(year + "-" + e.target.value + "-01")}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={String(i + 1).padStart(2, "0")}>
            {new Date(2024, i, 1).toLocaleDateString("tr-TR", {
              month: "long",
            })}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="year-number">
        Yıl
      </label>
      <select
        id="year-number"
        value={year}
        onChange={(e) => onChange(e.target.value + value.slice(4))}
      >
        {Array.from({ length: 100 }, (_, i) => (
          <option key={i}>{2000 + i}</option>
        ))}
      </select>
      <button
        className="icon"
        type="button"
        aria-label="Sonraki ay"
        disabled={value === "2099-12-01"}
        onClick={() => onChange(month(value, 1))}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
