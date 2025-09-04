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
import { usePrefs } from "../../../contexts/PrefsContext";

/** Fuso fixo para todo o app (exibição e cálculos): UTC */
export const TIME_ZONE = "UTC";

/**
 * Converte string ISO para timestamp UTC
 */
export function parseEmUtc(iso: string): number | null {
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
}

/**
 * Formata data UTC para exibição
 */
export function formatarDataUTC(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Formata data usando o fuso horário do usuário
 */
export function formatarDataLocal(iso: string): string {
  try {
    // Obtém o fuso horário do contexto de preferências
    const timezone = localStorage.getItem("prefs.v1") 
      ? JSON.parse(localStorage.getItem("prefs.v1")!).timezone 
      : "America/Sao_Paulo";
    
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: timezone,
    });
  } catch {
    return formatarDataUTC(iso);
  }
}

/**
 * Formata data para exibição compacta usando fuso local
 */
export function formatarDataCompacta(iso: string): string {
  try {
    const timezone = localStorage.getItem("prefs.v1") 
      ? JSON.parse(localStorage.getItem("prefs.v1")!).timezone 
      : "America/Sao_Paulo";
    
    const d = new Date(iso);
    const agora = new Date();
    const diffMs = agora.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Se foi há menos de 1 minuto
    if (diffMin < 1) return "Agora mesmo";
    
    // Se foi há menos de 1 hora
    if (diffHrs < 1) return `há ${diffMin} min`;
    
    // Se foi há menos de 24 horas
    if (diffDias < 1) return `há ${diffHrs}h`;
    
    // Se foi há menos de 7 dias
    if (diffDias < 7) return `há ${diffDias} dias`;
    
    // Caso contrário, mostra a data completa
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: timezone,
    });
  } catch {
    return formatarDataUTC(iso);
  }
}

/**
 * Hook para usar formatação de data com fuso horário
 */
export function useFormataData() {
  const { timezone } = usePrefs();
  
  const formatarLocal = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: timezone,
      });
    } catch {
      return formatarDataUTC(iso);
    }
  };

  const formatarCompacta = (iso: string) => {
    try {
      const d = new Date(iso);
      const agora = new Date();
      const diffMs = agora.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 1) return "Agora mesmo";
      if (diffHrs < 1) return `há ${diffMin} min`;
      if (diffDias < 1) return `há ${diffHrs}h`;
      if (diffDias < 7) return `há ${diffDias} dias`;
      
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: timezone,
      });
    } catch {
      return formatarDataUTC(iso);
    }
  };

  return { formatarLocal, formatarCompacta };
}

/** Rótulo de hora para o eixo X: "HH:00" */
const rotuloHora = (msUtc: number, timezone: string = TIME_ZONE) =>
  new Date(msUtc).toLocaleString("pt-BR", { timeZone: timezone, hour: "2-digit", hour12: false }) + ":00";

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
 * @param timezone fuso horário para exibição dos rótulos
 */
export function construirTimelineAPartirDeAlertas(
  alerts: Alerta[],
  period: "24h" | "7d" | "30d",
  range?: Intervalo,
  timezone: string = TIME_ZONE
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
        ? rotuloHora(t, timezone)
        : new Date(t).toLocaleDateString("pt-BR", { timeZone: timezone, day: "2-digit", month: "2-digit" });
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
        ? rotuloHora(t, timezone)
        : period === "7d"
          ? new Date(t).toLocaleDateString("pt-BR", { weekday: "short", timeZone: timezone })
          : new Date(t).toLocaleDateString("pt-BR", { timeZone: timezone, day: "2-digit", month: "2-digit" });
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
