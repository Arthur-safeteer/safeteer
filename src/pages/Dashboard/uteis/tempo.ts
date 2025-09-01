/**
 * util/tempo.ts
 * -----------------------------------------------------------
 * Este módulo centraliza TODA a lógica relacionada a tempo em UTC:
 *  - `parseEmUtc`: interpreta datas/horas (strings ou números) garantindo UTC.
 *    * Strings SEM fuso horário (ex.: "2025-08-26 13:07:41" ou "26/08/2025 13:07")
 *      são interpretadas como UTC, NÃO como horário local do navegador.
 *    * Strings COM fuso (ex.: "...Z" ou "+03:00") respeitam o fuso informado.
 *  - `formatarDataUTC`: formata um timestamp em string legível (pt-BR) em UTC.
 *  - `construirTimelineAPartirDeAlertas`: agrega alertas em "baldes" (buckets)
 *      para montar o gráfico de barras por hora (janelas curtas) ou por dia
 *      (janelas longas), sempre em UTC para evitar discrepâncias de fuso/DST.
 */

import type { Alerta, Intervalo, PontoTimeline } from "../tipos";

/** Fuso fixo para todo o app (exibição e cálculos): UTC */
export const TIME_ZONE = "UTC";

/**
 * Converte uma entrada (string/number) para milissegundos desde epoch, em UTC.
 * Regras:
 *  - number:
 *      * < 1e12: assume segundos e converte para ms
 *      * >= 1e12: assume ms
 *  - string:
 *      * ISO sem timezone (yyyy-mm-dd[ hh:mm[:ss]]): trata como UTC manualmente
 *      * BR (dd/mm/yyyy[ hh:mm[:ss]]): trata como UTC manualmente
 *      * Outras strings: delega ao Date.parse (respeita Z ou offsets se houver)
 */

export function parseEmUtc(v?: string | number): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const s = String(v).trim();

  // ISO "nu" sem Z/offset → interpretar como UTC
  const mIsoSemTZ = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  const temTZ = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
  if (mIsoSemTZ && !temTZ) {
    const [, yyyy, mm, dd, hh = "00", mi = "00", ss = "00"] = mIsoSemTZ;
    return Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
  }

  // Formato brasileiro dd/mm/yyyy (opcional hora) → interpretar como UTC
  const mBr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (mBr) {
    const [, dd, mm, yyyy, hh = "00", mi = "00", ss = "00"] = mBr;
    return Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
  }

  // Outros formatos: deixar o motor do JS decidir (respeita Z/+hh:mm/-hh:mm)
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

/**
 * Formata um timestamp (string/number) em string "pt-BR" fixa em UTC.
 * Ex.: 26/08/2025 13:07:41
 */
export function formatarDataUTC(v?: string | number): string {
  const ms = parseEmUtc(v);
  if (ms == null) return "—";
  return new Date(ms).toLocaleString("pt-BR", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Rótulo de hora para o eixo X (sempre UTC): "HH:00" */
const rotuloHora = (msUtc: number) =>
  new Date(msUtc).toLocaleString("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }) + ":00";

/**
 * Agrega os alertas por hora (janelas curtas) ou por dia (janelas longas),
 * retornando os pontos da timeline para o gráfico.
 *
 * - Se `range` estiver definido (start/end), a timeline é construída
 *   *exatamente* nesse intervalo (UTC), com buckets de 1h ou 1d conforme
 *   a duração.
 * - Caso contrário, usa janelas relativas "24h" | "7d" | "30d".
 *
 * @param alerts  lista de alertas normalizados (createdAt em qualquer formato)
 * @param period  "24h" | "7d" | "30d" (usado apenas quando não há range)
 * @param range   intervalo customizado opcional { start?: string; end?: string }
 */
export function construirTimelineAPartirDeAlertas(
  alerts: Alerta[],
  period: "24h" | "7d" | "30d",
  range?: Intervalo
): PontoTimeline[] {
  // Constantes em ms (hora/dia) — facilita leitura e evita mágicas
  const HOUR = 3600_000, DAY = 24 * HOUR;

  // -----------------------------
  // MODO 1: intervalo custom (range)
  // -----------------------------
  if (range?.start || range?.end) {
    // Usa o intervalo informado; se faltar uma ponta, deriva dos dados
    const startUtc = range.start ? parseEmUtc(range.start)! :
      Math.min(...alerts.map(a => parseEmUtc(a.createdAt) ?? Date.now()));
    const endUtc = range.end ? parseEmUtc(range.end)! :
      Math.max(...alerts.map(a => parseEmUtc(a.createdAt) ?? Date.now()));

    const sUtc = startUtc;
    // Garante que exista pelo menos 1h de janela para evitar divisão por 0
    const eUtc = Math.max(endUtc, startUtc + HOUR);

    // Escolha do bucket: se a janela for curta (≤ 36h) agrega por hora; senão, por dia
    const bucketSize = eUtc - sUtc <= 36 * HOUR ? HOUR : DAY;
    const n = Math.max(1, Math.ceil((eUtc - sUtc) / bucketSize));

    // Cria os baldes (labels do eixo X variam conforme bucket)
    const bins: PontoTimeline[] = Array.from({ length: n }, (_, i) => {
      const t = sUtc + i * bucketSize;
      const hour = bucketSize === HOUR
        ? rotuloHora(t)
        : new Date(t).toLocaleDateString("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" });
      return { hour, baixa: 0, media: 0, alta: 0, critica: 0 };
    });

    // Popula os baldes contando por severidade
    for (const a of alerts) {
      const t = parseEmUtc(a.createdAt);
      if (t == null || t < sUtc || t >= eUtc) continue;
      const i = Math.min(bins.length - 1, Math.floor((t - sUtc) / bucketSize));
      if (a.severity === "baixa") bins[i].baixa++;
      else if (a.severity === "média") bins[i].media++;
      else if (a.severity === "alta") bins[i].alta++;
      else bins[i].critica++;
    }
    return bins;
  }

  // -----------------------------
  // MODO 2: janelas relativas (24h/7d/30d)
  // -----------------------------
  // Tamanho da janela e do balde (1h para 24h, 1d para 7d/30d)
  const size = period === "24h" ? 24 * HOUR : period === "7d" ? 7 * DAY : 30 * DAY;
  const bucketSize = period === "24h" ? HOUR : DAY;

  // Alinha o "agora" ao próximo limite de bucket para rótulos estáveis
  const endUtc = Math.floor(Date.now() / bucketSize) * bucketSize + bucketSize;
  const startUtc = endUtc - size;

  // Inicializa baldes com rótulos adequados ao período
  const bins: PontoTimeline[] = Array.from({ length: size / bucketSize }, (_, i) => {
    const t = startUtc + i * bucketSize;
    const hour =
      period === "24h"
        ? rotuloHora(t)
        : period === "7d"
          ? new Date(t).toLocaleDateString("pt-BR", { weekday: "short", timeZone: TIME_ZONE })
          : new Date(t).toLocaleDateString("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" });
    return { hour, baixa: 0, media: 0, alta: 0, critica: 0 };
  });

  // Conta eventos por severidade dentro da janela relativa
  for (const a of alerts) {
    const t = parseEmUtc(a.createdAt);
    if (t == null || t < startUtc || t >= endUtc) continue;
    const i = Math.floor((t - startUtc) / bucketSize);
    if (a.severity === "baixa") bins[i].baixa++;
    else if (a.severity === "média") bins[i].media++;
    else if (a.severity === "alta") bins[i].alta++;
    else bins[i].critica++;
  }
  return bins;
}
