/**
 * LinhaDoTempoAlertas.tsx
 * ------------------------------------------------------------------
 * Componente de gráfico (Recharts) que exibe a linha do tempo de alertas.
 * - Pode trabalhar em dois modos:
 *   (1) relativo: 24h / 7d / 30d
 *   (2) customizado: quando recebe um `range` (início/fim em UTC)
 * - A legenda é clicável e funciona como filtro de severidade.
 * - O cálculo/agrupamento dos dados fica em `construirTimelineAPartirDeAlertas`
 *   (módulo ../uteis/tempo), para manter este componente focado só em UI.
 * ------------------------------------------------------------------
 */

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import {
  construirTimelineAPartirDeAlertas,
  //TIME_ZONE,
  formatarDataUTC
} from "../uteis/tempo";
import type { Alerta, Intervalo, Severidade } from "../tipos";

/** Propriedades esperadas pelo componente */
type Props = {
  /** Lista bruta de alertas (já normalizados no nível de página) */
  alerts: Alerta[];
  /** Severidades atualmente selecionadas (para “ligar/desligar” no gráfico) */
  severidadesSelecionadas: Severidade[];
  /** Callback disparado ao clicar numa severidade da legenda */
  aoAlternarSeveridade: (s: Severidade) => void;
  /** Período customizado (quando preenchido, o seletor 24h/7d/30d pode ser desabilitado) */
  range?: Intervalo;
  /** Título exibido no canto superior esquerdo */
  titulo?: string;
  /** Se true, desabilita os botões 24h/7d/30d quando `range` estiver ativo */
  desabilitarPeriodoQuandoRange?: boolean;
};

const LinhaDoTempoAlertas: React.FC<Props> = ({
  alerts,
  severidadesSelecionadas,
  aoAlternarSeveridade,
  range,
  titulo = "Linha do Tempo de Alertas",
  desabilitarPeriodoQuandoRange = true
}) => {
  /** Estado local do período relativo (apenas para o gráfico principal) */
  const [periodo, setPeriodo] = useState<"24h" | "7d" | "30d">("24h");

  /**
   * Monta os dados do gráfico:
   * - usa `construirTimelineAPartirDeAlertas` para agrupar por hora/dia
   * - aplica o filtro de severidades da legenda
   */
  const dados = useMemo(() => {
    const base = construirTimelineAPartirDeAlertas(alerts, periodo, range);
    if (!severidadesSelecionadas.length) return base;

    const want = new Set(severidadesSelecionadas);
    return base.map((b) => ({
      ...b,
      baixa: want.has("baixa") ? b.baixa : 0,
      media: want.has("média") ? b.media : 0,
      alta: want.has("alta") ? b.alta : 0,
      critica: want.has("crítica") ? b.critica : 0
    }));
  }, [alerts, periodo, range, severidadesSelecionadas]);

  /** `range` ativo indica modo “customizado” (intervalo de datas) */
  const rangeAtivo = !!(range?.start || range?.end);

  /** Helpers da UI (estilo e estado da legenda clicável) */
  const isSel = (s: Severidade) => severidadesSelecionadas.includes(s);
  const chip = (ativo: boolean): React.CSSProperties => ({
    cursor: "pointer",
    opacity: ativo ? 1 : 0.55,
    border: ativo
      ? "1px solid rgba(15,23,42,0.18)"
      : "1px solid rgba(15,23,42,0.08)"
  });

  return (
    <div className="card">
      {/* Cabeçalho do gráfico: título + seletor de período */}
      <div className="timeline-header">
        <div className="timeline-title-row">
          <h3 className="timeline-title">{titulo}</h3>

          {/* Seletor 24h/7d/30d (pode ser desabilitado se `range` estiver ativo) */}
          <div className="period-selector">
            <button
              className={`period-btn ${periodo === "24h" ? "active" : ""}`}
              onClick={() => setPeriodo("24h")}
              disabled={rangeAtivo && desabilitarPeriodoQuandoRange}
            >
              24h
            </button>
            <button
              className={`period-btn ${periodo === "7d" ? "active" : ""}`}
              onClick={() => setPeriodo("7d")}
              disabled={rangeAtivo && desabilitarPeriodoQuandoRange}
            >
              7d
            </button>
            <button
              className={`period-btn ${periodo === "30d" ? "active" : ""}`}
              onClick={() => setPeriodo("30d")}
              disabled={rangeAtivo && desabilitarPeriodoQuandoRange}
            >
              30d
            </button>
          </div>
        </div>

        {/* Subtítulo com contexto do período exibido */}
        <div className="timeline-subtitle">
          {rangeAtivo
            ? `Período filtrado${
                range?.start ? ` de ${formatarDataUTC(range.start!)}` : ""
              }${range?.end ? ` até ${formatarDataUTC(range.end!)}` : ""} (UTC)`
            : periodo === "24h"
            ? "últimas 24 horas (UTC)"
            : periodo === "7d"
            ? "últimos 7 dias (UTC)"
            : "últimos 30 dias (UTC)"}
        </div>
      </div>

      {/* Área do gráfico (Recharts) */}
      <div className="timeline-chart">
        <ResponsiveContainer width="100%" height="100%">
          {/* Gráfico de barras empilhadas: uma barra por bucket (hora/dia) com 4 severidades */}
          <BarChart data={dados} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.04)" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              tickMargin={12}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 400 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickMargin={8}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(15,23,42,0.08)",
                borderRadius: 12
              }}
            />

            {/* Cada Bar representa uma severidade; `stackId="a"` faz a pilha */}
            <Bar dataKey="baixa"   stackId="a" fill="#1dc0ab" stroke="#1dc0ab" />
            <Bar dataKey="media"   stackId="a" fill="#facc15" stroke="#facc15" />
            <Bar dataKey="alta"    stackId="a" fill="#f97316" stroke="#f97316" />
            <Bar dataKey="critica" stackId="a" fill="#ef4444" stroke="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda clicável (filtro visual por severidade) */}
      <div className="timeline-legend">
        <div
          className="legend-item"
          style={chip(isSel("baixa"))}
          onClick={() => aoAlternarSeveridade("baixa")}
        >
          <div className="legend-dot low" />
          <span>Baixa</span>
        </div>

        <div
          className="legend-item"
          style={chip(isSel("média"))}
          onClick={() => aoAlternarSeveridade("média")}
        >
          <div className="legend-dot medium" />
          <span>Média</span>
        </div>

        <div
          className="legend-item"
          style={chip(isSel("alta"))}
          onClick={() => aoAlternarSeveridade("alta")}
        >
          <div className="legend-dot high" />
          <span>Alta</span>
        </div>

        <div
          className="legend-item"
          style={chip(isSel("crítica"))}
          onClick={() => aoAlternarSeveridade("crítica")}
        >
          <div className="legend-dot critical" />
          <span>Crítica</span>
        </div>
      </div>
    </div>
  );
};

export default LinhaDoTempoAlertas;
