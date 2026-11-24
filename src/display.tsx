import { useLayoutEffect, useRef, type ReactNode } from "react";

export function Amount({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const wrapper = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const box = wrapper.current;
    const label = text.current;
    if (!box || !label) return;
    const fit = () => {
      label.style.fontSize = "";
      const available = box.clientWidth;
      const needed = label.getBoundingClientRect().width;
      if (available > 0 && needed > available)
        label.style.fontSize = available / needed + "em";
    };
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    fit();
    return () => observer.disconnect();
  }, [children]);
  return (
    <span className={"amount " + className} ref={wrapper}>
      <span ref={text}>{children}</span>
    </span>
  );
}

export function Meter({
  value,
  max,
  label,
  tone = "",
}: {
  value: number;
  max: number;
  label: string;
  tone?: string;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(100 * ratio)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={"meter " + tone}
    >
      <span style={{ inlineSize: ratio * 100 + "%" }} />
    </div>
  );
}

export function axisAmount(cents: number) {
  const lira = cents / 100;
  const units =
    Math.abs(lira) >= 1e6
      ? [1e6, " milyon"]
      : Math.abs(lira) >= 1e3
        ? [1e3, " bin"]
        : [1, ""];
  return (
    (lira / Number(units[0])).toLocaleString("tr-TR", {
      maximumFractionDigits: 1,
    }) +
    units[1] +
    " ₺"
  );
}
