// Formatação pt-BR (moeda, números, datas).

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brl0Fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const brl = (v) => brlFmt.format(v);
export const brl0 = (v) => brl0Fmt.format(v);
// 1.250 -> "R$ 1,3 mil" · 0 -> "R$ 0"
export const brlCompact = (v) => (Math.abs(v) < 1000 ? brl0Fmt.format(v) : `R$ ${compactFmt.format(v)}`);
export const int = (v) => intFmt.format(v);

export function num(v, maxDigits = 1) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: maxDigits }).format(v);
}

// recebe o valor já em pontos percentuais (42.8 -> "42,8%")
export function pct(v, digits = 1) {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)}%`;
}

export function signed(v, fmt = (x) => num(x, 1)) {
  if (v === 0) return fmt(0);
  return `${v > 0 ? "+" : "−"}${fmt(Math.abs(v))}`;
}

export function qtd(valor, un) {
  return `${num(valor, valor % 1 ? 2 : 0)} ${un}`;
}

const monthDayFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const monthDayYearFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });
const longFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const tipFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

// "12 out" (sem o ponto que o Intl coloca depois do mês abreviado); com ano: "12 out 2026"
export const dShort = (d, comAno = false) =>
  (comAno ? monthDayYearFmt : monthDayFmt).format(d).replace(/\./g, "").replace(/ de /g, " ");
export const dLong = (d) => longFmt.format(d);
export const dTip = (d) => tipFmt.format(d);
export const dMonth = (d) => monthFmt.format(d).replace(/\./g, "").replace(" de ", "/");
export const hhmm = (d) => timeFmt.format(d);

export function saudacao(date = new Date()) {
  const hora = date.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function timeAgo(date, now = new Date()) {
  const min = Math.round((now - date) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24 && now.getDate() === date.getDate()) return `há ${horas} h`;

  const dias = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (dias === 1) return `ontem, ${hhmm(date)}`;
  if (dias < 7) return `há ${dias} dias`;
  return dShort(date);
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function initials(nome) {
  const parts = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
