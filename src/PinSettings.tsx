import { useRef, useState, type FormEvent } from "react";
import { protect, reveal } from "./device.ts";

export async function verifyPin(input: string, pin: string) {
  try {
    if ((await reveal(input, pin)) !== "Finans360") throw new Error();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    throw new Error("PIN yanlış. Yeniden deneyin.");
  }
}

export function PinSettings({
  pin,
  save,
  minutes,
  setMinutes,
}: {
  pin: string;
  save: (pin: string) => void;
  minutes: number;
  setMinutes: (minutes: number) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guard.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const disabling =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "disable";
    const current = String(values.get("current") ?? "");
    const next = String(values.get("next") ?? "");
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      if (pin) await verifyPin(current, pin);
      if (disabling) {
        form.reset();
        save("");
      } else {
        if (!/^\d{6,12}$/.test(next))
          throw new Error("Yeni PIN 6–12 rakam olmalı.");
        if (next !== values.get("repeat"))
          throw new Error("Yeni PIN ve doğrulaması eşleşmiyor.");
        const value = await protect(next, "Finans360");
        form.reset();
        save(value);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="settings">
      <p>
        Kilit {pin ? "açık" : "kapalı"}. PIN ekranı cihazdaki finansal kayıtları
        şifrelemez.
      </p>
      <label>
        Otomatik kilitlenme
        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        >
          {[1, 3, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n} dakika
            </option>
          ))}
        </select>
      </label>
      <p>Uygulama arka plana geçtiğinde de kilitlenir.</p>
      <form onSubmit={submit}>
        {pin && (
          <label>
            Mevcut PIN
            <input
              type="password"
              name="current"
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </label>
        )}
        <label>
          Yeni PIN
          <input
            type="password"
            name="next"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="[0-9]{6,12}"
            required
            placeholder="6–12 rakam"
          />
        </label>
        <label>
          Yeni PIN doğrulaması
          <input
            type="password"
            name="repeat"
            inputMode="numeric"
            autoComplete="new-password"
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          {pin ? "PIN değiştir" : "Kilidi aç"}
        </button>
        {pin && (
          <button type="submit" formNoValidate value="disable" disabled={busy}>
            Kilidi kapat
          </button>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
